import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "./context.js";
import { panelField, resolvePanel } from "./shared/panelParam.js";
import { confirmField, assertConfirmed } from "./shared/confirm.js";
import { jsonResult, textResult, withToolErrorHandling } from "./shared/format.js";

const serverIdField = z.string().describe("Server identifier (short or full UUID)");
const pathField = z.string().describe("File or directory path relative to the server's root");

export function registerFileTools(server: McpServer, ctx: ToolContext): void {
  server.tool(
    "list_files",
    "List files and directories at a path on a server.",
    { panel: panelField, serverId: serverIdField, path: pathField.optional() },
    withToolErrorHandling(async ({ panel, serverId, path }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/files/list`, {
        surface: "client",
        query: { directory: path ?? "/" },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "read_file",
    "Read the text contents of a file on a server.",
    { panel: panelField, serverId: serverIdField, path: pathField },
    withToolErrorHandling(async ({ panel, serverId, path }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request<string>(`/servers/${serverId}/files/contents`, {
        surface: "client",
        query: { file: path },
        rawTextResponse: true,
      });
      return textResult(data);
    })
  );

  server.tool(
    "download_file_url",
    "Get a signed, one-time download URL for a file on a server.",
    { panel: panelField, serverId: serverIdField, path: pathField },
    withToolErrorHandling(async ({ panel, serverId, path }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/files/download`, {
        surface: "client",
        query: { file: path },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "write_file",
    "Write (create or overwrite) a file's contents on a server.",
    { panel: panelField, serverId: serverIdField, path: pathField, content: z.string() },
    withToolErrorHandling(async ({ panel, serverId, path, content }) => {
      const client = resolvePanel(ctx.config, panel);
      await client.request(`/servers/${serverId}/files/write`, {
        surface: "client",
        method: "POST",
        query: { file: path },
        body: content,
        rawTextBody: true,
      });
      return textResult(`Wrote ${content.length} characters to ${path}.`);
    })
  );

  server.tool(
    "rename_file",
    "Rename or move a file/directory on a server.",
    {
      panel: panelField,
      serverId: serverIdField,
      root: z.string().default("/"),
      from: z.string(),
      to: z.string(),
    },
    withToolErrorHandling(async ({ panel, serverId, root, from, to }) => {
      const client = resolvePanel(ctx.config, panel);
      await client.request(`/servers/${serverId}/files/rename`, {
        surface: "client",
        method: "PUT",
        body: { root, files: [{ from, to }] },
      });
      return textResult(`Renamed ${from} to ${to}.`);
    })
  );

  server.tool(
    "copy_file",
    "Copy a file on a server.",
    { panel: panelField, serverId: serverIdField, location: z.string() },
    withToolErrorHandling(async ({ panel, serverId, location }) => {
      const client = resolvePanel(ctx.config, panel);
      await client.request(`/servers/${serverId}/files/copy`, {
        surface: "client",
        method: "POST",
        body: { location },
      });
      return textResult(`Copied ${location}.`);
    })
  );

  server.tool(
    "compress_files",
    "Compress one or more files/directories into an archive.",
    {
      panel: panelField,
      serverId: serverIdField,
      root: z.string().default("/"),
      files: z.array(z.string()).min(1),
    },
    withToolErrorHandling(async ({ panel, serverId, root, files }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/files/compress`, {
        surface: "client",
        method: "POST",
        body: { root, files },
      });
      return jsonResult(data);
    })
  );

  server.tool(
    "decompress_file",
    "Decompress an archive file on a server.",
    { panel: panelField, serverId: serverIdField, root: z.string().default("/"), file: z.string() },
    withToolErrorHandling(async ({ panel, serverId, root, file }) => {
      const client = resolvePanel(ctx.config, panel);
      await client.request(`/servers/${serverId}/files/decompress`, {
        surface: "client",
        method: "POST",
        body: { root, file },
      });
      return textResult(`Decompressed ${file}.`);
    })
  );

  server.tool(
    "delete_files",
    "Delete one or more files/directories on a server. Destructive — requires confirm:true.",
    {
      panel: panelField,
      serverId: serverIdField,
      root: z.string().default("/"),
      files: z.array(z.string()).min(1),
      confirm: confirmField,
    },
    withToolErrorHandling(async ({ panel, serverId, root, files, confirm }) => {
      assertConfirmed(confirm, `This will permanently delete ${files.length} file(s)/folder(s) under ${root} on server ${serverId}.`);
      const client = resolvePanel(ctx.config, panel);
      await client.request(`/servers/${serverId}/files/delete`, {
        surface: "client",
        method: "POST",
        body: { root, files },
      });
      return textResult(`Deleted ${files.length} file(s)/folder(s) under ${root}.`);
    })
  );

  server.tool(
    "create_folder",
    "Create a new folder on a server.",
    { panel: panelField, serverId: serverIdField, root: z.string().default("/"), name: z.string() },
    withToolErrorHandling(async ({ panel, serverId, root, name }) => {
      const client = resolvePanel(ctx.config, panel);
      await client.request(`/servers/${serverId}/files/create-folder`, {
        surface: "client",
        method: "POST",
        body: { root, name },
      });
      return textResult(`Created folder ${name} under ${root}.`);
    })
  );

  server.tool(
    "upload_file_url",
    "Get a signed upload URL for a server. Note: the calling agent must separately perform an HTTP multipart PUT/POST to this URL with the file bytes — this tool only returns the URL.",
    { panel: panelField, serverId: serverIdField },
    withToolErrorHandling(async ({ panel, serverId }) => {
      const client = resolvePanel(ctx.config, panel);
      const data = await client.request(`/servers/${serverId}/files/upload`, { surface: "client" });
      return jsonResult(data);
    })
  );
}
