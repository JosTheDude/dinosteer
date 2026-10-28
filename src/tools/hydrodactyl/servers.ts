import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "../context.js";
import { panelField, resolveHydrodactylPanel } from "../shared/panelParam.js";
import { confirmField, assertConfirmed } from "../shared/confirm.js";
import { jsonResult, textResult, withToolErrorHandling } from "../shared/format.js";

const serverIdField = z.string().describe("Server identifier (short or full UUID)");
const eggChangeFields = { eggId: z.number().int(), nestId: z.number().int() };

export function registerHydrodactylServerTools(server: McpServer, ctx: ToolContext): void {
  server.tool(
    "get_resource_history",
    "[Hydrodactyl] Get recent resource usage samples (CPU, memory, disk, network) recorded by the panel for a server.",
    { panel: panelField, serverId: serverIdField },
    withToolErrorHandling(async ({ panel, serverId }) => {
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/resources/history`, { surface: "client" });
      return jsonResult(data);
    })
  );

  server.tool(
    "get_subdomain",
    "[Hydrodactyl] Get a server's current subdomain and the domains available for it.",
    { panel: panelField, serverId: serverIdField },
    withToolErrorHandling(async ({ panel, serverId }) => {
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/subdomain`, { surface: "client" });
      return jsonResult(data);
    })
  );

  server.tool(
    "check_subdomain_availability",
    "[Hydrodactyl] Check whether a subdomain is free on a domain.",
    {
      panel: panelField,
      serverId: serverIdField,
      subdomain: z.string().regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/).max(63),
      domainId: z.number().int(),
    },
    withToolErrorHandling(async ({ panel, serverId, subdomain, domainId }) => {
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/subdomain/check-availability`, {
        surface: "client",
        method: "POST",
        body: { subdomain, domain_id: domainId },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "set_subdomain",
    "[Hydrodactyl] Create or replace a server's subdomain (DNS record pointing at its primary allocation).",
    {
      panel: panelField,
      serverId: serverIdField,
      subdomain: z.string().regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/).max(63),
      domainId: z.number().int(),
    },
    withToolErrorHandling(async ({ panel, serverId, subdomain, domainId }) => {
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/subdomain`, {
        surface: "client",
        method: "POST",
        body: { subdomain, domain_id: domainId },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "delete_subdomain",
    "[Hydrodactyl] Remove a server's subdomain and its DNS records. Requires confirm:true.",
    { panel: panelField, serverId: serverIdField, confirm: confirmField },
    withToolErrorHandling(async ({ panel, serverId, confirm }) => {
      assertConfirmed(confirm, `This will delete the subdomain of server ${serverId}.`);
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/subdomain`, { surface: "client", method: "DELETE" });
      return jsonResult(data);
    })
  );

  server.tool(
    "set_server_webhook",
    "[Hydrodactyl] Set (or clear, by omitting both fields) the webhook that receives a server's event notifications.",
    {
      panel: panelField,
      serverId: serverIdField,
      webhookType: z.string().optional().describe("e.g. discord, slack, mattermost (see get_server meta.allowed_webhook_types)"),
      webhookUrl: z.string().url().optional(),
    },
    withToolErrorHandling(async ({ panel, serverId, webhookType, webhookUrl }) => {
      const client = resolveHydrodactylPanel(ctx.config, panel);
      await client.request(`/servers/${serverId}/webhook`, {
        surface: "client",
        method: "POST",
        body: { webhook_type: webhookType ?? null, webhook_url: webhookUrl ?? null },
      });
      return textResult(webhookUrl ? `Set ${webhookType} webhook for server ${serverId}.` : `Cleared webhook for server ${serverId}.`);
    })
  );

  server.tool(
    "update_startup_command",
    "[Hydrodactyl] Replace a server's startup command.",
    { panel: panelField, serverId: serverIdField, startup: z.string().min(1).max(10000) },
    withToolErrorHandling(async ({ panel, serverId, startup }) => {
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/startup/command`, {
        surface: "client",
        method: "PUT",
        body: { startup },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "get_default_startup_command",
    "[Hydrodactyl] Get the egg's default startup command for a server.",
    { panel: panelField, serverId: serverIdField },
    withToolErrorHandling(async ({ panel, serverId }) => {
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/startup/command/default`, { surface: "client" });
      return jsonResult(data);
    })
  );

  server.tool(
    "process_startup_command",
    "[Hydrodactyl] Preview a startup command with the server's variables substituted (defaults to the current command).",
    { panel: panelField, serverId: serverIdField, command: z.string().optional() },
    withToolErrorHandling(async ({ panel, serverId, command }) => {
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/startup/command/process`, {
        surface: "client",
        method: "POST",
        body: { command },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "revert_docker_image",
    "[Hydrodactyl, Elytra only] Revert a server to its egg's default docker image.",
    { panel: panelField, serverId: serverIdField },
    withToolErrorHandling(async ({ panel, serverId }) => {
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/settings/docker-image/revert`, {
        surface: "client",
        method: "POST",
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "set_server_egg",
    "[Hydrodactyl] Switch a server's egg without reinstalling or touching files. Use preview_egg_change/apply_egg_change for a full migration.",
    { panel: panelField, serverId: serverIdField, ...eggChangeFields },
    withToolErrorHandling(async ({ panel, serverId, eggId, nestId }) => {
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/settings/egg`, {
        surface: "client",
        method: "PUT",
        body: { egg_id: eggId, nest_id: nestId },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "preview_egg_change",
    "[Hydrodactyl] Preview what changing a server's egg would do (docker images, startup, variables).",
    { panel: panelField, serverId: serverIdField, ...eggChangeFields },
    withToolErrorHandling(async ({ panel, serverId, eggId, nestId }) => {
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/settings/egg/preview`, {
        surface: "client",
        method: "POST",
        body: { egg_id: eggId, nest_id: nestId },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "apply_egg_change",
    "[Hydrodactyl] Change a server's egg and reinstall it, optionally backing up and/or wiping files first. Requires confirm:true.",
    {
      panel: panelField,
      serverId: serverIdField,
      ...eggChangeFields,
      dockerImage: z.string().optional(),
      startupCommand: z.string().max(2048).optional(),
      environment: z.record(z.string(), z.string().nullable()).optional(),
      shouldBackup: z.boolean().default(true),
      shouldWipe: z.boolean().default(false).describe("Delete all server files before reinstalling"),
      confirm: confirmField,
    },
    withToolErrorHandling(
      async ({ panel, serverId, eggId, nestId, dockerImage, startupCommand, environment, shouldBackup, shouldWipe, confirm }) => {
        assertConfirmed(
          confirm,
          `This will change server ${serverId} to egg ${eggId} and reinstall it${shouldWipe ? ", wiping all files" : ""}.`
        );
        const client = resolveHydrodactylPanel(ctx.config, panel);
        const data = await client.request(`/servers/${serverId}/settings/egg/apply`, {
          surface: "client",
          method: "POST",
          body: {
            egg_id: eggId,
            nest_id: nestId,
            docker_image: dockerImage,
            startup_command: startupCommand,
            environment,
            should_backup: shouldBackup,
            should_wipe: shouldWipe,
          },
        });
        return jsonResult(data);
      }
    )
  );

  server.tool(
    "list_server_operations",
    "[Hydrodactyl, Elytra only] List long-running operations (e.g. egg changes) for a server.",
    { panel: panelField, serverId: serverIdField },
    withToolErrorHandling(async ({ panel, serverId }) => {
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/operations`, { surface: "client" });
      return jsonResult(data);
    })
  );

  server.tool(
    "get_server_operation",
    "[Hydrodactyl, Elytra only] Get the status of a long-running operation.",
    { panel: panelField, serverId: serverIdField, operationId: z.string() },
    withToolErrorHandling(async ({ panel, serverId, operationId }) => {
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/operations/${operationId}`, { surface: "client" });
      return jsonResult(data);
    })
  );

  server.tool(
    "list_jobs",
    "[Hydrodactyl, Elytra only] List daemon jobs (backup create/delete/restore, etc.) for a server.",
    { panel: panelField, serverId: serverIdField, type: z.string().optional(), status: z.string().optional() },
    withToolErrorHandling(async ({ panel, serverId, type, status }) => {
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/jobs`, { surface: "client", query: { type, status } });
      return jsonResult(data);
    })
  );

  server.tool(
    "get_job",
    "[Hydrodactyl, Elytra only] Get the status and progress of a daemon job.",
    { panel: panelField, serverId: serverIdField, jobId: z.string() },
    withToolErrorHandling(async ({ panel, serverId, jobId }) => {
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/jobs/${jobId}`, { surface: "client" });
      return jsonResult(data);
    })
  );

  server.tool(
    "create_job",
    "[Hydrodactyl, Elytra only] Submit a raw daemon job (e.g. job_type backup_create). Prefer the dedicated backup tools. Requires confirm:true.",
    {
      panel: panelField,
      serverId: serverIdField,
      jobType: z.string(),
      jobData: z.record(z.string(), z.unknown()).default({}),
      confirm: confirmField,
    },
    withToolErrorHandling(async ({ panel, serverId, jobType, jobData, confirm }) => {
      assertConfirmed(confirm, `This will submit a raw "${jobType}" job to server ${serverId}'s daemon.`);
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/jobs`, {
        surface: "client",
        method: "POST",
        body: { job_type: jobType, job_data: jobData },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "cancel_job",
    "[Hydrodactyl, Elytra only] Cancel a pending or running daemon job.",
    { panel: panelField, serverId: serverIdField, jobId: z.string() },
    withToolErrorHandling(async ({ panel, serverId, jobId }) => {
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/jobs/${jobId}`, { surface: "client", method: "DELETE" });
      return jsonResult(data);
    })
  );

  server.tool(
    "rename_backup",
    "[Hydrodactyl, Elytra/Calagopus only] Rename a backup.",
    { panel: panelField, serverId: serverIdField, backupId: z.string(), name: z.string().min(1).max(191) },
    withToolErrorHandling(async ({ panel, serverId, backupId, name }) => {
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/backups/${backupId}/rename`, {
        surface: "client",
        method: "POST",
        body: { name },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "bulk_delete_backups",
    "[Hydrodactyl, Elytra/Calagopus only] Permanently delete several backups at once. Requires confirm:true.",
    { panel: panelField, serverId: serverIdField, backupIds: z.array(z.string()).min(1), confirm: confirmField },
    withToolErrorHandling(async ({ panel, serverId, backupIds, confirm }) => {
      assertConfirmed(confirm, `This will permanently delete ${backupIds.length} backup(s) on server ${serverId}.`);
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/backups/bulk-delete`, {
        surface: "client",
        method: "POST",
        body: { backup_uuids: backupIds },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "delete_all_backups",
    "[Hydrodactyl] Permanently delete every backup of a server. Requires confirm:true.",
    { panel: panelField, serverId: serverIdField, confirm: confirmField },
    withToolErrorHandling(async ({ panel, serverId, confirm }) => {
      assertConfirmed(confirm, `This will permanently delete ALL backups on server ${serverId}.`);
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/backups/delete-all`, {
        surface: "client",
        method: "DELETE",
      });
      return data === undefined ? textResult(`Deleted all backups on server ${serverId}.`) : jsonResult(data);
    })
  );
}
