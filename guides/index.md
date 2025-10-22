---
title: Guides
children:
  - ./cascade.md
  - ./shell.md
  - ./config.md
  - ./plugins/index.md
  - ./generated-cli.md
---

# Guides

This section collects practical guides for using get-dotenv. Start here:

- [Cascade and precedence](./cascade.md) - How variables load and merge across
  paths and public/private/env axes.
- [Shell execution behavior](./shell.md) - How commands run cross‑platform;
  quoting rules, default shells, and capture tips.
- [Config files and overlays](./config.md) - Author JSON/YAML/JS/TS config and
  apply privacy/source overlays (always‑on).
- [Plugin-first host](./plugins/index.md) - Compose CLIs with once‑per‑invoke dotenv
  context and plugin lifecycles.
- [Generated CLI](./generated-cli.md) - Deprecated in favor of plugin-first host. A thin, fixed command surface powered by get‑dotenv; when and how to use it.
