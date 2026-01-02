---
title: 'Shipped Plugins'
---

# Shipped Plugins: what to know

- `cmd`: executes a command under ctx; provides parent alias `-c, --cmd <command...>`; detects conflict when both alias and explicit subcommand are used.
- `batch`: discovers directories by globs and runs a command sequentially; honors `--list` and `--ignore-errors`.
- `aws`: establishes a session once per invocation and writes AWS env vars to `process.env`; publishes minimal metadata under `ctx.plugins.aws`; supports `strategy: none`.
- `init`: scaffolds config files and a CLI skeleton; collision handling supports overwrite/example/skip plus CI heuristics.

## Interop contracts

### Nested composition

Compose child plugins under `awsPlugin()` if they need AWS auth.

```ts
compose: (p) => p.use(awsPlugin().use(secretsPlugin())),
```

### Stable `ctx.plugins.*` shapes

- `ctx.plugins.aws`: `{ profile?, region? }`. Credentials are NOT mirrored here (use `process.env`).
- Other plugins do not currently publish stable `ctx.plugins` entries.

### Dotenv editor “winner path”

If your plugin edits dotenv files, prefer `editDotenvFile(...)` with default reverse search order. Avoid writing to all paths unless explicitly requested.

### AWS X-Ray SDK

Guard import of X-Ray SDKs; only enable when `AWS_XRAY_DAEMON_ADDRESS` is set or explicitly requested.
