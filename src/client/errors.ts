export interface PterodactylErrorDetail {
  code?: string;
  status?: string;
  detail?: string;
}

export class PterodactylApiError extends Error {
  readonly panel: string;
  readonly endpoint: string;
  readonly httpStatus: number;
  readonly apiErrors: PterodactylErrorDetail[];

  constructor(params: {
    panel: string;
    endpoint: string;
    httpStatus: number;
    apiErrors?: PterodactylErrorDetail[];
    fallbackMessage?: string;
  }) {
    const detailText = params.apiErrors?.map((e) => e.detail).filter(Boolean).join("; ");
    const message = describe(params.httpStatus, params.panel, params.endpoint, detailText, params.fallbackMessage);
    super(message);
    this.name = "PterodactylApiError";
    this.panel = params.panel;
    this.endpoint = params.endpoint;
    this.httpStatus = params.httpStatus;
    this.apiErrors = params.apiErrors ?? [];
  }
}

function describe(
  status: number,
  panel: string,
  endpoint: string,
  detail: string | undefined,
  fallback: string | undefined
): string {
  const where = `[panel:${panel}] ${endpoint}`;
  if (status === 401 || status === 403) {
    return `${where}: authentication/authorization failed (HTTP ${status}) — check the configured API key and its permission scope.${detail ? " " + detail : ""}`;
  }
  if (status === 404) {
    return `${where}: resource not found (HTTP 404).${detail ? " " + detail : ""}`;
  }
  if (status === 422) {
    return `${where}: validation error (HTTP 422): ${detail ?? fallback ?? "invalid request"}`;
  }
  if (status === 429) {
    return `${where}: rate limited (HTTP 429).${detail ? " " + detail : ""}`;
  }
  if (status >= 500) {
    return `${where}: panel returned a server error (HTTP ${status}).${detail ? " " + detail : ""}`;
  }
  return `${where}: request failed (HTTP ${status}).${detail ? " " + detail : fallback ? " " + fallback : ""}`;
}

export class PanelConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PanelConfigurationError";
  }
}

export class ConfirmationRequiredError extends Error {
  constructor(actionDescription: string) {
    super(`${actionDescription} Re-call this tool with confirm: true to proceed.`);
    this.name = "ConfirmationRequiredError";
  }
}
