---
title: STAN assistant guide
children:
  - ./env.md
  - ./editing.md
  - ./cli.md
  - ./authoring.md
  - ./plugins.md
---

# STAN assistant guide: @karmaniverous/get-dotenv

This is a compact, self-contained guide for STAN assistants to use `@karmaniverous/get-dotenv` effectively (library + CLI host + plugins) without consulting type definition files or other project documentation.

## What this library does (mental model)

`get-dotenv` composes an environment (`ProcessEnv`) from multiple sources deterministically, expands references recursively, optionally applies dynamic variables, and then lets you (a) use the final map programmatically, (b) run commands under it via a cross-platform CLI, or (c) build your own plugin-based CLI host that resolves env once per invocation.

Key idea: treat the “resolved dotenv context” (`ctx.dotenv`) as the source of truth, and do not rely on `process.env` being mutated unless you explicitly enable it.

## Install + import rules

- Node: >= 20
- Package is ESM-only (CommonJS must use dynamic `import()`).
- Recommended imports (public API):
  - Programmatic core: `import { getDotenv } from '@karmaniverous/get-dotenv'`
  - CLI factory (shipped plugins): `import { createCli } from '@karmaniverous/get-dotenv/cli'`
  - CLI host + plugin authoring: `import { GetDotenvCli, definePlugin } from '@karmaniverous/get-dotenv/cliHost'`
  - Shipped plugins: `import { cmdPlugin, batchPlugin, awsPlugin, awsWhoamiPlugin, initPlugin } from '@karmaniverous/get-dotenv/plugins'`
  - Config loader helpers: `import { resolveGetDotenvConfigSources } from '@karmaniverous/get-dotenv/config'`
  - Overlay helper: `import { overlayEnv } from '@karmaniverous/get-dotenv/env/overlay'`

## Topic Guides

This guide is split into focused topics:

- [Environment & Config](./env.md) (Cascade, Expansion, Config files, Dynamic variables)
- [Dotenv Editor](./editing.md) (Format-preserving editing)
- [CLI & Embedding](./cli.md) (Using the CLI, `createCli`)
- [Authoring Plugins](./authoring.md) (Host lifecycle, Subprocesses, Diagnostics)
- [Shipped Plugins](./plugins.md) (Contracts and interop)

## API index (quick lookup)

Use this section when you need a “what do I import?” answer quickly.

- Root (`@karmaniverous/get-dotenv`):
  - Env composition: `getDotenv`, `defineDynamic`, `defineGetDotenvConfig`
  - Defaults: `baseRootOptionDefaults`
  - Expansion: `dotenvExpand`, `dotenvExpandAll`, `dotenvExpandFromProcessEnv`
  - Dotenv editing: `editDotenvText`, `editDotenvFile` (format-preserving)
  - Diagnostics: `traceChildEnv`, `redactDisplay`, `redactObject`, `maybeWarnEntropy`
  - Utilities: `interpolateDeep`, `writeDotenvFile`, `defaultsDeep`, `tokenize`, `applyIncludeExclude`, `requireString`, `assertByteLimit`, `silentLogger`, `assertLogger`, `toNumber`, `parseFiniteNumber`, `parsePositiveInt`, `parseNonNegativeInt`
- CLI factory (`@karmaniverous/get-dotenv/cli`):
  - `createCli({ alias, branding?, compose?, rootOptionDefaults?, rootOptionVisibility? }) -> (argv?) => Promise<void>`
- CLI host (`@karmaniverous/get-dotenv/cliHost`):
  - Host class: `GetDotenvCli`
  - Plugin authoring: `definePlugin` (returns a plugin with `readConfig` and `createPluginDynamicOption`)
  - Execution: `runCommand`, `runCommandResult`, `shouldCapture`, `buildSpawnEnv`, `ensureForce`
  - Option bag: `readMergedOptions`
  - Shell/scripting: `resolveCommand`, `resolveShell`, `defineScripts`
  - Helpers: `getRootCommand`, `composeNestedEnv`, `maybePreserveNodeEvalArgv`
