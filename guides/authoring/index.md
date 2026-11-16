---
title: Authoring Plugins
children:
  - ./lifecycle.md
  - ./config.md
  - ./diagnostics.md
  - ./exec.md
  - ./subcommands.md
  - ./qualified-names.md
  - ./packaging.md
---

## Authoring Plugins

This section introduces the plugin‑first host and groups plugin documentation by topic. The host resolves dotenv context once per invocation, overlays config (JSON/YAML/JS/TS), validates, and then runs plugins and subcommands under that context.

- [Lifecycle & Wiring](./lifecycle.md) - Covers defining and wiring plugins against the host.
- [Config & Validation](./config.md) - Explains config overlays, interpolation timing, and validation.
- [Diagnostics & Errors](./diagnostics.md) - Covers error handling, capture, and optional trace/redaction.
- [Executing Shell Commands](./exec.md) - A focused deep dive for subprocesses across plugins.
- [Subcommands & Resolvers](./subcommands.md) - Patterns for complex plugins with per-command options.
- [Qualified Names](./qualified-names.md) - How every long option gets a qualified name, the reserved `<alias>-` prefix, collisions, terminators, choosing a nested CLI's alias, and a known limitation.
- [Packaging](./packaging.md) - Ship a plugin package with get-dotenv as an optional peer: the `./get-dotenv` subpath, local types, `zod`, and a bin launcher with an install hint.

Upgrading a 7.x plugin or host? See [Migrating to 8.0](../migrating-to-8.md#for-plugin-and-host-authors).
