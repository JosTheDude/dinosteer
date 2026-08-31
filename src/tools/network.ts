import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "./context.js";
import { panelField, resolvePanel } from "./shared/panelParam.js";
import { confirmField, assertConfirmed } from "./shared/confirm.js";
import { jsonResult, textResult, withToolErrorHandling } from "./shared/format.js";

const serverIdField = z.string().describe("Server identifier (short or full UUID)");
const allocationIdField = z.number().int().describe("Allocation ID");

export function registerNetworkTools(server: McpServer, ctx: ToolContext): void {
  server.tool(
    "list_allocations",
    "List network allocations (IP:port pairs) assigned to a server.",
    { panel: panelField, serverId: serverIdField },
    withToolErrorHandling(async ({ panel, serverId }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/network/allocations`, { surface: "client" });
      return jsonResult(data);
    })
  );

  server.tool(
    "assign_allocation",
    "Request a new automatically-assigned network allocation for a server (if the node allows it).",
    { panel: panelField, serverId: serverIdField },
    withToolErrorHandling(async ({ panel, serverId }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/network/allocations`, {
        surface: "client",
        method: "POST",
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "set_allocation_notes",
    "Set the notes field on a network allocation.",
    { panel: panelField, serverId: serverIdField, allocationId: allocationIdField, notes: z.string() },
    withToolErrorHandling(async ({ panel, serverId, allocationId, notes }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/network/allocations/${allocationId}`, {
        surface: "client",
        method: "POST",
        body: { notes },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "set_primary_allocation",
    "Mark a network allocation as the server's primary allocation.",
    { panel: panelField, serverId: serverIdField, allocationId: allocationIdField },
    withToolErrorHandling(async ({ panel, serverId, allocationId }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/network/allocations/${allocationId}/primary`, {
        surface: "client",
        method: "POST",
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "unassign_allocation",
    "Remove a network allocation from a server. Requires confirm:true.",
    { panel: panelField, serverId: serverIdField, allocationId: allocationIdField, confirm: confirmField },
    withToolErrorHandling(async ({ panel, serverId, allocationId, confirm }) => {
      assertConfirmed(confirm, `This will unassign allocation ${allocationId} from server ${serverId}.`);
      const client = resolvePanel(ctx.config, panel);
      await client.request(`/servers/${serverId}/network/allocations/${allocationId}`, {
        surface: "client",
        method: "DELETE",
      });
      return textResult(`Unassigned allocation ${allocationId}.`);
    })
  );
}
