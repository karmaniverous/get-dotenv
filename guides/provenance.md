---
title: Provenance & Auditing
---

# Provenance & Auditing

`get-dotenv` composes environment variables from many sources: multiple dotenv files (cascading by scope/privacy), configuration overlays (packaged/project), explicit variables, and dynamic computation.

To help you debug overrides and audit where values come from, the host maintains a **provenance** record.

## What is provenance?

Provenance is a metadata map describing the history of every key in the resolved environment. It records *where* a value was defined (e.g., "set in .env.local", "overridden by config", "unset by dynamic logic") without recording the value itself (descriptor-only).

This allows you to:
- Debug why a variable has a specific value.
- Audit which files or config layers contributed to the final environment.
- build tooling that visualizes the composition stack.

## Accessing provenance

The provenance map is available on the CLI context (`ctx`) returned by the host.

```ts
const ctx = cli.getCtx();
const history = ctx.dotenvProvenance['APP_SETTING'];
```

## Structure

Type: `Record<string, DotenvProvenanceEntry[]>`

Each key maps to an array of entries ordered by **ascending precedence**. The last entry in the array represents the "winner" (effective origin).

### Entry shape

All entries share:
- `kind`: The source type (`file`, `config`, `vars`, `dynamic`).
- `op`: The operation (`set` or `unset`).

#### `kind: 'file'`
Sourced from a dotenv file in the cascade.
- `path`: The search path directory (as provided).
- `file`: The filename token (e.g., `.env`, `.env.local`).
- `scope`: `global` | `env`.
- `privacy`: `public` | `private`.
- `env`: The environment name (if scope is `env`).

#### `kind: 'config'`
Sourced from `getdotenv.config.*` overlays.
- `configScope`: `packaged` | `project`.
- `configPrivacy`: `public` | `local`.
- `scope`: `global` | `env`.
- `privacy`: `public` | `private` (matches `configPrivacy`).

#### `kind: 'vars'`
Sourced from explicit variable overrides (`--vars` or programmatic `vars`).

#### `kind: 'dynamic'`
Sourced from dynamic computation.
- `dynamicSource`: `config` (JS/TS config) | `programmatic` (options) | `dynamicPath` (file).
- `dynamicPath`: The path to the dynamic module (when source is `dynamicPath`).

## Precedence order

Entries stack in the order `get-dotenv` applies them:

1. **Files** (Base)
   - Global Public < Env Public < Global Private < Env Private
   - Later `paths` override earlier `paths`.
2. **Config Overlays**
   - Packaged < Project Public < Project Local
   - Within each: Global < Env
3. **Vars** (Explicit overrides)
4. **Dynamic**
   - Config Dynamic < Programmatic Dynamic < File `dynamicPath`

## Example

If `APP_SETTING` is defined in `.env` and overridden in `.env.local`, the provenance array might look like:

```json
[
  {
    "kind": "file", "op": "set",
    "scope": "global", "privacy": "public", "file": ".env", "path": "./"
  },
  {
    "kind": "file", "op": "set",
    "scope": "global", "privacy": "private", "file": ".env.local", "path": "./"
  }
]
```
