import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Config } from "./config/schema.js";
import { registerAllTools } from "./tools/registerAll.js";

export function createServer(config: Config): McpServer {
  const server = new McpServer({
    name: "dinosteer",
    version: "0.1.0",
  });

  registerAllTools(server, { config });

  return server;
}
