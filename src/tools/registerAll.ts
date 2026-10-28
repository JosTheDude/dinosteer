import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "./context.js";
import { registerServerTools } from "./servers.js";
import { registerFileTools } from "./files.js";
import { registerConsoleTools } from "./console.js";
import { registerBackupTools } from "./backups.js";
import { registerDatabaseTools } from "./databases.js";
import { registerScheduleTools } from "./schedules.js";
import { registerNetworkTools } from "./network.js";
import { registerSubuserTools } from "./subusers.js";
import { registerAccountTools } from "./account.js";
import { registerHydrodactylServerTools } from "./hydrodactyl/servers.js";
import { registerHydrodactylMarketplaceTools } from "./hydrodactyl/marketplace.js";
import { registerHydrodactylPanelTools } from "./hydrodactyl/panel.js";
import { registerAdminServerTools } from "./admin/servers.js";
import { registerAdminUserTools } from "./admin/users.js";
import { registerAdminNodeTools } from "./admin/nodes.js";
import { registerAdminLocationTools } from "./admin/locations.js";
import { registerAdminNestTools } from "./admin/nests.js";

export function registerAllTools(server: McpServer, ctx: ToolContext): void {
  registerServerTools(server, ctx);
  registerFileTools(server, ctx);
  registerConsoleTools(server, ctx);
  registerBackupTools(server, ctx);
  registerDatabaseTools(server, ctx);
  registerScheduleTools(server, ctx);
  registerNetworkTools(server, ctx);
  registerSubuserTools(server, ctx);
  registerAccountTools(server, ctx);

  registerAdminServerTools(server, ctx);
  registerAdminUserTools(server, ctx);
  registerAdminNodeTools(server, ctx);
  registerAdminLocationTools(server, ctx);
  registerAdminNestTools(server, ctx);

  registerHydrodactylServerTools(server, ctx);
  registerHydrodactylMarketplaceTools(server, ctx);
  registerHydrodactylPanelTools(server, ctx);
}
