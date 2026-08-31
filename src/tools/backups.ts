import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "./context.js";
import { panelField, resolvePanel } from "./shared/panelParam.js";
import { confirmField, assertConfirmed } from "./shared/confirm.js";
import { jsonResult, textResult, withToolErrorHandling } from "./shared/format.js";

const serverIdField = z.string().describe("Server identifier (short or full UUID)");
const backupIdField = z.string().describe("Backup UUID");

export function registerBackupTools(server: McpServer, ctx: ToolContext): void {
  server.tool(
    "list_backups",
    "List backups for a server.",
    { panel: panelField, serverId: serverIdField },
    withToolErrorHandling(async ({ panel, serverId }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/backups`, { surface: "client" });
      return jsonResult(data);
    })
  );

  server.tool(
    "get_backup",
    "Get details for a specific backup.",
    { panel: panelField, serverId: serverIdField, backupId: backupIdField },
    withToolErrorHandling(async ({ panel, serverId, backupId }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/backups/${backupId}`, { surface: "client" });
      return jsonResult(data);
    })
  );

  server.tool(
    "create_backup",
    "Create a new backup of a server.",
    {
      panel: panelField,
      serverId: serverIdField,
      name: z.string().optional(),
      ignoredFiles: z.array(z.string()).optional(),
    },
    withToolErrorHandling(async ({ panel, serverId, name, ignoredFiles }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/backups`, {
        surface: "client",
        method: "POST",
        body: { name, ignored: ignoredFiles?.join("\n") },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "download_backup_url",
    "Get a signed download URL for a backup.",
    { panel: panelField, serverId: serverIdField, backupId: backupIdField },
    withToolErrorHandling(async ({ panel, serverId, backupId }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/backups/${backupId}/download`, { surface: "client" });
      return jsonResult(data);
    })
  );

  server.tool(
    "restore_backup",
    "Restore a server from a backup. This overwrites current server files. Requires confirm:true.",
    { panel: panelField, serverId: serverIdField, backupId: backupIdField, confirm: confirmField },
    withToolErrorHandling(async ({ panel, serverId, backupId, confirm }) => {
      assertConfirmed(confirm, `This will overwrite files on server ${serverId} by restoring backup ${backupId}.`);
      const client = resolvePanel(ctx.config, panel);
      await client.request(`/servers/${serverId}/backups/${backupId}/restore`, {
        surface: "client",
        method: "POST",
      });
      return textResult(`Restore of backup ${backupId} triggered on server ${serverId}.`);
    })
  );

  server.tool(
    "delete_backup",
    "Permanently delete a backup. Requires confirm:true.",
    { panel: panelField, serverId: serverIdField, backupId: backupIdField, confirm: confirmField },
    withToolErrorHandling(async ({ panel, serverId, backupId, confirm }) => {
      assertConfirmed(confirm, `This will permanently delete backup ${backupId} on server ${serverId}.`);
      const client = resolvePanel(ctx.config, panel);
      await client.request(`/servers/${serverId}/backups/${backupId}`, {
        surface: "client",
        method: "DELETE",
      });
      return textResult(`Deleted backup ${backupId}.`);
    })
  );
}