- Config (`@karmaniverous/get-dotenv/config`):
  - `resolveGetDotenvConfigSources(...)` and validation helpers

---

## title: STAN assistant guide (get-dotenv)

# STAN assistant guide: @karmaniverous/get-dotenv

This is a compact, self-contained guide for STAN assistants to use `@karmaniverous/get-dotenv` effectively (library + CLI host + plugins) without consulting type definition files or other project documentation.

## What this library does (mental model)

`get-dotenv` composes an environment (`ProcessEnv`) from multiple sources deterministically, expands references recursively, optionally applies dynamic variables, and then lets you (a) use the final map programmatically, (b) run commands under it via a cross-platform CLI, or (c) build your own plugin-based CLI host that resolves env once per invocation.

Key idea: treat the “resolved dotenv context” (`ctx.dotenv`) as the source of truth, and do not rely on `process.env` being mutated unless you explicitly enable it.

## Install + import rules

- Node: >= 20
- Package is ESM-only (CommonJS must use dynamic `import()`).
- Recommended imports (public API):
  - Programmatic core: `import { getDotenv } from '@karmaniverous/get-dotenv'`
  - CLI factory (shipped plugins): `import { createCli } from '@karmaniverous/get-dotenv/cli'`
  - CLI host + plugin authoring: `import { GetDotenvCli, definePlugin } from '@karmaniverous/get-dotenv/cliHost'`
  - Shipped plugins: `import { cmdPlugin, batchPlugin, awsPlugin, awsWhoamiPlugin, initPlugin } from '@karmaniverous/get-dotenv/plugins'`
  - Config loader helpers: `import { resolveGetDotenvConfigSources } from '@karmaniverous/get-dotenv/config'`
  - Overlay helper: `import { overlayEnv } from '@karmaniverous/get-dotenv/env/overlay'`

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

## Dotenv file editing (format-preserving)

Use the dotenv edit utilities when you need to update a `.env*` file in place without destroying comments, spacing, ordering, unknown lines, or line endings.

Pure text (no filesystem):

```ts
import { editDotenvText } from '@karmaniverous/get-dotenv';

const next = editDotenvText('A=1\n# keep\nB=2\n', {
  A: 'updated',
  UNUSED: null,
});
```

FS-level (deterministic target selection across `paths`, optional template bootstrap):

```ts
import { editDotenvFile } from '@karmaniverous/get-dotenv';

await editDotenvFile(
  { API_URL: 'https://example.com', UNUSED: null },
  {
    paths: ['./'],
    scope: 'env',
    privacy: 'private',
    env: 'dev',
    dotenvToken: '.env',
    privateToken: 'local',
  },
);
```

Notes:

- Dedicated guide: see [Dotenv editor (format-preserving)](../dotenv-editor.md) for the full contract, examples, and edge cases.
- Update map semantics:
  - `null` deletes key assignment lines (default).
  - `undefined` skips (default); in `mode: 'sync'` an own key with `undefined` counts as present (so it is not deleted).
  - Objects/arrays are supported and are written via `JSON.stringify`.
- Duplicate keys: `duplicateKeys: 'all' | 'first' | 'last'` (default: `'all'`).
- EOL: `eol: 'preserve' | 'lf' | 'crlf'` (default: `'preserve'`), and trailing newline presence/absence is preserved.
- Target selection (`editDotenvFile`) is deterministic and uses `paths` only (directories), matching get-dotenv’s precedence model by default:
  - `searchOrder: 'reverse'` (default): last path wins (highest precedence).
  - `searchOrder: 'forward'`: first path wins.
- Template bootstrap: if the selected target is missing but `<target>.<templateExtension>` exists (default extension: `template`), the template is copied first and then edited in place.
- Return shape: `editDotenvFile` returns `{ path, createdFromTemplate, changed }` where `path` is absolute.

Selector mapping (filename construction):

