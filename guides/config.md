---
title: Config files and overlays
---

# Config files and overlays (always-on)

The config loader lets you specify environment values using JSON/YAML or JS/TS config files, then overlay them deterministically with privacy and source precedence.

Behavior: In the shipped CLI (plugin-first host) and the generator path, the loader/overlay pipeline is always active and is a no-op when no config files are present.

## Discovery order

When enabled, the loader discovers up to three configs in the following order:

1. Packaged root (the library’s own package root, “public” only)
   - getdotenv.config.json
   - getdotenv.config.yaml / .yml
   - getdotenv.config.js / .mjs / .cjs
   - getdotenv.config.ts / .mts / .cts
2. Project root (your repository)
   - Public:
     - getdotenv.config.json
     - getdotenv.config.yaml / .yml
     - getdotenv.config.js / .mjs / .cjs
     - getdotenv.config.ts / .mts / .cts
   - Local (private, gitignored conventionally):
     - getdotenv.config.local.json
     - getdotenv.config.local.yaml / .yml
     - getdotenv.config.local.js / .mjs / .cjs
     - getdotenv.config.local.ts / .mts / .cts

Notes:

- Packaged .local is not expected by policy and is ignored.
- The first matching “public” file per scope is used; the same for “local”.

## Formats

JSON/YAML (data only, always-on; no-op when no files are present):

- Allowed keys:
  - rootOptionDefaults?: Partial<RootOptionsShape> — collapsed, CLI‑like flags and strings (families, singles). Prefer this to set help‑time/runtime defaults for root options.
  - rootOptionVisibility?: Partial<Record<keyof RootOptionsShape, boolean>> — help‑time visibility (false hides a flag).
  - scripts?: Record<string, string | { cmd: string; shell?: string | boolean }>
  - vars?: Record<string, string> (global, public)
  - envVars?: Record<string, Record<string, string>> (per‑env, public)
  - plugins?: Record<string, unknown>
  - requiredKeys?: string[]
- Disallowed in JSON/YAML (this step): dynamic and schema — use JS/TS instead.

JS/TS (data + dynamic):

- Accepts all JSON/YAML keys and also:
  - dynamic?: GetDotenvDynamic — a map where values are either strings or functions of the form (vars: ProcessEnv, env?: string) => string | undefined.
  - schema?: unknown — a schema object (e.g., a Zod schema) whose safeParse(finalEnv) will be executed once after overlays.

TS support:

- Direct import works if a TS loader is present.
- Otherwise, the loader auto-bundles via esbuild when available; if esbuild is not present, it falls back to a simple TypeScript transpile for single-file modules without imports.

### Top‑level restrictions (clean contract; JSON/YAML)

- Operational root flags must live under rootOptionDefaults. Do not place root toggles (e.g., env, shell, loadProcess, log, exclude\*, trace, strict, redact family, entropy family, splitters) at the top level in JSON/YAML. Put them under rootOptionDefaults to control both help‑time labels and runtime defaults.
- scripts belongs at the top level only. Do not nest scripts inside rootOptionDefaults.
- dynamic and schema are JS/TS‑only. JSON/YAML loader rejects them.

## Privacy

Config privacy derives from the filename suffix:

- Public: getdotenv.config.json / .yaml / .yml (shared in VCS).
- Local: getdotenv.config.local.json / .yaml / .yml (gitignored).

## Overlays and precedence

The loader overlays config-provided values onto the “base” file-derived dotenv values using these axes (higher wins):

1. Kind: dynamic > env > global
2. Privacy: local > public
3. Source: project > packaged > base

The overlay flow:

1. Base: resolve file cascade using getDotenv (exclude dynamic; ignore programmatic vars).
2. Overlay config sources in order: packaged (public only) → project public → project local.
3. Apply dynamic in order: programmatic dynamic (if provided) → config dynamic from JS/TS (packaged → project public → project local) → file dynamicPath (lowest dynamic tier).
4. Optional effects: outputPath (write consolidated dotenv; quote multiline), log (print final map), loadProcess (merge into process.env).

## Interpolation and expansion model

There are three distinct expansion stages:

- Root option parse-time expansion (CLI only): selected root option values (for example `--env`, `--vars`, `--output-path`, `--dotenv-token`, `--private-token`, `--dynamic-path`, `--paths`) are dotenv-expanded once against `process.env` via an option parser; they do not see `{ ...ctx.dotenv }`.
- Dotenv/config composition expansion (host): dotenv values from files and config overlays are expanded progressively during composition; later keys can reference earlier ones.
- Per-plugin interpolation: before validation and `afterResolve`, the host deep-interpolates each plugin’s config slice (string leaves only) once against `{ ...ctx.dotenv, ...process.env }` (process.env wins).

Notes:

- `getDotenv()` (programmatic API) expands `outputPath` against the composed variables (it can reference other dotenv keys). In the CLI, argv-provided values (like `--output-path`) are expanded against `process.env` at parse time, but values coming from `rootOptionDefaults` are not automatically expanded.

## Validation (requiredKeys, schema, and --strict)

You can validate the final composed environment via config:

- JSON/YAML: requiredKeys?: string[] — each key must be present (value !== undefined) in the final env.
- JS/TS: schema?: { safeParse(finalEnv) } (e.g., a Zod schema).

Behavior:

- Validation runs once against the composed env (host/generator paths), after overlays and dynamic variables are applied.
- By default, issues are printed as warnings. Set --strict (or strict: true in options) to fail with a non‑zero exit when issues are detected.

Examples:

```yaml
# getdotenv.config.yaml
requiredKeys:
  - APP_SETTING
  - ENV_SETTING
```

```ts
// getdotenv.config.ts
import { z } from 'zod';
export default {
  schema: z.object({
    APP_SETTING: z.string().min(1),
    ENV_SETTING: z.string().optional(),
  }),
};
```

## Plugin config

Plugin configuration is discovered under `plugins.<mount-path>` in the same packaged/project public/local files. The host merges slices by precedence (packaged → project/public → project/local) and deep‑interpolates string leaves once against `{ ...ctx.dotenv, ...process.env }` (process.env wins for plugin slices). Plugins read their own validated slice via the instance‑bound helper `plugin.readConfig(cli)`.

Location and shape:

```json
{
  "plugins": {
    "batch": {
      "scripts": {
        "build": { "cmd": "npm run build", "shell": "/bin/bash" }
      },
      "shell": false
    }
  }
}
```

Precedence and timing:

- Source/Privacy: project/local > project/public > packaged.
- Strings are interpolated once just before validation/afterResolve; later consumers (e.g., dynamic help callbacks) receive the already‑interpolated value. Prefer the plugin‑bound helper createPluginDynamicOption(cli, ...) to surface effective defaults in help text without by‑id lookups.

## Compile‑time key preservation (overlayEnv)

For compile‑time DX, overlayEnv preserves the key set:

- Without programmaticVars, the result is typed as your base B.
- With programmaticVars, the result is typed as B & P.

```ts
import { overlayEnv } from '@karmaniverous/get-dotenv/env/overlay';

const base = { A: 'a' };
const out = overlayEnv({
  base,
  env: 'dev',
  configs: {},
  programmaticVars: { B: 'b' },
});
// out is typed as { A?: string } & { B?: string } at compile time
```

## Diagnostics (redaction and entropy)

Presentation‑only diagnostics help audit values without altering runtime behavior:

- Redaction (--redact): masks secret‑like keys (default patterns include SECRET, TOKEN, PASSWORD, API_KEY, KEY) in -l/--log and --trace outputs; allow custom patterns via --redact-pattern.
- Entropy warnings (on by default):
  - Once‑per‑key messages when printable strings of length ≥ 16 exceed bits/char threshold (default 3.8).
  - Surfaces: --trace and -l/--log.
  - Whitelist patterns supported.

## Scripts table (optional)

You can define a scripts table in config. Script strings are resolved by the `cmd` and `batch` commands. If you want a named script to inherit the root shell behavior, use the string form; the object form `{ cmd, shell }` uses `shell` as the effective shell for that entry (and when omitted, the script currently runs with shell-off rather than inheriting the root shell):

```json
{
  "scripts": {
    "bash-only": { "cmd": "echo $SHELL && echo OK", "shell": "/bin/bash" },
    "plain": { "cmd": "node -v", "shell": false }
  }
}
```

Then:

```bash
getdotenv cmd bash-only
getdotenv cmd plain
```

For help‑time visibility of root flags (e.g., hiding `--capture` or an entire family like `--shell`/`--shell-off`), set `rootOptionVisibility` in JSON/YAML/JS/TS config. Precedence matches root defaults: createCli < packaged/public < project/public < project/local.