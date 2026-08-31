import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "./context.js";
import { panelField, resolvePanel } from "./shared/panelParam.js";
import { confirmField, assertConfirmed } from "./shared/confirm.js";
import { jsonResult, textResult, withToolErrorHandling } from "./shared/format.js";

const serverIdField = z.string().describe("Server identifier (short or full UUID) as shown in the panel");

export function registerServerTools(server: McpServer, ctx: ToolContext): void {
  server.tool(
    "list_servers",
    "List servers visible to the configured Client API key on a panel.",
    { panel: panelField, page: z.number().int().positive().optional() },
    withToolErrorHandling(async ({ panel, page }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(``, { surface: "client", query: { page } });
      return jsonResult(data);
    })
  );

  server.tool(
    "get_server",
    "Get details for a specific server.",
    { panel: panelField, serverId: serverIdField },
    withToolErrorHandling(async ({ panel, serverId }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}`, { surface: "client" });
      return jsonResult(data);
    })
  );

  server.tool(
    "get_server_resources",
    "Get live resource utilization (CPU, memory, disk, uptime, state) for a server.",
    { panel: panelField, serverId: serverIdField },
    withToolErrorHandling(async ({ panel, serverId }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/resources`, { surface: "client" });
      return jsonResult(data);
    })
  );

  server.tool(
    "send_power_action",
    "Send a power action to a server: start, stop, restart, or kill. 'kill' requires confirm:true.",
    {
      panel: panelField,
      serverId: serverIdField,
      signal: z.enum(["start", "stop", "restart", "kill"]),
      confirm: confirmField,
    },
    withToolErrorHandling(async ({ panel, serverId, signal, confirm }) => {
      if (signal === "kill") {
        assertConfirmed(confirm, `This will forcibly kill server ${serverId}, which can corrupt in-memory state.`);
      }
      const client = resolvePanel(ctx.config, panel);
      await client.request(`/servers/${serverId}/power`, {
        surface: "client",
        method: "POST",
        body: { signal },
      });
      return textResult(`Sent power action "${signal}" to server ${serverId}.`);
    })
  );

  server.tool(
    "get_server_startup",
    "Get the startup command and startup variables for a server.",
    { panel: panelField, serverId: serverIdField },
    withToolErrorHandling(async ({ panel, serverId }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/startup`, { surface: "client" });
      return jsonResult(data);
    })
  );

  server.tool(
    "update_startup_variable",
    "Update a single startup/environment variable for a server.",
    { panel: panelField, serverId: serverIdField, key: z.string(), value: z.string() },
    withToolErrorHandling(async ({ panel, serverId, key, value }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/startup/variable`, {
        surface: "client",
        method: "PUT",
        body: { key, value },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "reinstall_server",
    "Reinstall a server from its egg install script. Destructive — may wipe server-specific state. Requires confirm:true.",
    { panel: panelField, serverId: serverIdField, confirm: confirmField },
    withToolErrorHandling(async ({ panel, serverId, confirm }) => {
      assertConfirmed(confirm, `This will reinstall server ${serverId}, re-running its egg install script.`);
      const client = resolvePanel(ctx.config, panel);
      await client.request(`/servers/${serverId}/settings/reinstall`, { surface: "client", method: "POST" });
      return textResult(`Reinstall triggered for server ${serverId}.`);
    })
  );

  server.tool(
    "rename_server",
    "Rename a server.",
    { panel: panelField, serverId: serverIdField, name: z.string().min(1) },
    withToolErrorHandling(async ({ panel, serverId, name }) => {
      const client = resolvePanel(ctx.config, panel);
      await client.request(`/servers/${serverId}/settings/rename`, {
        surface: "client",
        method: "POST",
        body: { name },
      });
      return textResult(`Renamed server ${serverId} to "${name}".`);
    })
  );

  server.tool(
    "set_docker_image",
    "Change the Docker image used to run a server.",
    { panel: panelField, serverId: serverIdField, dockerImage: z.string().min(1) },
    withToolErrorHandling(async ({ panel, serverId, dockerImage }) => {
      const client = resolvePanel(ctx.config, panel);
      await client.request(`/servers/${serverId}/settings/docker-image`, {
        surface: "client",
        method: "POST",
        body: { docker_image: dockerImage },
      });
      return textResult(`Updated docker image for server ${serverId} to "${dockerImage}".`);
    })
  );
}
