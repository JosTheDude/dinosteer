import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "./context.js";
import { panelField, resolvePanel } from "./shared/panelParam.js";
import { confirmField, assertConfirmed } from "./shared/confirm.js";
import { jsonResult, textResult, withToolErrorHandling } from "./shared/format.js";

export function registerAccountTools(server: McpServer, ctx: ToolContext): void {
  server.tool(
    "get_account",
    "Get the account details of the user that owns the Client API key.",
    { panel: panelField },
    withToolErrorHandling(async ({ panel }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/account`, { surface: "client" });
      return jsonResult(data);
    })
  );

  server.tool(
    "get_account_activity",
    "Get the activity log for the account that owns the Client API key.",
    { panel: panelField, page: z.number().int().positive().optional() },
    withToolErrorHandling(async ({ panel, page }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/account/activity`, { surface: "client", query: { page } });
      return jsonResult(data);
    })
  );

  server.tool(
    "list_api_keys",
    "List the account's Client API keys (identifiers and metadata only, never the secret).",
    { panel: panelField },
    withToolErrorHandling(async ({ panel }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/account/api-keys`, { surface: "client" });
      return jsonResult(data);
    })
  );

  server.tool(
    "create_api_key",
    "Create a new Client API key on the account. The response contains the secret token exactly once. Requires confirm:true.",
    {
      panel: panelField,
      description: z.string().min(1),
      allowedIps: z.array(z.string()).max(50).default([]),
      confirm: confirmField,
    },
    withToolErrorHandling(async ({ panel, description, allowedIps, confirm }) => {
      assertConfirmed(confirm, `This will create a new API key "${description}" with full access to the account.`);
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/account/api-keys`, {
        surface: "client",
        method: "POST",
        body: { description, allowed_ips: allowedIps },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "delete_api_key",
    "Revoke a Client API key on the account. Revoking the key dinosteer itself uses will break this panel. Requires confirm:true.",
    { panel: panelField, identifier: z.string(), confirm: confirmField },
    withToolErrorHandling(async ({ panel, identifier, confirm }) => {
      assertConfirmed(confirm, `This will revoke API key ${identifier}.`);
      const client = resolvePanel(ctx.config, panel);
      await client.request(`/account/api-keys/${identifier}`, { surface: "client", method: "DELETE" });
      return textResult(`Revoked API key ${identifier}.`);
    })
  );

  server.tool(
    "list_ssh_keys",
    "List SSH keys registered on the account for SFTP access.",
    { panel: panelField },
    withToolErrorHandling(async ({ panel }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/account/ssh-keys`, { surface: "client" });
      return jsonResult(data);
    })
  );

  server.tool(
    "add_ssh_key",
    "Register an SSH public key on the account for SFTP access.",
    { panel: panelField, name: z.string().min(1), publicKey: z.string().min(1) },
    withToolErrorHandling(async ({ panel, name, publicKey }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/account/ssh-keys`, {
        surface: "client",
        method: "POST",
        body: { name, public_key: publicKey },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "remove_ssh_key",
    "Remove an SSH key from the account by its fingerprint. Requires confirm:true.",
    { panel: panelField, fingerprint: z.string(), confirm: confirmField },
    withToolErrorHandling(async ({ panel, fingerprint, confirm }) => {
      assertConfirmed(confirm, `This will remove SSH key ${fingerprint} from the account.`);
      const client = resolvePanel(ctx.config, panel);
      await client.request(`/account/ssh-keys/remove`, {
        surface: "client",
        method: "POST",
        body: { fingerprint },
      });
      return textResult(`Removed SSH key ${fingerprint}.`);
    })
  );
}
