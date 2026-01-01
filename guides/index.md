---
title: Guides
children:
  - ./getting-started.md
  - ./cascade.md
  - ./dotenv-editor.md
  - ./provenance.md
  - ./shell.md
  - ./config.md
  - ./authoring/index.md
  - ./shipped/index.md
---

# Guides

This section collects practical guides for using `get-dotenv`. Start here:

- [Getting Started](./getting-started.md) - Fast on‑ramps for CLI, programmatic API, embedding, and scaffolding.
- [Cascade and precedence](./cascade.md) - How variables load and merge across paths and public/private/env axes.
- [Dotenv editor](./dotenv-editor.md) - Format-preserving dotenv edits and deterministic target selection across `paths`.
- [Provenance & Auditing](./provenance.md) - Trace the origin of environment variables (files, config, dynamic) for debugging and auditing.
- [Shell execution behavior](./shell.md) - How commands run cross‑platform; quoting rules, default shells, and capture tips.
- [Config files and overlays](./config.md) - Author JSON/YAML/JS/TS config and apply privacy/source overlays (always‑on).
- [Authoring Plugins](./authoring/index.md) - Compose CLIs with once‑per‑invoke dotenv context and plugin lifecycles.
- [Shipped Plugins](./shipped/index.md) - The get‑dotenv host ships a small set of plugins that cover needs.
