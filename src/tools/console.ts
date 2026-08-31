import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "./context.js";
import { panelField, resolvePanel } from "./shared/panelParam.js";
import { jsonResult, withToolErrorHandling } from "./shared/format.js";
import { runConsoleCommand } from "../websocket/console.js";

const serverIdField = z.string().describe("Server identifier (short or full UUID)");
const captureSecondsField = z
  .number()
  .min(1)
  .max(15)
  .default(3)
  .describe("How many seconds to buffer console output for after sending the command (1-15).");

export function registerConsoleTools(server: McpServer, ctx: ToolContext): void {
  server.tool(
    "send_console_command",
    "Send a command to a server's console over its live websocket and capture the output that follows for a short window.",
    {
      panel: panelField,
      serverId: serverIdField,
      command: z.string().min(1),
      captureSeconds: captureSecondsField,
    },
    withToolErrorHandling(async ({ panel, serverId, command, captureSeconds }) => {
      const client = resolvePanel(ctx.config, panel);
      const result = await runConsoleCommand(client, serverId, command, captureSeconds);
      return jsonResult({ command, ...result });
    })
  );

  server.tool(
    "read_console",
    "Passively watch a server's console for a short window without sending any command.",
    { panel: panelField, serverId: serverIdField, captureSeconds: captureSecondsField },
    withToolErrorHandling(async ({ panel, serverId, captureSeconds }) => {
      const client = resolvePanel(ctx.config, panel);
      const result = await runConsoleCommand(client, serverId, undefined, captureSeconds);
      return jsonResult(result);
    })
  );
}
