#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig, ConfigError } from "./config/load.js";
import { createServer } from "./server.js";
import { logger } from "./logging.js";

async function main(): Promise<void> {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    if (err instanceof ConfigError) {
      logger.error(err.message);
      process.exit(1);
    }
    throw err;
  }

  logger.info(`Loaded ${config.panels.length} panel(s): ${config.panels.map((p) => p.name).join(", ")}`);

  const server = createServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("Dinosteer server ready on stdio.");
}

main().catch((err) => {
  logger.error("Fatal error starting Dinosteer", { error: (err as Error).message, stack: (err as Error).stack });
  process.exit(1);
});
