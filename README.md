# Dinosteer

An MCP server that lets AI agents interact with multiple [Pterodactyl](https://pterodactyl.io/)
(and Hydrodactyl-family) panel instances — files, console, backups, databases, schedules, subusers (Client API), and
panel-wide administration (Application API), across as many named panels as you configure.

## Install & build

Requires Node.js 20+ to run (22.12+ to run the test suite).

```bash
npm install
npm run build
```

## Develop & test

```bash
npm run dev        # run from source with tsx
npm run typecheck
npm test           # vitest
```

After pulling changes, re-run `npm run build` and restart your MCP client so it picks up the new
`dist/` build.

## Configure

Copy `dinosteer.config.example.yaml` to `dinosteer.config.yaml` (or any path) and fill
in your panels. `${VAR_NAME}` placeholders are interpolated from environment variables at startup,
so you can keep real API keys in your shell/secret manager instead of the file:

```yaml
defaultPanel: prismnodes
panels:
  - name: prismnodes
    baseUrl: https://panel.prismnodes.net
    clientApiKey: "${PRISMNODES_CLIENT_KEY}"
    applicationApiKey: "${PRISMNODES_APP_KEY}"   # optional — enables admin_* tools for this panel
  - name: starnova
    baseUrl: https://panel.starnova.gg
    flavor: hydrodactyl                            # Hydrodactyl or a fork of it (e.g. Novadactyl)
    clientApiKey: "${STARNOVA_CLIENT_KEY}"
```

`flavor` defaults to `pterodactyl`. Set it to `hydrodactyl` for Hydrodactyl and its forks: Hydrodactyl
serves server routes at `/api/client/servers/{wings|elytra|calagopus}/{id}/...`, so dinosteer looks up
each server's daemon type once and rewrites paths automatically. Every tool works on both flavors;
the `[Hydrodactyl]` tools below only work on `flavor: hydrodactyl` panels.

Config file resolution order: `--config <path>` → `DINOSTEER_CONFIG` env var →
`./dinosteer.config.yaml` → `~/.config/dinosteer/config.yaml`.

Each panel needs a **Client API key** (per-account, from a panel user's account settings) and/or
an **Application API key** (admin-only, from the panel's admin settings). A panel without an
application key simply won't expose the `admin_*` tools for that panel.

## Run with Claude Code / Claude Desktop

Point your MCP client at the built entrypoint, e.g. in Claude Code:

```bash
claude mcp add dinosteer -- node /path/to/dinosteer/dist/index.js --config /path/to/dinosteer.config.yaml
```

Or in a `.mcp.json` / Claude Desktop config:

```json
{
  "mcpServers": {
    "dinosteer": {
      "command": "node",
      "args": ["/path/to/dinosteer/dist/index.js", "--config", "/path/to/dinosteer.config.yaml"]
    }
  }
}
```

## Tool groups

Every tool takes a `panel` argument (the configured panel name; omit it if you set `defaultPanel`
or only have one panel). Destructive/high-privilege tools additionally require `confirm: true` —
calling them without it returns an error explaining what would happen, rather than acting.

- **Servers**: `list_servers`, `get_server`, `get_server_resources`, `send_power_action`,
  `get_server_startup`, `update_startup_variable`, `reinstall_server`, `rename_server`,
  `set_docker_image`, `get_server_activity`
- **Files**: `list_files`, `read_file`, `download_file_url`, `write_file`, `rename_file`,
  `copy_file`, `compress_files`, `decompress_file`, `delete_files`, `create_folder`,
  `upload_file_url`, `chmod_files`, `pull_remote_file`
- **Console**: `send_console_command`, `read_console` — connect to the server's live websocket,
  optionally send a command, and capture buffered output for a short window
- **Backups**: `list_backups`, `get_backup`, `create_backup`, `download_backup_url`,
  `restore_backup`, `delete_backup`, `toggle_backup_lock`
- **Databases**: `list_databases`, `create_database`, `rotate_database_password`,
  `delete_database`
- **Schedules**: `list_schedules`, `get_schedule`, `create_schedule`, `update_schedule`,
  `delete_schedule`, `execute_schedule`, `create_schedule_task`, `update_schedule_task`,
  `delete_schedule_task`
- **Network**: `list_allocations`, `assign_allocation`, `set_allocation_notes`,
  `set_primary_allocation`, `unassign_allocation`
- **Subusers**: `list_subusers`, `invite_subuser`, `update_subuser`, `remove_subuser`
- **Account**: `get_account`, `get_account_activity`, `list_api_keys`, `create_api_key`,
  `delete_api_key`, `list_ssh_keys`, `add_ssh_key`, `remove_ssh_key`
- **Admin — Servers** (`applicationApiKey` required): `admin_list_servers`, `admin_get_server`,
  `admin_create_server`, `admin_update_server_build`, `admin_update_server_details`,
  `admin_suspend_server`, `admin_unsuspend_server`, `admin_delete_server`,
  `admin_get_server_by_external_id`, `admin_update_server_startup`, `admin_reinstall_server`,
  `admin_list_server_databases`, `admin_create_server_database`,
  `admin_reset_server_database_password`, `admin_delete_server_database`
- **Admin — Users**: `admin_list_users`, `admin_get_user`, `admin_create_user`,
  `admin_update_user`, `admin_delete_user`, `admin_get_user_by_external_id`
- **Admin — Nodes**: `admin_list_nodes`, `admin_get_node`, `admin_get_node_configuration`,
  `admin_create_node`, `admin_update_node`, `admin_delete_node`, `admin_list_node_allocations`,
  `admin_create_node_allocations`, `admin_delete_node_allocation`, `admin_list_deployable_nodes`
- **Admin — Locations**: `admin_list_locations`, `admin_create_location`,
  `admin_update_location`, `admin_delete_location`
- **Admin — Nests/Eggs**: `admin_list_nests`, `admin_get_nest`, `admin_list_eggs`, `admin_get_egg`
- **[Hydrodactyl] Servers**: `get_resource_history`, `get_subdomain`, `check_subdomain_availability`,
  `set_subdomain`, `delete_subdomain`, `set_server_webhook`, `update_startup_command`,
  `get_default_startup_command`, `process_startup_command`, `revert_docker_image`, `set_server_egg`,
  `preview_egg_change`, `apply_egg_change`, `list_server_operations`, `get_server_operation`
- **[Hydrodactyl] Backups & jobs**: `rename_backup`, `bulk_delete_backups`, `delete_all_backups`,
  `list_jobs`, `get_job`, `create_job`, `cancel_job` (jobs, operations, rename and bulk delete need
  an Elytra or Calagopus node; Wings nodes return an error)
- **[Hydrodactyl] Marketplace** (Minecraft mods/plugins): `marketplace_search`,
  `marketplace_get_project`, `marketplace_resolve`, `marketplace_list_installed`,
  `marketplace_record_install`, `marketplace_remove_install`, `marketplace_list_loaders`,
  `marketplace_list_game_versions`
- **[Hydrodactyl] Panel**: `get_panel_version`, `list_nests`, `get_nest`, `list_server_groups`,
  `create_server_group`, `update_server_group`, `delete_server_group`, `add_servers_to_group`,
  `remove_servers_from_group`, `reorder_server_groups`, `admin_get_panel_status`

More endpoints (2FA management, email/password changes, database-host admin) can be added later
following the same per-resource module pattern under `src/tools/`.

## Security notes

- Never commit a config file with literal API keys — use `${VAR}` interpolation and keep secrets
  in your shell/secret manager. `dinosteer.config.yaml` is gitignored by default.
- Grant each panel only the API key surface you actually want exposed: omit `applicationApiKey`
  on panels where admin-level tools shouldn't be available.
- Logs go to stderr only (required for stdio transport) and redact API key material automatically.

- Keep dependencies patched: run `npm audit` and act on the repository's Dependabot alerts.

## Troubleshooting

- **401/403 errors**: check the relevant API key's scope/permissions on that panel.
- **"panel has no application API key configured"**: add `applicationApiKey` to that panel's
  config entry, or avoid calling `admin_*` tools against it.
- **404s on every server tool against a Hydrodactyl/Novadactyl panel**: set `flavor: hydrodactyl` on
  that panel. A `400` mentioning a daemon type mismatch means the cached daemon type is stale (e.g. the
  server moved nodes); restart dinosteer.
- **`[Hydrodactyl]` tool says it needs a Hydrodactyl panel**: that panel is configured (or defaulted) as
  `pterodactyl`.
- **Console tool hangs or times out**: the node hosting that server may be unreachable, or the
  websocket auth token expired — retry; connection has a 5s timeout and each call auto-closes the
  socket afterward.