- `scope: 'global'`, `privacy: 'public'` → `<dotenvToken>`
- `scope: 'env'`, `privacy: 'public'` → `<dotenvToken>.<env>`
- `scope: 'global'`, `privacy: 'private'` → `<dotenvToken>.<privateToken>`
- `scope: 'env'`, `privacy: 'private'` → `<dotenvToken>.<env>.<privateToken>`

If `scope: 'env'` and neither `env` nor `defaultEnv` can be resolved, `editDotenvFile` throws with an `env is required`-style message.

Low-level building blocks (advanced use):

- `parseDotenvDocument(text)` → parse into a format-preserving segment model.
- `applyDotenvEdits(doc, updates, opts?)` → apply merge/sync edits while preserving formatting.
- `renderDotenvDocument(doc, eolMode?)` → render back to text with EOL policy.

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

### `getDotenv()` options (what matters)

All options are optional; important ones:

- Selection:
  - `env?: string` and/or `defaultEnv?: string` (used when `env` not provided)
  - `paths?: string[]` (ordered)
  - `dotenvToken?: string` (default `.env`)
  - `privateToken?: string` (default `local`)
- Variable injection:
  - `vars?: ProcessEnv` (explicit vars merged into the composed map)
  - `loadProcess?: boolean` (default false for programmatic use; when true merges into `process.env`)
- Dynamic variables:
  - `dynamic?: Record<string, string | ((vars, env) => string | undefined)>` (programmatic map; takes precedence over `dynamicPath`)
  - `dynamicPath?: string` (path to JS/TS module default-exporting the same dynamic map)
  - `excludeDynamic?: boolean` (skip dynamic evaluation)
- Exclusions:
  - `excludePublic|excludePrivate|excludeGlobal|excludeEnv?: boolean`
- Output + logging:
  - `outputPath?: string` (writes a consolidated dotenv file; multiline values are quoted)
  - `log?: boolean` and `logger?: console-like` (logs final map; can be combined with redaction/entropy options)
- Diagnostics for log output (presentation-only):
  - `redact?: boolean`, `redactPatterns?: Array<string | RegExp>`
  - `warnEntropy?: boolean`, `entropyThreshold?: number`, `entropyMinLength?: number`, `entropyWhitelist?: Array<string | RegExp>`

### Dynamic variables (programmatic) without casts

Use `defineDynamic()` to get strong inference for your vars bag in TS:

```ts
import { defineDynamic, getDotenv } from '@karmaniverous/get-dotenv';

type Vars = { APP_SETTING?: string; ENV_SETTING?: string };

const dynamic = defineDynamic<Vars, { GREETING: (v: Vars) => string }>({
  GREETING: ({ APP_SETTING = '' }) => `Hello ${APP_SETTING}`,
});

const env = await getDotenv<Vars>({ env: 'dev', paths: ['./'], dynamic });
```

Dynamic function signature:

- `(vars: ProcessEnv, env?: string) => string | undefined`

Return `undefined` to “unset/omit”.

## Config files and overlays (host path; always-on there)

When using the shipped CLI host (or embedding it via `createCli`/`GetDotenvCli`), config discovery + overlays are always active (and a no-op if no config exists).

### Files discovered (order)

- Packaged (library) root: first matching public config:
  - `getdotenv.config.json|yaml|yml|js|mjs|cjs|ts|mts|cts`
- Project root (your repo):
  - Public: first matching `getdotenv.config.*` (same extensions)
  - Local/private: first matching `getdotenv.config.local.*` (same extensions)

### Allowed top-level config keys (contract)

JSON/YAML configs are data-only. JS/TS configs may include dynamic + schema.

