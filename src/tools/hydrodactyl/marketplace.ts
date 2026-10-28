import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "../context.js";
import { panelField, resolveHydrodactylPanel } from "../shared/panelParam.js";
import { jsonResult, textResult, withToolErrorHandling } from "../shared/format.js";

const serverIdField = z.string().describe("Server identifier (short or full UUID)");
const typeField = z.enum(["mod", "plugin"]);
const sourceField = z.string().describe("Marketplace source key, e.g. modrinth (marketplace_search lists the available sources)");
const projectIdField = z.string().max(120);

export function registerHydrodactylMarketplaceTools(server: McpServer, ctx: ToolContext): void {
  server.tool(
    "marketplace_search",
    "[Hydrodactyl] Search the built-in Minecraft mod/plugin marketplace. Omit source to search all sources.",
    {
      panel: panelField,
      serverId: serverIdField,
      type: typeField,
      source: sourceField.optional(),
      query: z.string().max(120).optional(),
      loader: z.string().max(40).optional().describe("e.g. fabric, forge, paper"),
      gameVersion: z.string().max(20).optional(),
      limit: z.number().int().min(1).max(50).optional(),
      offset: z.number().int().min(0).optional(),
    },
    withToolErrorHandling(async ({ panel, serverId, type, source, query, loader, gameVersion, limit, offset }) => {
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/marketplace/search`, {
        surface: "client",
        query: { type, source, query, loader, game_version: gameVersion, limit, offset },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "marketplace_get_project",
    "[Hydrodactyl] Get a marketplace project and its versions, optionally filtered by loader/game version.",
    {
      panel: panelField,
      serverId: serverIdField,
      type: typeField,
      source: sourceField,
      projectId: projectIdField,
      loader: z.string().max(40).optional(),
      gameVersion: z.string().max(20).optional(),
    },
    withToolErrorHandling(async ({ panel, serverId, type, source, projectId, loader, gameVersion }) => {
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/marketplace/project`, {
        surface: "client",
        query: { type, source, project_id: projectId, loader, game_version: gameVersion },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "marketplace_resolve",
    "[Hydrodactyl] Resolve a project version to a download URL and filename. To install: pull_remote_file into mods/ or plugins/, then marketplace_record_install.",
    {
      panel: panelField,
      serverId: serverIdField,
      type: typeField,
      source: sourceField,
      projectId: projectIdField,
      versionId: z.string().max(120),
    },
    withToolErrorHandling(async ({ panel, serverId, type, source, projectId, versionId }) => {
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/marketplace/resolve`, {
        surface: "client",
        query: { type, source, project_id: projectId, version_id: versionId },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "marketplace_list_installed",
    "[Hydrodactyl] List mods/plugins recorded as installed through the marketplace.",
    { panel: panelField, serverId: serverIdField },
    withToolErrorHandling(async ({ panel, serverId }) => {
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/marketplace/installed`, { surface: "client" });
      return jsonResult(data);
    })
  );

  server.tool(
    "marketplace_record_install",
    "[Hydrodactyl] Record a mod/plugin as installed in the panel's install history (does not download anything).",
    {
      panel: panelField,
      serverId: serverIdField,
      type: typeField,
      source: sourceField,
      projectId: projectIdField,
      projectTitle: z.string().max(255),
      versionId: z.string().max(128),
      versionName: z.string().max(192),
      filename: z.string().max(255),
    },
    withToolErrorHandling(
      async ({ panel, serverId, type, source, projectId, projectTitle, versionId, versionName, filename }) => {
        const client = resolveHydrodactylPanel(ctx.config, panel);
        const data = await client.request(`/servers/${serverId}/marketplace/installed`, {
          surface: "client",
          method: "POST",
          body: {
            type,
            source,
            project_id: projectId,
            project_title: projectTitle,
            version_id: versionId,
            version_name: versionName,
            filename,
          },
        });
        return jsonResult(data);
      }
    )
  );

  server.tool(
    "marketplace_remove_install",
    "[Hydrodactyl] Remove a mod/plugin from the install history (does not delete the file; use delete_files for that).",
    { panel: panelField, serverId: serverIdField, type: typeField, source: sourceField, projectId: projectIdField },
    withToolErrorHandling(async ({ panel, serverId, type, source, projectId }) => {
      const client = resolveHydrodactylPanel(ctx.config, panel);
      await client.request(`/servers/${serverId}/marketplace/installed`, {
        surface: "client",
        method: "DELETE",
        body: { type, source, project_id: projectId },
      });
      return textResult(`Removed ${projectId} from the install history of server ${serverId}.`);
    })
  );

  server.tool(
    "marketplace_list_loaders",
    "[Hydrodactyl] List the mod loaders the marketplace knows about.",
    { panel: panelField, serverId: serverIdField },
    withToolErrorHandling(async ({ panel, serverId }) => {
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/marketplace/loaders`, { surface: "client" });
      return jsonResult(data);
    })
  );

  server.tool(
    "marketplace_list_game_versions",
    "[Hydrodactyl] List the Minecraft versions the marketplace knows about.",
    { panel: panelField, serverId: serverIdField },
    withToolErrorHandling(async ({ panel, serverId }) => {
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/marketplace/game-versions`, { surface: "client" });
      return jsonResult(data);
    })
  );
}
