import { PanelConfigurationError, PterodactylApiError, ConfirmationRequiredError } from "../../client/errors.js";
import { logger } from "../../logging.js";

export interface ToolTextResult {
  [x: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export function jsonResult(data: unknown): ToolTextResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

export function textResult(text: string): ToolTextResult {
  return { content: [{ type: "text", text }] };
}

function errorResult(text: string): ToolTextResult {
  return { content: [{ type: "text", text }], isError: true };
}

/** Wraps a tool handler so thrown domain errors become MCP-style error results instead of raw exceptions. */
export function withToolErrorHandling<Args extends unknown[]>(
  fn: (...args: Args) => Promise<ToolTextResult>
): (...args: Args) => Promise<ToolTextResult> {
  return async (...args: Args) => {
    try {
      return await fn(...args);
    } catch (err) {
      if (
        err instanceof PterodactylApiError ||
        err instanceof PanelConfigurationError ||
        err instanceof ConfirmationRequiredError
      ) {
        return errorResult(err.message);
      }
      logger.error("Unexpected tool error", { error: (err as Error).message, stack: (err as Error).stack });
      return errorResult(`Unexpected error: ${(err as Error).message}`);
    }
  };
}