- `rootOptionDefaults?: { ... }` (root CLI defaults; collapsed families; see below)
- `rootOptionVisibility?: { [rootKey]: boolean }` (help-time only; false hides options)
- `scripts?: Record<string, string | { cmd: string; shell?: string | boolean }>`
- `vars?: Record<string, string>` (global/public vars)
- `envVars?: Record<string, Record<string, string>>` (per-env/public vars)
- `plugins?: Record<string, unknown>` (per-plugin config slices keyed by realized mount path, e.g. `aws/whoami`)
- `requiredKeys?: string[]` (post-compose validation)
- JS/TS only:
  - `dynamic?: Record<string, string | ((vars, env?) => string | undefined)>`
  - `schema?: unknown` (if it exposes `safeParse(finalEnv)`, host runs it once post-compose)

Do not put operational root flags (like `shell`, `loadProcess`, `paths`) at top level; they belong under `rootOptionDefaults`.

### Root defaults precedence (runtime + help labels)

Higher wins:

- CLI flags
- project local `rootOptionDefaults`
- project public `rootOptionDefaults`
- packaged public `rootOptionDefaults`
- `createCli({ rootOptionDefaults })`
- `baseRootOptionDefaults`

Visibility precedence is similar (but no CLI flags for visibility):

- project local `rootOptionVisibility`
- project public `rootOptionVisibility`
- packaged public `rootOptionVisibility`
- `createCli({ rootOptionVisibility })`

### Plugin config slices (keyed by realized mount path)

Config location:

- `plugins.<mountPath>` where `<mountPath>` is the command path without the root alias, e.g.:
  - `plugins.aws`
  - `plugins['aws/whoami']`

Host behavior:

- Merges packaged/public < project/public < project/local.
- Interpolates string leaves once against `{ ...ctx.dotenv, ...process.env }` (process.env wins for plugin slices).
- Validates against a plugin’s Zod `configSchema` (if provided).
- Stores per-plugin-instance slices and exposes them via `plugin.readConfig(cli)` (do not look up by id).

## CLI usage (shipped host)

The shipped CLI is plugin-first and includes: `cmd`, `batch`, `aws` (+ `aws whoami`), `init`.

Quick run:

```bash
npx @karmaniverous/get-dotenv -c 'echo $APP_SETTING'
```

Key root flags (behavioral intent):

- `-e, --env <string>` select environment
- `--paths <string>` (delimited list) and delimiter options
- `--dotenv-token <string>`, `--private-token <string>`
- `-s, --shell [string]` (default OS shell when enabled), `-S, --shell-off`
- `--capture` or `GETDOTENV_STDIO=pipe` for deterministic CI output
- `--trace [keys...]` print child env diagnostics to stderr before spawning
- `--redact` / `--redact-off`, plus `--redact-pattern <pattern...>`
- `--entropy-warn` / `--entropy-warn-off` + threshold/min-length/whitelist

Important: the root “-c” behavior is owned by the `cmd` plugin (parent alias), not a root “--command” flag.

## Embedding the shipped CLI: `createCli()`

Use `createCli` to embed a ready-to-run CLI host and optionally customize composition.

```ts
#!/usr/bin/env node
import { createCli } from '@karmaniverous/get-dotenv/cli';

await createCli({ alias: 'toolbox' })();
```

Customize installed plugins:

```ts
import { createCli } from '@karmaniverous/get-dotenv/cli';
import { cmdPlugin, batchPlugin } from '@karmaniverous/get-dotenv/plugins';

const run = createCli({
  alias: 'toolbox',
  compose: (p) =>
    p
      .use(
        cmdPlugin({ asDefault: true, optionAlias: '-c, --cmd <command...>' }),
      )
      .use(batchPlugin()),
});

await run();
```

## Building your own host + plugins: `GetDotenvCli` and `definePlugin()`

### The host lifecycle (what to assume)

