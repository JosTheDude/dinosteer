# pterodactyl-mcp

An MCP server that lets AI agents interact with multiple [Pterodactyl](https://pterodactyl.io/)
panel instances — files, console, backups, databases, schedules, subusers (Client API), and
panel-wide administration (Application API), across as many named panels as you configure.

## Install & build

```bash
npm install
npm run build
```

## Configure

Copy `pterodactyl-mcp.config.example.yaml` to `pterodactyl-mcp.config.yaml` (or any path) and fill
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
    clientApiKey: "${STARNOVA_CLIENT_KEY}"
```

Config file resolution order: `--config <path>` → `PTERODACTYL_MCP_CONFIG` env var →
`./pterodactyl-mcp.config.yaml` → `~/.config/pterodactyl-mcp/config.yaml`.

Each panel needs a **Client API key** (per-account, from a panel user's account settings) and/or
an **Application API key** (admin-only, from the panel's admin settings). A panel without an
application key simply won't expose the `admin_*` tools for that panel.

## Run with Claude Code / Claude Desktop

Point your MCP client at the built entrypoint, e.g. in Claude Code:

```bash
claude mcp add pterodactyl -- node /path/to/pterodactyl-mcp/dist/index.js --config /path/to/pterodactyl-mcp.config.yaml
```

Or in a `.mcp.json` / Claude Desktop config:

```json
{
  "mcpServers": {
    "pterodactyl": {
      "command": "node",
      "args": ["/path/to/pterodactyl-mcp/dist/index.js", "--config", "/path/to/pterodactyl-mcp.config.yaml"]
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
  `set_docker_image`
- **Files**: `list_files`, `read_file`, `download_file_url`, `write_file`, `rename_file`,
  `copy_file`, `compress_files`, `decompress_file`, `delete_files`, `create_folder`,
  `upload_file_url`
- **Console**: `send_console_command`, `read_console` — connect to the server's live websocket,
  optionally send a command, and capture buffered output for a short window
- **Backups**: `list_backups`, `get_backup`, `create_backup`, `download_backup_url`,
  `restore_backup`, `delete_backup`
- **Databases**: `list_databases`, `create_database`, `rotate_database_password`,
  `delete_database`
- **Schedules**: `list_schedules`, `get_schedule`, `create_schedule`, `update_schedule`,
  `delete_schedule`, `create_schedule_task`, `delete_schedule_task`
- **Network**: `list_allocations`, `assign_allocation`, `set_allocation_notes`,
  `set_primary_allocation`, `unassign_allocation`
- **Subusers**: `list_subusers`, `invite_subuser`, `update_subuser`, `remove_subuser`
- **Admin — Servers** (`applicationApiKey` required): `admin_list_servers`, `admin_get_server`,
  `admin_create_server`, `admin_update_server_build`, `admin_update_server_details`,
  `admin_suspend_server`, `admin_unsuspend_server`, `admin_delete_server`
- **Admin — Users**: `admin_list_users`, `admin_get_user`, `admin_create_user`,
  `admin_update_user`, `admin_delete_user`
- **Admin — Nodes**: `admin_list_nodes`, `admin_get_node`, `admin_get_node_configuration`,
  `admin_create_node`, `admin_update_node`, `admin_delete_node`, `admin_list_node_allocations`,
  `admin_create_node_allocations`
- **Admin — Locations**: `admin_list_locations`, `admin_create_location`,
  `admin_update_location`, `admin_delete_location`
- **Admin — Nests/Eggs**: `admin_list_nests`, `admin_get_nest`, `admin_list_eggs`, `admin_get_egg`

More endpoints (2FA management, self-service API keys, database-host admin) can be added later
following the same per-resource module pattern under `src/tools/`.

## Security notes

- Never commit a config file with literal API keys — use `${VAR}` interpolation and keep secrets
  in your shell/secret manager. `pterodactyl-mcp.config.yaml` is gitignored by default.
- Grant each panel only the API key surface you actually want exposed: omit `applicationApiKey`
  on panels where admin-level tools shouldn't be available.
- Logs go to stderr only (required for stdio transport) and redact API key material automatically.

## Troubleshooting

- **401/403 errors**: check the relevant API key's scope/permissions on that panel.
- **"panel has no application API key configured"**: add `applicationApiKey` to that panel's
  config entry, or avoid calling `admin_*` tools against it.
- **Console tool hangs or times out**: the node hosting that server may be unreachable, or the
  websocket auth token expired — retry; connection has a 5s timeout and each call auto-closes the
  socket afterward.
