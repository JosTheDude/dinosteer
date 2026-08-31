import { z } from "zod";
import type { Config } from "../../config/schema.js";
import { getPanelClient, resolvePanelName, type PanelClient } from "../../client/panelClient.js";

export const panelField = z
  .string()
  .describe(
    "Name of the configured Pterodactyl panel to target (see the server's config file). " +
      "Omit to use the configured default panel, if unambiguous."
  )
  .optional();

export function resolvePanel(config: Config, requestedPanel: string | undefined): PanelClient {
  const name = resolvePanelName(config.panels, config.defaultPanel, requestedPanel);
  return getPanelClient(config.panels, name);
}
