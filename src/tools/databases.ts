import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "./context.js";
import { panelField, resolvePanel } from "./shared/panelParam.js";
import { confirmField, assertConfirmed } from "./shared/confirm.js";
import { jsonResult, textResult, withToolErrorHandling } from "./shared/format.js";

const serverIdField = z.string().describe("Server identifier (short or full UUID)");
const databaseIdField = z.string().describe("Database identifier");

export function registerDatabaseTools(server: McpServer, ctx: ToolContext): void {
  server.tool(
    "list_databases",
    "List databases provisioned for a server. Note: returned credentials are secrets belonging to the game server, not the panel — handle with care but they are expected to be returned to the caller.",
    { panel: panelField, serverId: serverIdField },
    withToolErrorHandling(async ({ panel, serverId }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/databases`, {
        surface: "client",
        query: { include: "password" },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "create_database",
    "Create a new database for a server.",
    { panel: panelField, serverId: serverIdField, database: z.string(), remote: z.string().default("%") },
    withToolErrorHandling(async ({ panel, serverId, database, remote }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/databases`, {
        surface: "client",
        method: "POST",
        body: { database, remote },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "rotate_database_password",
    "Rotate the password for a server's database.",
    { panel: panelField, serverId: serverIdField, databaseId: databaseIdField },
    withToolErrorHandling(async ({ panel, serverId, databaseId }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/databases/${databaseId}/rotate-password`, {
        surface: "client",
        method: "POST",
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "delete_database",
    "Permanently delete a server's database. Requires confirm:true.",
    { panel: panelField, serverId: serverIdField, databaseId: databaseIdField, confirm: confirmField },
    withToolErrorHandling(async ({ panel, serverId, databaseId, confirm }) => {
      assertConfirmed(confirm, `This will permanently delete database ${databaseId} on server ${serverId}.`);
      const client = resolvePanel(ctx.config, panel);
      await client.request(`/servers/${serverId}/databases/${databaseId}`, {
        surface: "client",
        method: "DELETE",
      });
      return textResult(`Deleted database ${databaseId}.`);
    })
  );
}
