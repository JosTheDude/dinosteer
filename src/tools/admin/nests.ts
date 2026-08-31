import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "../context.js";
import { panelField, resolvePanel } from "../shared/panelParam.js";
import { jsonResult, withToolErrorHandling } from "../shared/format.js";

const nestIdField = z.number().int().describe("Nest ID");
const eggIdField = z.number().int().describe("Egg ID");

export function registerAdminNestTools(server: McpServer, ctx: ToolContext): void {
  server.tool(
    "admin_list_nests",
    "[Admin] List all nests (categories of server types) on a panel.",
    { panel: panelField },
    withToolErrorHandling(async ({ panel }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/nests`, { surface: "application" });
      return jsonResult(data);
    })
  );

  server.tool(
    "admin_get_nest",
    "[Admin] Get details for a nest.",
    { panel: panelField, nestId: nestIdField },
    withToolErrorHandling(async ({ panel, nestId }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/nests/${nestId}`, { surface: "application" });
      return jsonResult(data);
    })
  );

  server.tool(
    "admin_list_eggs",
    "[Admin] List all eggs (server templates) within a nest.",
    { panel: panelField, nestId: nestIdField },
    withToolErrorHandling(async ({ panel, nestId }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/nests/${nestId}/eggs`, { surface: "application" });
      return jsonResult(data);
    })
  );

  server.tool(
    "admin_get_egg",
    "[Admin] Get details for an egg, including its startup variables — useful before admin_create_server.",
    { panel: panelField, nestId: nestIdField, eggId: eggIdField },
    withToolErrorHandling(async ({ panel, nestId, eggId }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/nests/${nestId}/eggs/${eggId}`, {
        surface: "application",
        query: { include: "variables" },
      });
      return jsonResult(data);
    })
  );
}