- Host resolves dotenv context once per invocation: `await program.resolveAndLoad(...)`.
- Resolved context is available via `cli.getCtx()` inside any plugin mount/action.
- Root hooks in the shipped factory also persist a merged “root options bag” for actions: use `readMergedOptions(thisCommand)` to retrieve it.
- Host ctx includes dotenv provenance metadata at `ctx.dotenvProvenance`:
  - Mapping: `Record<string, DotenvProvenanceEntry[]>` ordered in ascending precedence (last entry is effective).
  - Descriptor-only: entries do not include value payloads (safe to log).
  - Entries:
    - `kind: 'file'`: path, scope (global/env), privacy (public/private).
    - `kind: 'config'`: scope, privacy, configScope (packaged/project).
    - `kind: 'vars'`: explicit CLI/programmatic overrides.
    - `kind: 'dynamic'`: `dynamicSource` (config | programmatic | dynamicPath).
  - Unsets: `op: 'unset'` is recorded when a layer returns `undefined` or explicitly unsets a key.
  - Ordering matches overlay precedence:
    - Files < Configs < Programmatic Dynamic < File DynamicPath.
    - Within files/configs: Global < Env; Public < Private.

### Grouping plugins under a namespace: `groupPlugins(...)`

If you want a namespace-only parent command to group plugins under a shared prefix (for example, `smoz getdotenv init`), use `groupPlugins` rather than trying to “call” another plugin or inventing alias command names like `getdotenv-init`.

```ts
import { groupPlugins } from '@karmaniverous/get-dotenv/cliHost';
import { initPlugin } from '@karmaniverous/get-dotenv/plugins';

program.use(
  groupPlugins({ ns: 'getdotenv', description: 'getdotenv tools' }).use(
    initPlugin(),
  ),
);
```

Notes:

- Config keys for children follow the realized mount path (e.g., `plugins['getdotenv/init']`).
- If you mount `cmdPlugin({ optionAlias: ... })` under the group, the alias attaches to the group command (e.g., `smoz getdotenv -c ...`), not the root.

### Minimal plugin pattern

```ts
import { definePlugin } from '@karmaniverous/get-dotenv/cliHost';

export const helloPlugin = () =>
  definePlugin({
    ns: 'hello',
    setup(cli) {
      cli.description('Say hello').action(() => {
        const ctx = cli.getCtx();
        console.log('dotenv keys:', Object.keys(ctx.dotenv).length);
      });
    },
  });
```

### Composition model (namespaces are the contract)

- Every plugin declares `ns` (command name).
- Mounts are created by the host; plugin `setup(cli)` receives the mount and returns void.
- You can override a child namespace at composition time: `.use(child, { ns: 'whoami2' })`.
- Config keys follow the realized mount path (rename changes config key intentionally).

### Plugin config + dynamic help (recommended)

If a plugin has config, attach `configSchema` and use instance-bound helpers:

- `plugin.readConfig(cli)` to read the validated, interpolated slice.
- `plugin.createPluginDynamicOption(cli, flags, (helpCfg, pluginCfg) => string)` to render “effective default” help strings.

## Running subprocesses safely (portable patterns)

### Always build a normalized child env

```ts
import { buildSpawnEnv } from '@karmaniverous/get-dotenv';

const env = buildSpawnEnv(process.env, ctx.dotenv);
```

### Honor capture contract

```ts
import {
  readMergedOptions,
  runCommand,
  shouldCapture,
} from '@karmaniverous/get-dotenv/cliHost';

const bag = readMergedOptions(thisCommand);
const capture = shouldCapture(bag.capture);

await runCommand('echo OK', bag.shell ?? false, {
  env,
  stdio: capture ? 'pipe' : 'inherit',
});
```

Note: `runCommand()` re-emits buffered stdout when using `stdio: 'pipe'`; stderr is not re-emitted by default (use `runCommandResult()` if you need deterministic stderr handling).

### Script resolution + shell resolution (cmd/batch-like plugins)

Use shared helpers:

- `resolveCommand(scripts, input)` resolves `scripts[input]` (string or `{ cmd }`) or returns `input`.
- `resolveShell(scripts, input, rootShell)` uses `scripts[input].shell` if object form, else uses `rootShell` (or false when absent).

### Shell-off + `node -e` (avoid lossy tokenization)

