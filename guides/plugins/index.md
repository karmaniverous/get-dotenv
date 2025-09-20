---
title: Plugins
children:
  - ./aws.md
  - ./batch.md
  - ./cmd.md
  - ./init.md
  - ./demo.md
---

# Plugins

This section documents the plugins shipped with the get‑dotenv CLI:

- [AWS](./aws.md) - Resolve profile/region and acquire credentials; mirrors to
  process.env and ctx; includes an `aws` subcommand for session and forwarding.
- [Batch](./batch.md) - Execute a command across multiple working directories
  under the current dotenv context.
- [Cmd](./cmd.md) - Execute a single command under the current dotenv context;
  includes a convenient parent‑level `--cmd` alias.
- [Init](./init.md) - Scaffold config files and a host‑based CLI skeleton with
  safe collision flow (interactive and CI heuristics).
- [Demo](./demo.md) - Educational plugin showing context access, child exec with
  explicit env injection, and scripts/shell resolution.

