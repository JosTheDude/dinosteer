import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "../context.js";
import { panelField, resolvePanel } from "../shared/panelParam.js";
import { confirmField, assertConfirmed } from "../shared/confirm.js";
import { jsonResult, textResult, withToolErrorHandling } from "../shared/format.js";

const userIdField = z.number().int().describe("Application-API user ID");

export function registerAdminUserTools(server: McpServer, ctx: ToolContext): void {
  server.tool(
    "admin_list_users",
    "[Admin] List all panel users.",
    { panel: panelField, page: z.number().int().positive().optional(), filter: z.string().optional() },
    withToolErrorHandling(async ({ panel, page, filter }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/users`, {
        surface: "application",
        query: { page, "filter[email]": filter },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "admin_get_user",
    "[Admin] Get details for a panel user.",
    { panel: panelField, userId: userIdField },
    withToolErrorHandling(async ({ panel, userId }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/users/${userId}`, { surface: "application" });
      return jsonResult(data);
    })
  );

  server.tool(
    "admin_create_user",
    "[Admin] Create a new panel user.",
    {
      panel: panelField,
      email: z.string().email(),
      username: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      isAdmin: z.boolean().default(false),
    },
    withToolErrorHandling(async ({ panel, email, username, firstName, lastName, isAdmin }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/users`, {
        surface: "application",
        method: "POST",
        body: { email, username, first_name: firstName, last_name: lastName, root_admin: isAdmin },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "admin_update_user",
    "[Admin] Update a panel user's fields.",
    {
      panel: panelField,
      userId: userIdField,
      email: z.string().email().optional(),
      username: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      isAdmin: z.boolean().optional(),
    },
    withToolErrorHandling(async ({ panel, userId, email, username, firstName, lastName, isAdmin }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/users/${userId}`, {
        surface: "application",
        method: "PATCH",
        body: {
          email,
          username,
          first_name: firstName,
          last_name: lastName,
          root_admin: isAdmin,
        },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "admin_delete_user",
    "[Admin] Permanently delete a panel user. Requires confirm:true.",
    { panel: panelField, userId: userIdField, confirm: confirmField },
    withToolErrorHandling(async ({ panel, userId, confirm }) => {
      assertConfirmed(confirm, `This will permanently delete panel user ${userId}.`);
      const client = resolvePanel(ctx.config, panel);
      await client.request(`/users/${userId}`, { surface: "application", method: "DELETE" });
      return textResult(`Deleted user ${userId}.`);
    })
  );
}