When running shell-off and passing a Node eval snippet, preserve argv:

```ts
import { maybePreserveNodeEvalArgv } from '@karmaniverous/get-dotenv/cliHost';

const argv = maybePreserveNodeEvalArgv(['node', '-e', 'console.log("ok")']);
```

## Expanding plugin flag values (ctx-aware; avoid parse-time traps)

Commander option parsers run before ctx exists, so they can only expand against `process.env`. If you want `${NAME}` expansion based on the resolved dotenv context, expand at action-time against `{ ...process.env, ...ctx.dotenv }`:

```ts
import { dotenvExpand } from '@karmaniverous/get-dotenv';

const raw = String(opts.tableName ?? '');
const envRef = { ...process.env, ...cli.getCtx().dotenv };
const expanded = dotenvExpand(raw, envRef) ?? raw;
```

This keeps behavior independent of `loadProcess`.

## Diagnostics helpers (when you need parity with shipped behavior)

From the root export:

- `traceChildEnv({ parentEnv, dotenv, keys?, redact?, redactPatterns?, warnEntropy?, ... })` prints origin/value diagnostics for child env composition.
- `redactDisplay(value, { redact?, redactPatterns? })` and `redactObject(record, opts)` mask values for logs/traces (presentation-only).
- `maybeWarnEntropy(key, value, origin, opts, write)` warns about likely secrets by entropy (presentation-only).

## Shipped plugins: what to know as a plugin author

- `cmd`: executes a command under ctx; provides parent alias `-c, --cmd <command...>`; detects conflict when both alias and explicit subcommand are used.
- `batch`: discovers directories by globs and runs a command sequentially; honors `--list` and `--ignore-errors`.
- `aws`: establishes a session once per invocation and writes AWS env vars to `process.env`; publishes minimal metadata under `ctx.plugins.aws`; supports `strategy: none` to disable credential export.
- `init`: scaffolds config files and a CLI skeleton under `src/cli/<name>/...`; collision handling supports overwrite/example/skip plus CI heuristics.

## Shipped plugin interop contracts (composition + runtime state)

This section exists to answer common “can I depend on this?” questions when authoring third-party plugins intended to interoperate with the shipped plugins.

### Nested composition: `parentPlugin().use(childPlugin())`

- Any plugin created with `definePlugin()` can be nested under another plugin via `.use(childPlugin())`; the shipped plugins follow this model.
- `awsPlugin()` is explicitly designed to act as a parent for AWS-dependent child plugins. Prefer mounting your plugin under `aws` so session/region/credential resolution happens before your code runs.

Canonical wiring example (child plugin mounted under `aws`):

```ts
#!/usr/bin/env node
import { createCli } from '@karmaniverous/get-dotenv/cli';
import { awsPlugin } from '@karmaniverous/get-dotenv/plugins';

import { secretsPlugin } from '@acme/aws-secrets-plugin'; // example third-party plugin

await createCli({
  alias: 'toolbox',
  compose: (program) => program.use(awsPlugin().use(secretsPlugin())),
})();
```

Notes:

- The realized mount path is the config key (root alias excluded). For a child plugin mounted as `aws secrets`, the config key is `plugins['aws/secrets']`.
- The `cmd` plugin’s parent alias (`-c, --cmd <command...>`) is attached to the command it is mounted under. If you mount `cmdPlugin()` under a group/namespace command, the alias attaches to that group (not the root).

### Stable `ctx.plugins.*` shapes (what is safe to depend on)

- Only the `aws` plugin currently publishes a stable, documented entry under `ctx.plugins`: `ctx.plugins.aws`.
- Contract: `ctx.plugins.aws` contains non-sensitive metadata only. Treat this as the stable surface:
  - `profile?: string`
  - `region?: string`
- Credentials are intentionally not mirrored under `ctx.plugins`. If your child plugin needs credentials, rely on the standard AWS SDK v3 provider chain reading from `process.env` after the `aws` parent runs.

