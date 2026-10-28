import { z } from "zod";

export const PanelConfigSchema = z
  .object({
    name: z
      .string()
      .regex(/^[a-z0-9_-]+$/i, "panel name may only contain letters, numbers, - and _"),
    baseUrl: z.string().url(),
    flavor: z
      .enum(["pterodactyl", "hydrodactyl"])
      .default("pterodactyl")
      .describe("Panel software. Use hydrodactyl for Hydrodactyl and its forks (e.g. Novadactyl)."),
    clientApiKey: z.string().min(1).optional(),
    applicationApiKey: z.string().min(1).optional(),
    timeoutMs: z.number().int().positive().default(15000),
  })
  .refine((panel) => Boolean(panel.clientApiKey || panel.applicationApiKey), {
    message: "panel needs at least one of clientApiKey or applicationApiKey",
  });

export const ConfigSchema = z
  .object({
    defaultPanel: z.string().optional(),
    panels: z.array(PanelConfigSchema).min(1, "at least one panel must be configured"),
  })
  .superRefine((cfg, ctx) => {
    const names = cfg.panels.map((p) => p.name);
    const seen = new Set<string>();
    for (const name of names) {
      if (seen.has(name)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate panel name: ${name}`,
        });
      }
      seen.add(name);
    }
    if (cfg.defaultPanel && !seen.has(cfg.defaultPanel)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `defaultPanel "${cfg.defaultPanel}" does not match any configured panel`,
      });
    }
  });

export type PanelConfig = z.infer<typeof PanelConfigSchema>;
export type Config = z.infer<typeof ConfigSchema>;
