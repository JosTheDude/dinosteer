import { Agent, fetch as undiciFetch } from "undici";
import type { PanelConfig } from "../config/schema.js";
import { PanelConfigurationError, PterodactylApiError, type PterodactylErrorDetail } from "./errors.js";
import { logger } from "../logging.js";

export type ApiSurface = "client" | "application";

export interface RequestOptions {
  surface: ApiSurface;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** When true, `body` is sent as-is (must be a string) with Content-Type: text/plain instead of JSON-encoded. */
  rawTextBody?: boolean;
  /** When true, the response is returned as raw text instead of being JSON-parsed (e.g. file contents endpoint). */
  rawTextResponse?: boolean;
  query?: Record<string, string | number | undefined>;
}

interface PterodactylErrorBody {
  errors?: PterodactylErrorDetail[];
}

// Hydrodactyl serves these server routes at /servers/{id}/...; everything else lives under /servers/{daemonType}/{id}/...
const HYDRODACTYL_TOP_LEVEL_SERVER_ROUTES = /^\/(resources\/history|subdomain|webhook|marketplace)(\/|$)/;

const keepAliveAgent = new Agent({ keepAliveTimeout: 10_000, keepAliveMaxTimeout: 30_000 });

export class PanelClient {
  private readonly daemonTypes = new Map<string, string>();

  constructor(private readonly panel: PanelConfig) {}

  get name(): string {
    return this.panel.name;
  }

  get flavor(): PanelConfig["flavor"] {
    return this.panel.flavor;
  }

  hasApplicationKey(): boolean {
    return Boolean(this.panel.applicationApiKey);
  }

  hasClientKey(): boolean {
    return Boolean(this.panel.clientApiKey);
  }

  async request<T = unknown>(path: string, options: RequestOptions): Promise<T> {
    const key = options.surface === "application" ? this.panel.applicationApiKey : this.panel.clientApiKey;
    if (!key) {
      throw new PanelConfigurationError(
        `Panel "${this.panel.name}" has no ${options.surface} API key configured; ` +
          `${options.surface === "application" ? "admin_*" : "this"} tools are unavailable for this panel.`
      );
    }

    if (this.panel.flavor === "hydrodactyl" && options.surface === "client") {
      path = await this.hydrodactylServerPath(path);
    }

    const base = this.panel.baseUrl.replace(/\/+$/, "");
    const url = new URL(`${base}/api/${options.surface}${path}`);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }

    const method = options.method ?? "GET";
    const endpointLabel = `${method} ${url.pathname}`;

    const doFetch = async (): Promise<Response> => {
      logger.debug(`request ${endpointLabel}`, { panel: this.panel.name });
      return undiciFetch(url, {
        method,
        dispatcher: keepAliveAgent,
        headers: {
          Authorization: `Bearer ${key}`,
          Accept: "Application/vnd.pterodactyl.v1+json",
          "Content-Type": options.rawTextBody ? "text/plain" : "application/json",
        },
        body:
          options.body === undefined
            ? undefined
            : options.rawTextBody
              ? (options.body as string)
              : JSON.stringify(options.body),
        signal: AbortSignal.timeout(this.panel.timeoutMs),
      }) as unknown as Promise<Response>;
    };

    let response = await doFetch();

    if (response.status === 429) {
      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 1000;
      await new Promise((resolve) => setTimeout(resolve, Math.min(retryAfterMs, 5000)));
      response = await doFetch();
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();

    if (!response.ok) {
      const body = text ? (safeJsonParse(text) as PterodactylErrorBody | undefined) : undefined;
      throw new PterodactylApiError({
        panel: this.panel.name,
        endpoint: endpointLabel,
        httpStatus: response.status,
        apiErrors: body?.errors,
        fallbackMessage: text.slice(0, 500),
      });
    }

    if (options.rawTextResponse) {
      return text as unknown as T;
    }

    return (text ? safeJsonParse(text) : undefined) as T;
  }

  /** Rewrites `/servers/{id}/...` to Hydrodactyl's `/servers/{daemonType}/{id}/...`, looking up (and caching) the daemon type. */
  private async hydrodactylServerPath(path: string): Promise<string> {
    const match = /^\/servers\/([^/]+)(\/.*)$/.exec(path);
    if (!match) return path;
    const [, serverId, rest] = match;
    if (HYDRODACTYL_TOP_LEVEL_SERVER_ROUTES.test(rest)) return path;

    let daemonType = this.daemonTypes.get(serverId);
    if (!daemonType) {
      const server = await this.request<{ attributes?: { daemon_type?: string }; meta?: { daemonType?: string } }>(
        `/servers/${serverId}`,
        { surface: "client" }
      );
      daemonType = server.meta?.daemonType ?? server.attributes?.daemon_type;
      if (!daemonType) {
        throw new PanelConfigurationError(
          `Panel "${this.panel.name}" did not report a daemon type for server ${serverId}; is this panel really Hydrodactyl?`
        );
      }
      this.daemonTypes.set(serverId, daemonType);
    }
    return `/servers/${daemonType}/${serverId}${rest}`;
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

const clientCache = new Map<string, PanelClient>();

export function getPanelClient(panels: PanelConfig[], panelName: string): PanelClient {
  const cached = clientCache.get(panelName);
  if (cached) return cached;

  const panel = panels.find((p) => p.name === panelName);
  if (!panel) {
    const available = panels.map((p) => p.name).join(", ");
    throw new PanelConfigurationError(
      `Unknown panel "${panelName}". Configured panels: ${available || "(none)"}`
    );
  }

  const client = new PanelClient(panel);
  clientCache.set(panelName, client);
  return client;
}

export function resolvePanelName(
  panels: PanelConfig[],
  defaultPanel: string | undefined,
  requested: string | undefined
): string {
  if (requested) return requested;
  if (defaultPanel) return defaultPanel;
  if (panels.length === 1) return panels[0].name;

  const available = panels.map((p) => p.name).join(", ");
  throw new PanelConfigurationError(
    `No panel specified and no unambiguous default is available. Pass "panel" explicitly. ` +
      `Configured panels: ${available}`
  );
}
