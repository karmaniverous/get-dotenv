# Config files and overlays (guarded path)

The guarded config-loader path lets you specify environment values using JSON/YAML
or JS/TS config files, then overlay them deterministically with privacy and
source precedence. Enable it from the CLI using:

- `--use-config-loader` (shipped CLI), or
- passing `{ useConfigLoader: true }` to the plugin-first host
  (`GetDotenvCli.resolveAndLoad`).

By default this path is OFF to preserve legacy behavior.

## Discovery order

When enabled, the loader discovers up to three configs in the following order:

1) Packaged root (the library’s own package root, “public” only)
   - `getdotenv.config.json`
   - `getdotenv.config.yaml` / `.yml`
2) Project root (your repository)
   - Public:
     - `getdotenv.config.json`
     - `getdotenv.config.yaml` / `.yml`
   - Local (private, gitignored conventionally):
     - `getdotenv.config.local.json`
     - `getdotenv.config.local.yaml` / `.yml`

Notes:
- Packaged `.local` is not expected by policy and is ignored.
- The first matching “public” file per scope is used; the same for “local”.

## Formats

JSON/YAML (data only):
- Allowed keys:
  - `dotenvToken?: string`
  - `privateToken?: string`
  - `paths?: string | string[]`
  - `loadProcess?: boolean`
  - `log?: boolean`
  - `shell?: string | boolean`
  - `scripts?: Record<string, unknown>`
  - `vars?: Record<string, string>` (global, public)
  - `envVars?: Record<string, Record<string, string>>` (per-env, public)
- Disallowed in JSON/YAML (this step): `dynamic` — use JS/TS instead.

JS/TS (data + dynamic):
- Accepts all JSON/YAML keys and also:
  - `dynamic?: GetDotenvDynamic`
    - A map where values are either strings or functions of the form
      `(vars: ProcessEnv, env?: string) => string | undefined`.

TS support:
- Direct import works if a TS loader is present.
- Otherwise, the loader auto-bundles via esbuild when available; if esbuild is
  not present, it falls back to a simple TypeScript transpile for single-file
  modules without imports.

## Privacy

Config privacy derives from the filename suffix:
- Public: `getdotenv.config.json` / `.yaml` / `.yml` (shared in VCS).
- Local: `getdotenv.config.local.json` / `.yaml` / `.yml` (gitignored).

## Overlays and precedence

The loader overlays config-provided values onto the “base” file-derived dotenv
values using these axes (higher wins):

1) Kind: `dynamic` > `env` > `global`
2) Privacy: `local` > `public`
3) Source: `project` > `packaged` > `base`

The overlay flow:
1) Base: resolve file cascade using `getDotenv` (exclude dynamic; ignore programmatic `vars`).
2) Overlay config sources in order:
   - packaged (public only)
   - project public
   - project local
3) Apply dynamic in order:
   - programmatic dynamic (if provided)
   - config dynamic from JS/TS: packaged → project public → project local
   - file `dynamicPath` (lowest dynamic tier)
4) Optional effects:
   - `outputPath`: write a consolidated dotenv file (multiline values are quoted).
   - `log`: print the final map.
   - `loadProcess`: merge into `process.env`.

All expansions are progressive within each slice:
- When applying a `vars` object, keys are expanded left-to-right so later values
  may reference earlier results.

## Example

Project files:
```yaml
# getdotenv.config.yaml (public)
vars:
  FOO: "foo"
envVars:
  dev:
    BAR: "${FOO}-dev"
```

```yaml
# getdotenv.config.local.yml (private)
vars:
  SECRET: "s3cr3t"
```

JS/TS dynamic (optional):
```ts
// getdotenv.config.ts
export default {
  dynamic: {
    BOTH: ({ FOO = '', BAR = '' }) => `${FOO}-${BAR}`,
  },
};
```

With `--use-config-loader` (or `{ useConfigLoader: true }` on the host), the
final map for `env=dev` overlays:
- global public (`FOO`)
- env public (`BAR`)
- global local (`SECRET`)
- dynamic from config (`BOTH`)
```
{ FOO: "foo", BAR: "foo-dev", SECRET: "s3cr3t", BOTH: "foo-foo-dev" }
```