Other shipped plugins (`cmd`, `batch`, `init`) do not currently publish stable `ctx.plugins.*` entries. If you observe additional fields in `ctx.plugins`, treat them as internal/unstable unless they are documented as part of a stable contract.

### Dotenv editor “winner path” guidance (plugins that write `.env*`)

If your plugin edits dotenv files (e.g., syncing secrets into `.env.<env>.<privateToken>`), prefer selecting and editing a single target using `editDotenvFile(...)` rather than writing to every path:

- `editDotenvFile` deterministically selects the first match across `paths` and edits only that file (or bootstraps from a sibling template when needed).
- Default precedence matches get-dotenv overlay semantics: `searchOrder: 'reverse'` (last path wins).
- Only implement a “write all paths” mode as an explicit opt-in, since it diverges from get-dotenv’s precedence model and surprises users in multi-path cascades.

### Optional AWS X-Ray SDK integration (guarded import)

Some X-Ray SDK integrations throw if `AWS_XRAY_DAEMON_ADDRESS` is not set. Do not import or enable X-Ray capture unconditionally:

- Only enable X-Ray capture when `AWS_XRAY_DAEMON_ADDRESS` is present, or when an explicit “xray on” option is enabled and you validate required env up front.
- Prefer dynamic import so environments without X-Ray dependencies (or without daemon config) do not crash at module load time.

## API index (quick lookup)

Use this section when you need a “what do I import?” answer quickly.

- Root (`@karmaniverous/get-dotenv`):
  - Env composition: `getDotenv`, `defineDynamic`, `defineGetDotenvConfig`
  - Defaults: `baseRootOptionDefaults`
  - Expansion: `dotenvExpand`, `dotenvExpandAll`, `dotenvExpandFromProcessEnv`
  - Dotenv editing: `editDotenvText`, `editDotenvFile` (format-preserving)
  - Diagnostics: `traceChildEnv`, `redactDisplay`, `redactObject`, `maybeWarnEntropy`
  - Utilities: `interpolateDeep` (deep string-leaf interpolation), `writeDotenvFile`, `defaultsDeep`, `tokenize`, `assertLogger`, `silentLogger`
- CLI factory (`@karmaniverous/get-dotenv/cli`):
  - `createCli({ alias, branding?, compose?, rootOptionDefaults?, rootOptionVisibility? }) -> (argv?) => Promise<void>`
- CLI host (`@karmaniverous/get-dotenv/cliHost`):
  - Host class: `GetDotenvCli`
  - Plugin authoring: `definePlugin` (returns a plugin with `readConfig` and `createPluginDynamicOption`)
  - Execution: `runCommand`, `runCommandResult`, `shouldCapture`, `buildSpawnEnv`
  - Option bag: `readMergedOptions`
  - Shell/scripting: `resolveCommand`, `resolveShell`, `defineScripts`
  - Helpers: `getRootCommand`, `composeNestedEnv`, `maybePreserveNodeEvalArgv`
- Plugins (`@karmaniverous/get-dotenv/plugins`):
  - `cmdPlugin`, `batchPlugin`, `awsPlugin`, `awsWhoamiPlugin`, `initPlugin`
- Config (`@karmaniverous/get-dotenv/config`):
  - `resolveGetDotenvConfigSources(...)` and validation helpers used by the host
- Env overlay (`@karmaniverous/get-dotenv/env/overlay`):
  - `overlayEnv({ base, env, configs, programmaticVars? })`

## Common “assistant mistakes” (avoid these)

- Do not assume `process.env` contains the resolved dotenv context; use `cli.getCtx().dotenv` unless you explicitly enabled `loadProcess`.
- Do not expand plugin option values at parse time if you intend them to see `ctx.dotenv`; expand at action time.
- In shell-off mode, avoid passing a complex command as a single string unless you understand the tokenizer limitations; prefer argv arrays.
- Do not do id-based plugin config lookups; use `plugin.readConfig(cli)` and the instance-bound dynamic option helper.
