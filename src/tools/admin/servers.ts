import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "../context.js";
import { panelField, resolvePanel } from "../shared/panelParam.js";
import { confirmField, assertConfirmed } from "../shared/confirm.js";
import { jsonResult, textResult, withToolErrorHandling } from "../shared/format.js";

const serverIdField = z.number().int().describe("Application-API server ID");

export function registerAdminServerTools(server: McpServer, ctx: ToolContext): void {
  server.tool(
    "admin_list_servers",
    "[Admin] List all servers on a panel.",
    { panel: panelField, page: z.number().int().positive().optional() },
    withToolErrorHandling(async ({ panel, page }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/servers`, { surface: "application", query: { page } });
      return jsonResult(data);
    })
  );

  server.tool(
    "admin_get_server",
    "[Admin] Get full details for any server on the panel.",
    { panel: panelField, serverId: serverIdField },
    withToolErrorHandling(async ({ panel, serverId }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}`, { surface: "application" });
      return jsonResult(data);
    })
  );

  server.tool(
    "admin_create_server",
    "[Admin] Create a new server on a node.",
    {
      panel: panelField,
      name: z.string(),
      userId: z.number().int(),
      eggId: z.number().int(),
      dockerImage: z.string(),
      startup: z.string(),
      environment: z.record(z.string(), z.string()),
      memory: z.number().int(),
      swap: z.number().int().default(0),
      disk: z.number().int(),
      io: z.number().int().default(500),
      cpu: z.number().int().default(0),
      allocationId: z.number().int(),
    },
    withToolErrorHandling(async (args) => {
      const client = resolvePanel(ctx.config, args.panel);
      const data = await client.request(`/servers`, {
        surface: "application",
        method: "POST",
        body: {
          name: args.name,
          user: args.userId,
          egg: args.eggId,
          docker_image: args.dockerImage,
          startup: args.startup,
          environment: args.environment,
          limits: { memory: args.memory, swap: args.swap, disk: args.disk, io: args.io, cpu: args.cpu },
          allocation: { default: args.allocationId },
        },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "admin_update_server_build",
    "[Admin] Update a server's resource limits and/or allocations.",
    {
      panel: panelField,
      serverId: serverIdField,
      memory: z.number().int().optional(),
      swap: z.number().int().optional(),
      disk: z.number().int().optional(),
      io: z.number().int().optional(),
      cpu: z.number().int().optional(),
      allocationIds: z.array(z.number().int()).optional(),
    },
    withToolErrorHandling(async ({ panel, serverId, memory, swap, disk, io, cpu, allocationIds }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/build`, {
        surface: "application",
        method: "PATCH",
        body: { limits: { memory, swap, disk, io, cpu }, allocation_additional: allocationIds },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "admin_update_server_details",
    "[Admin] Update a server's name, owner, or description.",
    {
      panel: panelField,
      serverId: serverIdField,
      name: z.string().optional(),
      ownerId: z.number().int().optional(),
      description: z.string().optional(),
    },
    withToolErrorHandling(async ({ panel, serverId, name, ownerId, description }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/details`, {
        surface: "application",
        method: "PATCH",
        body: { name, user: ownerId, description },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "admin_suspend_server",
    "[Admin] Suspend a server, blocking start/console access.",
    { panel: panelField, serverId: serverIdField },
    withToolErrorHandling(async ({ panel, serverId }) => {
      const client = resolvePanel(ctx.config, panel);
      await client.request(`/servers/${serverId}/suspend`, { surface: "application", method: "POST" });
      return textResult(`Suspended server ${serverId}.`);
    })
  );

  server.tool(
    "admin_unsuspend_server",
    "[Admin] Unsuspend a previously suspended server.",
    { panel: panelField, serverId: serverIdField },
    withToolErrorHandling(async ({ panel, serverId }) => {
      const client = resolvePanel(ctx.config, panel);
      await client.request(`/servers/${serverId}/unsuspend`, { surface: "application", method: "POST" });
      return textResult(`Unsuspended server ${serverId}.`);
    })
  );

  server.tool(
    "admin_delete_server",
    "[Admin] Permanently delete a server from the panel. Requires confirm:true.",
    {
      panel: panelField,
      serverId: serverIdField,
      withoutDeletingFiles: z.boolean().default(false),
      confirm: confirmField,
    },
    withToolErrorHandling(async ({ panel, serverId, withoutDeletingFiles, confirm }) => {
      assertConfirmed(confirm, `This will permanently delete server ${serverId} from the panel.`);
      const client = resolvePanel(ctx.config, panel);
      await client.request(`/servers/${serverId}${withoutDeletingFiles ? "/force" : ""}`, {
        surface: "application",
        method: "DELETE",
      });
      return textResult(`Deleted server ${serverId}.`);
    })
  );

  server.tool(
    "admin_get_server_by_external_id",
    "[Admin] Get a server by its external ID.",
    { panel: panelField, externalId: z.string() },
    withToolErrorHandling(async ({ panel, externalId }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/servers/external/${externalId}`, { surface: "application" });
      return jsonResult(data);
    })
  );

  server.tool(
    "admin_update_server_startup",
    "[Admin] Update a server's startup command, environment, egg and docker image.",
    {
      panel: panelField,
      serverId: serverIdField,
      startup: z.string(),
      environment: z.record(z.string()).default({}),
      eggId: z.number().int(),
      image: z.string(),
      skipScripts: z.boolean().default(false),
    },
    withToolErrorHandling(async ({ panel, serverId, startup, environment, eggId, image, skipScripts }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/startup`, {
        surface: "application",
        method: "PATCH",
        body: { startup, environment, egg: eggId, image, skip_scripts: skipScripts },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "admin_reinstall_server",
    "[Admin] Reinstall a server from its egg install script. Requires confirm:true.",
    { panel: panelField, serverId: serverIdField, confirm: confirmField },
    withToolErrorHandling(async ({ panel, serverId, confirm }) => {
      assertConfirmed(confirm, `This will reinstall server ${serverId}, re-running its egg install script.`);
      const client = resolvePanel(ctx.config, panel);
      await client.request(`/servers/${serverId}/reinstall`, { surface: "application", method: "POST" });
      return textResult(`Reinstall triggered for server ${serverId}.`);
    })
  );

  server.tool(
    "admin_list_server_databases",
    "[Admin] List databases belonging to a server.",
    { panel: panelField, serverId: serverIdField },
    withToolErrorHandling(async ({ panel, serverId }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/databases`, { surface: "application" });
      return jsonResult(data);
    })
  );

  server.tool(
    "admin_create_server_database",
    "[Admin] Create a database for a server on a database host.",
    {
      panel: panelField,
      serverId: serverIdField,
      database: z.string(),
      remote: z.string().default("%").describe("Allowed connection source, e.g. % or an IP"),
      hostId: z.number().int(),
    },
    withToolErrorHandling(async ({ panel, serverId, database, remote, hostId }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/databases`, {
        surface: "application",
        method: "POST",
        body: { database, remote, host: hostId },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "admin_reset_server_database_password",
    "[Admin] Reset the password of a server's database. Requires confirm:true.",
    { panel: panelField, serverId: serverIdField, databaseId: z.number().int(), confirm: confirmField },
    withToolErrorHandling(async ({ panel, serverId, databaseId, confirm }) => {
      assertConfirmed(confirm, `This will reset the password of database ${databaseId}, breaking existing connections.`);
      const client = resolvePanel(ctx.config, panel);
      await client.request(`/servers/${serverId}/databases/${databaseId}/reset-password`, {
        surface: "application",
        method: "POST",
      });
      return textResult(`Reset password of database ${databaseId}.`);
    })
  );

  server.tool(
    "admin_delete_server_database",
    "[Admin] Permanently delete a server's database. Requires confirm:true.",
    { panel: panelField, serverId: serverIdField, databaseId: z.number().int(), confirm: confirmField },
    withToolErrorHandling(async ({ panel, serverId, databaseId, confirm }) => {
      assertConfirmed(confirm, `This will permanently delete database ${databaseId} and all its data.`);
      const client = resolvePanel(ctx.config, panel);
      await client.request(`/servers/${serverId}/databases/${databaseId}`, {
        surface: "application",
        method: "DELETE",
      });
      return textResult(`Deleted database ${databaseId}.`);
    })
  );
}
