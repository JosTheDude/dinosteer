import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "../context.js";
import { panelField, resolveHydrodactylPanel } from "../shared/panelParam.js";
import { confirmField, assertConfirmed } from "../shared/confirm.js";
import { jsonResult, textResult, withToolErrorHandling } from "../shared/format.js";

const groupIdField = z.number().int().describe("Server group ID");
const serverIdsField = z.array(z.number().int()).min(1).describe("Internal numeric server IDs (attributes.internal_id)");

export function registerHydrodactylPanelTools(server: McpServer, ctx: ToolContext): void {
  server.tool(
    "get_panel_version",
    "[Hydrodactyl] Get the panel's version information.",
    { panel: panelField },
    withToolErrorHandling(async ({ panel }) => {
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/version`, { surface: "client" });
      return jsonResult(data);
    })
  );

  server.tool(
    "list_nests",
    "[Hydrodactyl] List nests and their eggs visible to the client (used for egg changes).",
    { panel: panelField },
    withToolErrorHandling(async ({ panel }) => {
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/nests`, { surface: "client" });
      return jsonResult(data);
    })
  );

  server.tool(
    "get_nest",
    "[Hydrodactyl] Get a nest and its eggs.",
    { panel: panelField, nestId: z.number().int() },
    withToolErrorHandling(async ({ panel, nestId }) => {
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/nests/${nestId}`, { surface: "client" });
      return jsonResult(data);
    })
  );

  server.tool(
    "list_server_groups",
    "[Hydrodactyl] List the account's server groups (dashboard folders).",
    { panel: panelField },
    withToolErrorHandling(async ({ panel }) => {
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/server-groups`, { surface: "client" });
      return jsonResult(data);
    })
  );

  server.tool(
    "create_server_group",
    "[Hydrodactyl] Create a server group, optionally with initial servers.",
    {
      panel: panelField,
      name: z.string().min(1).max(191),
      description: z.string().max(1000).optional(),
      serverIds: z.array(z.number().int()).optional(),
    },
    withToolErrorHandling(async ({ panel, name, description, serverIds }) => {
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/server-groups`, {
        surface: "client",
        method: "POST",
        body: { name, description, server_ids: serverIds },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "update_server_group",
    "[Hydrodactyl] Update a server group's name, description, order or collapsed state.",
    {
      panel: panelField,
      groupId: groupIdField,
      name: z.string().min(1).max(191).optional(),
      description: z.string().max(1000).nullable().optional(),
      sortOrder: z.number().int().min(0).optional(),
      isCollapsed: z.boolean().optional(),
    },
    withToolErrorHandling(async ({ panel, groupId, name, description, sortOrder, isCollapsed }) => {
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/server-groups/${groupId}`, {
        surface: "client",
        method: "PUT",
        body: { name, description, sort_order: sortOrder, is_collapsed: isCollapsed },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "delete_server_group",
    "[Hydrodactyl] Delete a server group (the servers themselves are untouched). Requires confirm:true.",
    { panel: panelField, groupId: groupIdField, confirm: confirmField },
    withToolErrorHandling(async ({ panel, groupId, confirm }) => {
      assertConfirmed(confirm, `This will delete server group ${groupId}.`);
      const client = resolveHydrodactylPanel(ctx.config, panel);
      await client.request(`/server-groups/${groupId}`, { surface: "client", method: "DELETE" });
      return textResult(`Deleted server group ${groupId}.`);
    })
  );

  server.tool(
    "add_servers_to_group",
    "[Hydrodactyl] Add servers to a server group.",
    { panel: panelField, groupId: groupIdField, serverIds: serverIdsField },
    withToolErrorHandling(async ({ panel, groupId, serverIds }) => {
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/server-groups/${groupId}/servers`, {
        surface: "client",
        method: "POST",
        body: { server_ids: serverIds },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "remove_servers_from_group",
    "[Hydrodactyl] Remove servers from a server group.",
    { panel: panelField, groupId: groupIdField, serverIds: serverIdsField },
    withToolErrorHandling(async ({ panel, groupId, serverIds }) => {
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/server-groups/${groupId}/servers`, {
        surface: "client",
        method: "DELETE",
        body: { server_ids: serverIds },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "reorder_server_groups",
    "[Hydrodactyl] Set the display order of server groups (first ID is shown first).",
    { panel: panelField, groupIds: z.array(z.number().int()) },
    withToolErrorHandling(async ({ panel, groupIds }) => {
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/server-groups/reorder`, {
        surface: "client",
        method: "PUT",
        body: { group_ids: groupIds },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "admin_get_panel_status",
    "[Admin, Hydrodactyl] Get panel system status (versions, health).",
    { panel: panelField },
    withToolErrorHandling(async ({ panel }) => {
      const client = resolveHydrodactylPanel(ctx.config, panel);
      const data = await client.request(`/panel/status`, { surface: "application" });
      return jsonResult(data);
    })
  );
}
