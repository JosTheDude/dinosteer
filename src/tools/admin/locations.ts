import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "../context.js";
import { panelField, resolvePanel } from "../shared/panelParam.js";
import { confirmField, assertConfirmed } from "../shared/confirm.js";
import { jsonResult, textResult, withToolErrorHandling } from "../shared/format.js";

const locationIdField = z.number().int().describe("Location ID");

export function registerAdminLocationTools(server: McpServer, ctx: ToolContext): void {
  server.tool(
    "admin_list_locations",
    "[Admin] List all locations on a panel.",
    { panel: panelField },
    withToolErrorHandling(async ({ panel }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/locations`, { surface: "application" });
      return jsonResult(data);
    })
  );

  server.tool(
    "admin_create_location",
    "[Admin] Create a new location.",
    { panel: panelField, short: z.string(), long: z.string() },
    withToolErrorHandling(async ({ panel, short, long }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/locations`, {
        surface: "application",
        method: "POST",
        body: { short, long },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "admin_update_location",
    "[Admin] Update a location's short/long name.",
    { panel: panelField, locationId: locationIdField, short: z.string().optional(), long: z.string().optional() },
    withToolErrorHandling(async ({ panel, locationId, short, long }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/locations/${locationId}`, {
        surface: "application",
        method: "PATCH",
        body: { short, long },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "admin_delete_location",
    "[Admin] Permanently delete a location. Requires confirm:true.",
    { panel: panelField, locationId: locationIdField, confirm: confirmField },
    withToolErrorHandling(async ({ panel, locationId, confirm }) => {
      assertConfirmed(confirm, `This will permanently delete location ${locationId}.`);
      const client = resolvePanel(ctx.config, panel);
      await client.request(`/locations/${locationId}`, { surface: "application", method: "DELETE" });
      return textResult(`Deleted location ${locationId}.`);
    })
  );
}
