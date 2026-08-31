const SECRET_KEY_NAMES = new Set([
  "clientApiKey",
  "applicationApiKey",
  "authorization",
  "token",
  "password",
]);

const SECRET_PATTERN = /\b(ptlc_|ptla_)[A-Za-z0-9]+\b/g;

export function redact(value: string): string {
  return value.replace(SECRET_PATTERN, "$1***REDACTED***");
}

export function sanitizeForLog(input: unknown): unknown {
  if (typeof input === "string") return redact(input);
  if (Array.isArray(input)) return input.map(sanitizeForLog);
  if (input && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (SECRET_KEY_NAMES.has(key) || SECRET_KEY_NAMES.has(key.toLowerCase())) {
        out[key] = "***REDACTED***";
      } else {
        out[key] = sanitizeForLog(value);
      }
    }
    return out;
  }
  return input;
}

// stdio transport reserves stdout for JSON-RPC; all diagnostics must go to stderr.
function write(level: string, message: string, meta?: unknown): void {
  const parts = [`[pterodactyl-mcp] [${level}] ${redact(message)}`];
  if (meta !== undefined) {
    parts.push(JSON.stringify(sanitizeForLog(meta)));
  }
  process.stderr.write(parts.join(" ") + "\n");
}

export const logger = {
  info: (message: string, meta?: unknown) => write("info", message, meta),
  warn: (message: string, meta?: unknown) => write("warn", message, meta),
  error: (message: string, meta?: unknown) => write("error", message, meta),
  debug: (message: string, meta?: unknown) => {
    if (process.env.PTERODACTYL_MCP_DEBUG) write("debug", message, meta);
  },
};
