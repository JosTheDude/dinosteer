import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "./context.js";
import { panelField, resolvePanel } from "./shared/panelParam.js";
import { confirmField, assertConfirmed } from "./shared/confirm.js";
import { jsonResult, textResult, withToolErrorHandling } from "./shared/format.js";

const serverIdField = z.string().describe("Server identifier (short or full UUID)");
const scheduleIdField = z.number().int().describe("Schedule ID");

const cronFields = {
  minute: z.string().default("*/5"),
  hour: z.string().default("*"),
  dayOfWeek: z.string().default("*"),
  dayOfMonth: z.string().default("*"),
};

export function registerScheduleTools(server: McpServer, ctx: ToolContext): void {
  server.tool(
    "list_schedules",
    "List scheduled tasks for a server.",
    { panel: panelField, serverId: serverIdField },
    withToolErrorHandling(async ({ panel, serverId }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/schedules`, { surface: "client" });
      return jsonResult(data);
    })
  );

  server.tool(
    "get_schedule",
    "Get details for a specific schedule, including its tasks.",
    { panel: panelField, serverId: serverIdField, scheduleId: scheduleIdField },
    withToolErrorHandling(async ({ panel, serverId, scheduleId }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/schedules/${scheduleId}`, { surface: "client" });
      return jsonResult(data);
    })
  );

  server.tool(
    "create_schedule",
    "Create a new schedule on a server.",
    {
      panel: panelField,
      serverId: serverIdField,
      name: z.string(),
      active: z.boolean().default(true),
      ...cronFields,
    },
    withToolErrorHandling(async ({ panel, serverId, name, active, minute, hour, dayOfWeek, dayOfMonth }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/schedules`, {
        surface: "client",
        method: "POST",
        body: {
          name,
          is_active: active,
          minute,
          hour,
          day_of_week: dayOfWeek,
          day_of_month: dayOfMonth,
        },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "update_schedule",
    "Update an existing schedule.",
    {
      panel: panelField,
      serverId: serverIdField,
      scheduleId: scheduleIdField,
      name: z.string().optional(),
      active: z.boolean().optional(),
      minute: z.string().optional(),
      hour: z.string().optional(),
      dayOfWeek: z.string().optional(),
      dayOfMonth: z.string().optional(),
    },
    withToolErrorHandling(async ({ panel, serverId, scheduleId, name, active, minute, hour, dayOfWeek, dayOfMonth }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/schedules/${scheduleId}`, {
        surface: "client",
        method: "POST",
        body: {
          name,
          is_active: active,
          minute,
          hour,
          day_of_week: dayOfWeek,
          day_of_month: dayOfMonth,
        },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "delete_schedule",
    "Delete a schedule. Requires confirm:true.",
    { panel: panelField, serverId: serverIdField, scheduleId: scheduleIdField, confirm: confirmField },
    withToolErrorHandling(async ({ panel, serverId, scheduleId, confirm }) => {
      assertConfirmed(confirm, `This will delete schedule ${scheduleId} on server ${serverId}.`);
      const client = resolvePanel(ctx.config, panel);
      await client.request(`/servers/${serverId}/schedules/${scheduleId}`, {
        surface: "client",
        method: "DELETE",
      });
      return textResult(`Deleted schedule ${scheduleId}.`);
    })
  );

  server.tool(
    "create_schedule_task",
    "Add a task to a schedule (e.g. send command, power action, create backup).",
    {
      panel: panelField,
      serverId: serverIdField,
      scheduleId: scheduleIdField,
      action: z.enum(["command", "power", "backup"]),
      payload: z.string().optional(),
      timeOffset: z.number().int().min(0).default(0),
    },
    withToolErrorHandling(async ({ panel, serverId, scheduleId, action, payload, timeOffset }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/schedules/${scheduleId}/tasks`, {
        surface: "client",
        method: "POST",
        body: { action, payload, time_offset: timeOffset },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "delete_schedule_task",
    "Delete a task from a schedule. Requires confirm:true.",
    {
      panel: panelField,
      serverId: serverIdField,
      scheduleId: scheduleIdField,
      taskId: z.number().int(),
      confirm: confirmField,
    },
    withToolErrorHandling(async ({ panel, serverId, scheduleId, taskId, confirm }) => {
      assertConfirmed(confirm, `This will delete task ${taskId} from schedule ${scheduleId} on server ${serverId}.`);
      const client = resolvePanel(ctx.config, panel);
      await client.request(`/servers/${serverId}/schedules/${scheduleId}/tasks/${taskId}`, {
        surface: "client",
        method: "DELETE",
      });
      return textResult(`Deleted task ${taskId} from schedule ${scheduleId}.`);
    })
  );
}
