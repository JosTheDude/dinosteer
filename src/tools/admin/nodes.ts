import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "../context.js";
import { panelField, resolvePanel } from "../shared/panelParam.js";
import { confirmField, assertConfirmed } from "../shared/confirm.js";
import { jsonResult, textResult, withToolErrorHandling } from "../shared/format.js";

const nodeIdField = z.number().int().describe("Node ID");

export function registerAdminNodeTools(server: McpServer, ctx: ToolContext): void {
  server.tool(
    "admin_list_nodes",
    "[Admin] List all nodes on a panel.",
    { panel: panelField },
    withToolErrorHandling(async ({ panel }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/nodes`, { surface: "application" });
      return jsonResult(data);
    })
  );

  server.tool(
    "admin_get_node",
    "[Admin] Get details for a node.",
    { panel: panelField, nodeId: nodeIdField },
    withToolErrorHandling(async ({ panel, nodeId }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/nodes/${nodeId}`, { surface: "application" });
      return jsonResult(data);
    })
  );

  server.tool(
    "admin_get_node_configuration",
    "[Admin] Get the wings daemon configuration for a node (used to (re)configure wings).",
    { panel: panelField, nodeId: nodeIdField },
    withToolErrorHandling(async ({ panel, nodeId }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/nodes/${nodeId}/configuration`, { surface: "application" });
      return jsonResult(data);
    })
  );

  server.tool(
    "admin_create_node",
    "[Admin] Create a new node.",
    {
      panel: panelField,
      name: z.string(),
      locationId: z.number().int(),
      fqdn: z.string(),
      scheme: z.enum(["http", "https"]).default("https"),
      memory: z.number().int(),
      disk: z.number().int(),
      daemonListenPort: z.number().int().default(8080),
      daemonSftpPort: z.number().int().default(2022),
    },
    withToolErrorHandling(async (args) => {
      const client = resolvePanel(ctx.config, args.panel);
      const data = await client.request(`/nodes`, {
        surface: "application",
        method: "POST",
        body: {
          name: args.name,
          location_id: args.locationId,
          fqdn: args.fqdn,
          scheme: args.scheme,
          memory: args.memory,
          memory_overallocate: 0,
          disk: args.disk,
          disk_overallocate: 0,
          daemon_listen: args.daemonListenPort,
          daemon_sftp: args.daemonSftpPort,
        },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "admin_update_node",
    "[Admin] Update a node's configuration.",
    {
      panel: panelField,
      nodeId: nodeIdField,
      name: z.string().optional(),
      memory: z.number().int().optional(),
      disk: z.number().int().optional(),
    },
    withToolErrorHandling(async ({ panel, nodeId, name, memory, disk }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/nodes/${nodeId}`, {
        surface: "application",
        method: "PATCH",
        body: { name, memory, disk },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "admin_delete_node",
    "[Admin] Permanently delete a node. Requires confirm:true. Fails if servers are still assigned to it.",
    { panel: panelField, nodeId: nodeIdField, confirm: confirmField },
    withToolErrorHandling(async ({ panel, nodeId, confirm }) => {
      assertConfirmed(confirm, `This will permanently delete node ${nodeId}.`);
      const client = resolvePanel(ctx.config, panel);
      await client.request(`/nodes/${nodeId}`, { surface: "application", method: "DELETE" });
      return textResult(`Deleted node ${nodeId}.`);
    })
  );

  server.tool(
    "admin_list_node_allocations",
    "[Admin] List network allocations defined on a node.",
    { panel: panelField, nodeId: nodeIdField, page: z.number().int().positive().optional() },
    withToolErrorHandling(async ({ panel, nodeId, page }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/nodes/${nodeId}/allocations`, {
        surface: "application",
        query: { page },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "admin_create_node_allocations",
    "[Admin] Create new network allocations on a node.",
    { panel: panelField, nodeId: nodeIdField, ip: z.string(), ports: z.array(z.string()).min(1) },
    withToolErrorHandling(async ({ panel, nodeId, ip, ports }) => {
      const client = resolvePanel(ctx.config, panel);
      await client.request(`/nodes/${nodeId}/allocations`, {
        surface: "application",
        method: "POST",
        body: { ip, ports },
      });
      return textResult(`Created ${ports.length} allocation(s) on node ${nodeId} for ${ip}.`);
    })
  );
}
