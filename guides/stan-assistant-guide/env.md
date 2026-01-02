---
title: 'Environment & Config'
---

# Environment & Config

## Vocabulary (align your reasoning and docs)

- `dotenvToken`: base dotenv filename token (default `.env`).
- `privateToken`: private suffix token (default `local`).
- `env`: selected environment string (e.g. `dev`, `test`).
- `paths`: ordered list of directories to search (later paths override earlier).
- “public” vs “private”: public is `.env*`, private is `.env.<privateToken>*`.
- “config overlay”: values from `getdotenv.config.*` and `getdotenv.config.local.*` layered on top of file-derived dotenv.

## Dotenv cascade (deterministic file naming)

For each path, up to four files are merged in this order (later wins):

1. Public global: `<dotenvToken>` (e.g. `.env`)
2. Public env: `<dotenvToken>.<env>` (e.g. `.env.dev`)
3. Private global: `<dotenvToken>.<privateToken>` (e.g. `.env.local`)
4. Private env: `<dotenvToken>.<env>.<privateToken>` (e.g. `.env.dev.local`)

Missing files are silently ignored.

## Expansion syntax (recursive, with defaults)

Expansion happens recursively in strings:

- `$VAR[:default]`
- `${VAR[:default]}`

Unknown vars become empty string unless a default is provided. Escaped dollar signs (`\$`) remain literal.

Use helpers when you need the exact semantics:

```ts
import { dotenvExpand, dotenvExpandAll } from '@karmaniverous/get-dotenv';
```

## Programmatic API: `getDotenv()`

Use `getDotenv()` when you want “compose an env map” without the CLI host/plugin system.

```ts
import { getDotenv } from '@karmaniverous/get-dotenv';

const env = await getDotenv({
  env: 'dev',
  paths: ['./'],
});
console.log(env.APP_SETTING);
```

Dynamic variables (programmatic) without casts:

```ts
import { defineDynamic, getDotenv } from '@karmaniverous/get-dotenv';

type Vars = { APP_SETTING?: string; ENV_SETTING?: string };

const dynamic = defineDynamic<Vars, { GREETING: (v: Vars) => string }>({
  GREETING: ({ APP_SETTING = '' }) => `Hello ${APP_SETTING}`,
});

const env = await getDotenv<Vars>({ env: 'dev', paths: ['./'], dynamic });
```

## Config files and overlays (host path)

When using the shipped CLI host (or embedding it via `createCli`/`GetDotenvCli`), config discovery + overlays are always active.

### Files discovered (order)

- Packaged (library) root: first matching public config:
  - `getdotenv.config.json|yaml|yml|js|mjs|cjs|ts|mts|cts`
- Project root (your repo):
  - Public: first matching `getdotenv.config.*`
  - Local/private: first matching `getdotenv.config.local.*`

### Allowed top-level config keys

- `rootOptionDefaults?: { ... }` (root CLI defaults; collapsed families). Keys:
  - `env`, `defaultEnv`, `paths`, `dotenvToken`, `privateToken`, `dynamicPath`
  - `shell`, `loadProcess`, `capture`
  - `excludeAll`, `excludeDynamic`, `excludeEnv`, `excludeGlobal`, `excludePrivate`, `excludePublic`
  - `log`, `debug`, `trace`, `strict`
  - `outputPath`
  - `vars`, `varsAssignor`, `varsAssignorPattern`, `varsDelimiter`, `varsDelimiterPattern`
  - `pathsDelimiter`, `pathsDelimiterPattern`
  - `redact`, `redactPatterns`
  - `warnEntropy`, `entropyThreshold`, `entropyMinLength`, `entropyWhitelist`
- `rootOptionVisibility?: { [rootKey]: boolean }`
- `scripts?: Record<string, string | { cmd: string; shell?: string | boolean }>`
- `vars?: Record<string, string>` (global/public vars)
- `envVars?: Record<string, Record<string, string>>` (per-env/public vars)
- `plugins?: Record<string, unknown>` (per-plugin config slices)
- `requiredKeys?: string[]`
- JS/TS only:
  - `dynamic?: Record<string, string | ((vars, env?) => string | undefined)>`
  - `schema?: unknown`

### Overlays and precedence (higher wins)

1. Kind: `dynamic` > `env` > `global`
2. Privacy: `local` > `public`
3. Source: `project` > `packaged` > `base`

### Per-plugin config

The `plugins` map is keyed by the realized mount path (root alias excluded). Examples:

- `plugins.aws`
- `plugins['aws/whoami']`

## Provenance & Auditing

The host ctx includes `ctx.dotenvProvenance` describing the history of every key (descriptor-only).

- `kind: 'file'`: path, scope (global/env), privacy (public/private).
- `kind: 'config'`: scope, privacy, configScope (packaged/project).
- `kind: 'vars'`: explicit CLI/programmatic overrides.
- `kind: 'dynamic'`: `dynamicSource` (config | programmatic | dynamicPath).

Ordering matches overlay precedence (last entry is effective).
