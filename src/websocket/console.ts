import WebSocket from "ws";
import type { PanelClient } from "../client/panelClient.js";
import { logger } from "../logging.js";

const MAX_BUFFERED_LINES = 500;
const CONNECT_TIMEOUT_MS = 5000;

interface WebsocketCredentials {
  data: { token: string; socket: string };
}

interface ConsoleResult {
  lines: string[];
  truncated: boolean;
  disconnectedUncleanly: boolean;
}

export async function runConsoleCommand(
  client: PanelClient,
  serverId: string,
  command: string | undefined,
  captureSeconds: number
): Promise<ConsoleResult> {
  const creds = await client.request<WebsocketCredentials>(`/servers/${serverId}/websocket`, {
    surface: "client",
  });

  const { token, socket: socketUrl } = creds.data;
  const lines: string[] = [];
  let truncated = false;
  let disconnectedUncleanly = false;
  let authenticated = false;

  const ws = new WebSocket(socketUrl);

  await new Promise<void>((resolve, reject) => {
    const connectTimer = setTimeout(() => {
      ws.terminate();
      reject(new Error(`Timed out connecting to console websocket for server ${serverId}.`));
    }, CONNECT_TIMEOUT_MS);

    ws.on("open", () => {
      ws.send(JSON.stringify({ event: "auth", args: [token] }));
    });

    ws.on("message", (raw) => {
      let parsed: { event?: string; args?: string[] };
      try {
        parsed = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (parsed.event === "auth success") {
        authenticated = true;
        clearTimeout(connectTimer);
        resolve();
        return;
      }

      if (parsed.event === "token expired" || parsed.event === "jwt error") {
        clearTimeout(connectTimer);
        reject(new Error(`Console websocket authentication failed for server ${serverId}: ${parsed.event}`));
        return;
      }

      if (parsed.event === "console output" && parsed.args) {
        for (const line of parsed.args) {
          if (lines.length >= MAX_BUFFERED_LINES) {
            truncated = true;
            lines.shift();
          }
          lines.push(line);
        }
      }
    });

    ws.on("error", (err) => {
      clearTimeout(connectTimer);
      if (!authenticated) reject(err);
      else logger.warn("Console websocket error after auth", { serverId, error: err.message });
    });

    ws.on("close", () => {
      clearTimeout(connectTimer);
      if (!authenticated) reject(new Error(`Console websocket closed before authentication for server ${serverId}.`));
    });
  });

  if (command !== undefined) {
    ws.send(JSON.stringify({ event: "send command", args: [command] }));
  }

  await new Promise((resolve) => setTimeout(resolve, captureSeconds * 1000));

  await new Promise<void>((resolve) => {
    ws.once("close", () => resolve());
    ws.on("error", () => {
      disconnectedUncleanly = true;
    });
    ws.close();
    // In case close doesn't fire promptly, don't hang the tool call forever.
    setTimeout(() => {
      if (ws.readyState !== WebSocket.CLOSED) {
        disconnectedUncleanly = true;
        ws.terminate();
      }
      resolve();
    }, 2000);
  });

  return { lines, truncated, disconnectedUncleanly };
}
