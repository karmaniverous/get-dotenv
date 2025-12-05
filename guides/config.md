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
  - dotenvToken?: string
  - privateToken?: string
  - paths?: string | string[]
  - loadProcess?: boolean
  - log?: boolean
  - shell?: string | boolean
  - scripts?: Record<string, unknown>
  - vars?: Record<string, string> (global, public)
  - envVars?: Record<string, Record<string, string>> (per-env, public)
- Disallowed in JSON/YAML (this step): dynamic — use JS/TS instead.

JS/TS (data + dynamic):

- Accepts all JSON/YAML keys and also:
  - dynamic?: GetDotenvDynamic — a map where values are either strings or functions of the form (vars: ProcessEnv, env?: string) => string | undefined.
  - schema?: unknown — a schema object (e.g., a Zod schema) whose safeParse(finalEnv) will be executed once after overlays.

TS support and `defineGetDotenvConfig`:

Use the helper to get type inference for `vars`, `envVars`, and `dynamic` keys:

```ts
import { defineGetDotenvConfig } from '@karmaniverous/get-dotenv';

export default defineGetDotenvConfig({
  vars: { APP_PORT: '3000' },
  dynamic: {
    URL: ({ APP_PORT }) => `http://localhost:${APP_PORT}`, // inferred keys!
  },
});
```

Loader behavior:
- Direct import works if a TS loader is present.
- Otherwise, auto-bundles via esbuild (if available) or falls back to simple transpile.

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

## Interpolation model (Phase C and per‑plugin)

After dotenv files and config overlays are composed, a final interpolation pass resolves remaining string options using the composed env:

- Phase C (host/generator paths): interpolate remaining string options (e.g., outputPath) against { ...process.env, ...ctx.dotenv }. Precedence: ctx wins over parent process.env.
- Per‑plugin interpolation: immediately before a plugin’s afterResolve, the host interpolates that plugin’s config slice against { ...ctx.dotenv, ...process.env }. Precedence: parent process.env wins over ctx for per‑plugin slices so upstream runtime adjustments (e.g., AWS creds) are visible to children.

Notes:

- Bootstrap keys are excluded from Phase C (dotenvToken, privateToken, env/defaultEnv, paths/vars and their splitters, exclude\*, loadProcess, log, shell, dynamicPath).
- Interpolation is progressive within a slice; later values can reference earlier results.

## Validation (requiredKeys, schema, and --strict)

You can validate the final composed environment via config:

- JSON/YAML: requiredKeys?: string[] — each key must be present (value !== undefined) in the final env.
- JS/TS: schema?: { safeParse(finalEnv) } (e.g., a Zod schema).

Behavior:

- Validation runs once against the composed env (host/generator paths), after overlays and Phase C interpolation.
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

Plugin configuration is discovered under plugins.<id> in the same packaged/project public/local files. The host merges slices by precedence (packaged → project/public → project/local) and deep‑interpolates string leaves once against { ...ctx.dotenv, ...process.env } (process.env wins for plugin slices). Plugins read their own validated slice via the instance‑bound helper plugin.readConfig(cli).

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

You can define a scripts table in config and optionally override shell behavior per script. Script strings are resolved by the cmd and batch commands:

```json
{
  "scripts": {
    "bash-only": { "cmd": "echo $SHELL && echo OK", "shell": "/bin/bash" },
    "plain": { "cmd": "node -v", "shell": false }
  }
}
```

When a script is invoked, scripts[name].shell (string or boolean) overrides the global shell for that script.

## Example

Project files:

```yaml
# getdotenv.config.yaml (public)
vars:
  FOO: 'foo'
envVars:
  dev:
    ENV_SETTING: 'dev_value'
```

```yaml
# getdotenv.config.local.yml (private)
vars:
  SECRET: 's3cr3t'
```

JS/TS dynamic (optional):

```ts
// getdotenv.config.ts
export default {
  dynamic: {
    BOTH: ({ FOO = '', ENV_SETTING = '' }) => `${FOO}-${ENV_SETTING}`,
  },
};
```

With --use-config-loader (or { useConfigLoader: true } on the host), the final map for env=dev overlays global public (FOO) → env public (ENV_SETTING) → global local (SECRET) → dynamic from config (BOTH):

```
{ FOO: "foo", ENV_SETTING: "dev_value", SECRET: "s3cr3t", BOTH: "foo-dev_value" }
```
