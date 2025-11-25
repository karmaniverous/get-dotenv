---
title: Plugins
children:
  - ./authoring-lifecycle.md
  - ./authoring-config.md
  - ./authoring-diagnostics.md
  - ./exec.md
  - ./shipped/index.md
---

# Plugins

This section introduces the plugin‑first host and groups plugin documentation by topic. The host resolves dotenv context once per invocation, overlays config (JSON/YAML/JS/TS), validates, and then runs plugins and subcommands under that context.

- Authoring lifecycle covers defining and wiring plugins against the host.
- Authoring config explains config overlays, interpolation timing, and validation.
- Authoring diagnostics covers error handling, capture, and optional trace/redaction.
- Executing shell commands is a focused deep dive for subprocesses across plugins.
- Shipped plugins documents the built‑ins (AWS, batch, cmd, init, demo).

See also:

- Config files and overlays: ../config.md
- Shell execution behavior and quoting: ../shell.md
