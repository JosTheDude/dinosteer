import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { ConfigSchema, type Config } from "./schema.js";
import { logger } from "../logging.js";

export class ConfigError extends Error {}

const ENV_VAR_PATTERN = /\$\{([A-Z0-9_]+)\}/g;

function interpolateEnv(raw: string): string {
  return raw
    .split("\n")
    .map((line) => {
      const trimmed = line.trimStart();
      if (trimmed.startsWith("#")) return line; // don't interpolate inside comments
      return line.replace(ENV_VAR_PATTERN, (match, varName: string) => {
        const value = process.env[varName];
        if (value === undefined) {
          throw new ConfigError(
            `Config references \${${varName}} but that environment variable is not set.`
          );
        }
        return value;
      });
    })
    .join("\n");
}

function resolveConfigPath(explicitPath?: string): string {
  if (explicitPath) return explicitPath;

  const argIndex = process.argv.indexOf("--config");
  if (argIndex !== -1 && process.argv[argIndex + 1]) {
    return process.argv[argIndex + 1];
  }

  if (process.env.DINOSTEER_CONFIG) {
    return process.env.DINOSTEER_CONFIG;
  }

  const cwdCandidate = join(process.cwd(), "dinosteer.config.yaml");
  if (existsSync(cwdCandidate)) return cwdCandidate;

  const homeCandidate = join(homedir(), ".config", "dinosteer", "config.yaml");
  if (existsSync(homeCandidate)) return homeCandidate;

  throw new ConfigError(
    "No config file found. Pass --config <path>, set DINOSTEER_CONFIG, " +
      "or create ./dinosteer.config.yaml or ~/.config/dinosteer/config.yaml"
  );
}

function warnIfPermissive(path: string): void {
  try {
    const mode = statSync(path).mode & 0o777;
    if (process.platform !== "win32" && (mode & 0o077) !== 0) {
      logger.warn(
        `Config file ${path} is readable/writable by group or others (mode ${mode.toString(8)}). ` +
          "If it contains literal secrets, consider chmod 600."
      );
    }
  } catch {
    // best-effort only
  }
}

export function loadConfig(explicitPath?: string): Config {
  const path = resolveConfigPath(explicitPath);
  warnIfPermissive(path);

  const rawFile = readFileSync(path, "utf-8");
  let interpolated: string;
  try {
    interpolated = interpolateEnv(rawFile);
  } catch (err) {
    if (err instanceof ConfigError) throw err;
    throw new ConfigError(`Failed to interpolate env vars in ${path}: ${(err as Error).message}`);
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(interpolated);
  } catch (err) {
    throw new ConfigError(`Failed to parse ${path} as YAML: ${(err as Error).message}`);
  }

  const result = ConfigSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `- ${i.path.join(".") || "(root)"}: ${i.message}`);
    throw new ConfigError(`Invalid config at ${path}:\n${issues.join("\n")}`);
  }

  return result.data;
}
