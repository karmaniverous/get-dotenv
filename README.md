![This is how.](./assets/contributions.png)

> Load, expand, and compose environment variables from a deterministic dotenv cascade, then execute commands under that context. Use get‑dotenv as a library, a CLI, or a plugin‑first host to build dotenv‑aware tooling with cross‑platform shell control, CI‑friendly capture, and clear diagnostics.

# get-dotenv

[![npm version](https://img.shields.io/npm/v/@karmaniverous/get-dotenv.svg)](https://www.npmjs.com/package/@karmaniverous/get-dotenv)
![Node Current](https://img.shields.io/node/v/@karmaniverous/get-dotenv)
[![docs](https://img.shields.io/badge/docs-website-blue)](https://docs.karmanivero.us/get-dotenv)
[![changelog](https://img.shields.io/badge/changelog-latest-blue.svg)](./CHANGELOG.md)
[![license](https://img.shields.io/badge/license-BSD--3--Clause-blue.svg)](./LICENSE)

get‑dotenv helps you:

- Load and merge env vars from a deterministic cascade (global/env × public/private) across multiple paths.
- Expand values recursively with defaults.
- Add dynamic variables (JS/TS) that compute from the composed env.
- Run commands with normalized shell behavior and a consistent child environment.
- Compose your own CLI from shipped plugins or your own.

See full guides:

- [Getting started](./guides/getting-started.md)
- [Config and overlays](./guides/config.md) (dynamic, validation, defaults):
- [Shell execution behavior, quoting, capture](./guides/shell.md)
- [Shipped plugins](./guides/shipped/index.md)
- [Authoring plugins](./guides/authoring/index.md) (host, lifecycle, exec, diagnostics)

## Use Cases

- Execute deployment steps across many repositories from one command sequence. See [batch plugin guide](./guides/shipped/batch.md)
- Run config‑driven, environment‑aware operations with simple CLI commands. See [config guide](./guides/config.md)
- Compose a rich CLI from shipped and third‑party plugins and share it across projects. See [shipped plugins overview](./guides/shipped/index.md)
- Drive complex AWS workflows in an authenticated, environment‑aware context. See [aws plugin guide](./guides/shipped/aws.md)
- Scaffold a project config and a host‑based CLI skeleton in seconds. See [init plugin guide](./guides/shipped/init.md)
- Batch lint/build/test across a monorepo with deterministic output. See [batch plugin guide](./guides/shipped/batch.md)
- Run cross‑platform commands in CI with normalized shells and capture. See [shell guide](./guides/shell.md)
- Programmatically compose env and run tools inside Node scripts. See [Getting started](./guides/getting-started.md)
- Add observability without leaking secrets using trace, redaction, and entropy warnings. See [diagnostics guide](./guides/authoring/diagnostics.md)
- Author new plugins with maximum DX and minimal boilerplate. See [authoring plugins guide](./guides/authoring/index.md)

## Requirements

- Node.js ≥ 20 (this repository pins 22.19.0 for CI/reproducibility)

## Installation

```bash
npm install @karmaniverous/get-dotenv
```

## Quick Start

Run a one‑off command with your env (parent alias so flags apply to getdotenv):

```bash
npx @karmaniverous/get-dotenv -c 'node -e "console.log(process.env.APP_SETTING ?? \"\")"'
```

Load programmatically:

```ts
import { getDotenv } from '@karmaniverous/get-dotenv';

const vars = await getDotenv({ env: 'dev', paths: ['./'] });
console.log(vars.APP_SETTING);
```

Embed a CLI quickly (shipped plugins wired for you):

```ts
#!/usr/bin/env node
import { createCli } from '@karmaniverous/get-dotenv/cli';

await createCli({ alias: 'toolbox' })();
```

More first steps and tips at [Getting Started](./guides/getting-started.md)

## Configuration & overlays

Author config in JSON/YAML/JS/TS at your project root. The loader is always on in the shipped host:

- Data: `vars` (global), `envVars` (per‑env)
- Root defaults and visibility for CLI flags: `rootOptionDefaults`, `rootOptionVisibility`
- Optional scripts table: `scripts`
- Dynamic (JS/TS only): `dynamic`
- Validation (JS/TS schema or required keys): `schema`, `requiredKeys`

Overlays apply by kind/env/privacy/source with clear precedence. Details and examples in the [Config guide](./guides/config.md).

## Dynamic variables (JS/TS)

Add dynamic keys that compute from the composed env. Programmatic or file‑based (JS/TS). For TypeScript, install `esbuild` for auto‑compile.

```ts
// dynamic.ts
export default {
  GREETING: ({ APP_SETTING = '' }) => `Hello ${APP_SETTING}`,
};
```

Learn more in the [Config guide formats section](./guides/config.md#formats).

## CLI basics

The shipped CLI is plugin‑first:

- Execute commands within your dotenv context using the `cmd` subcommand or the parent alias:
  - `getdotenv cmd ...` or `getdotenv -c 'echo $APP_SETTING'`
  - Quoting, alias conflicts, expansion behavior. [More info...](./guides/shipped/cmd.md)
- Normalize shell behavior across platforms; use `--shell` (default OS shell) or `--shell-off`, and enable capture for CI:
  - [Shell guide](./guides/shell.md)
- Execute across multiple working directories with the [`batch` plugin][guides/shipped/batch.md](./guides/shipped/batch.md)

## Diagnostics (trace, capture, redact, entropy)

- `--trace [keys...]` prints per‑key origin (dotenv | parent | unset) before spawning.
- Deterministic output for CI: set `GETDOTENV_STDIO=pipe` or pass `--capture`.
- Presentation‑time redaction for secret‑like keys: `--redact` / `--redact-off` (+ `--redact-pattern` for additional key matches).
- Optional entropy warnings (length/printable/threshold gated) for likely secrets in logs/trace.

Learn more:

- [Shell & capture](./guides/shell.md)
- [Authoring diagnostics](./guides/authoring/diagnostics.md) (redaction & entropy)

## Shipped plugins

- [cmd](./guides/shipped/cmd.md) — execute a command (with parent alias)
- [batch](./guides/shipped/batch.md) — run a command across multiple working directories
- [aws](./guides/shipped/aws.md) — establish a session and optionally forward to AWS CLI
- [init](./guides/shipped/init.md) — scaffold config files and a host‑based CLI skeleton

Also see the [shipped plugins overview](./guides/shipped/index.md).

## Authoring your own CLI & plugins

The host resolves dotenv context once per invocation, overlays config, validates, and then runs plugins with a typed options bag.

- [Lifecycle & wiring](./guides/authoring/lifecycle.md)
- [Executing shell commands](./guides/authoring/exec.md) from plugins
- [Config & validation](./guides/authoring/config.md) for plugins

## API Reference

[Typed API docs](https://docs.karmanivero.us/get-dotenv) are built with TypeDoc.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md)

## License

BSD‑3‑Clause — see [LICENSE](./LICENSE)

---

Built for you with ❤️ on Bali! Find more great tools & templates on [my GitHub Profile](https://github.com/karmaniverous).
