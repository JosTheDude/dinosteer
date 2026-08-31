import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "./context.js";
import { panelField, resolvePanel } from "./shared/panelParam.js";
import { confirmField, assertConfirmed } from "./shared/confirm.js";
import { jsonResult, textResult, withToolErrorHandling } from "./shared/format.js";

const serverIdField = z.string().describe("Server identifier (short or full UUID)");
const subuserIdField = z.string().describe("Subuser UUID");

export function registerSubuserTools(server: McpServer, ctx: ToolContext): void {
  server.tool(
    "list_subusers",
    "List subusers (collaborators) with access to a server.",
    { panel: panelField, serverId: serverIdField },
    withToolErrorHandling(async ({ panel, serverId }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/users`, { surface: "client" });
      return jsonResult(data);
    })
  );

  server.tool(
    "invite_subuser",
    "Invite a subuser to a server with a given set of permissions.",
    { panel: panelField, serverId: serverIdField, email: z.string().email(), permissions: z.array(z.string()) },
    withToolErrorHandling(async ({ panel, serverId, email, permissions }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/users`, {
        surface: "client",
        method: "POST",
        body: { email, permissions },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "update_subuser",
    "Update a subuser's permission set on a server.",
    { panel: panelField, serverId: serverIdField, subuserId: subuserIdField, permissions: z.array(z.string()) },
    withToolErrorHandling(async ({ panel, serverId, subuserId, permissions }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/users/${subuserId}`, {
        surface: "client",
        method: "POST",
        body: { permissions },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "remove_subuser",
    "Remove a subuser's access to a server. Requires confirm:true.",
    { panel: panelField, serverId: serverIdField, subuserId: subuserIdField, confirm: confirmField },
    withToolErrorHandling(async ({ panel, serverId, subuserId, confirm }) => {
      assertConfirmed(confirm, `This will remove subuser ${subuserId}'s access to server ${serverId}.`);
      const client = resolvePanel(ctx.config, panel);
      await client.request(`/servers/${serverId}/users/${subuserId}`, {
        surface: "client",
        method: "DELETE",
      });
      return textResult(`Removed subuser ${subuserId}.`);
    })
  );
}
