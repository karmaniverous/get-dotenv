---
title: Cascade and precedence
---

# Cascade and precedence

`get-dotenv` loads variables from a deterministic cascade of dotenv files, per input path, then merges across paths.

## File naming

Given:

- dotenvToken: `.env` (configurable)
- privateToken: `local` (configurable)
- env: `<ENV>` (optional)

Per input path, the loader evaluates up to four files in this order:

1. Public global: `<token>` (e.g., `.env`)
2. Public env: `<token>.<ENV>` (e.g., `.env.dev`)
3. Private global: `<token>.<privateToken>` (e.g., `.env.local`)
4. Private env: `<token>.<ENV>.<privateToken>` (e.g., `.env.dev.local`)

If a file is missing, it is silently skipped. Parsed values from later files override earlier ones (e.g., private values override public values).

## Environment resolution

When `env` is not set via `-e`, `get-dotenv` performs a global-only pre-pass — loading only global dotenv files (excluding env-scoped files) — and checks for a variable named by `defaultEnvKey` (default: `DEFAULT_ENV`).

Resolution order: explicit `-e` > `defaultEnvKey` value from global files > static `defaultEnv` from config.

The resolved environment then determines which env-scoped files (e.g., `.env.dev`, `.env.dev.local`) are loaded in the full cascade.

## Multiple paths

When `paths` contains more than one directory, `get-dotenv` visits each directory in the order they appear in the array. For each directory, the same four-file cascade is applied and merged into the overall result. Later paths override earlier paths for colliding keys.

Example:

```json
{
  "paths": ["./", "./packages/app"]
}
```

Values from `./packages/app` win over `./` if the same key appears in both.

## Dynamic variables

If `dynamicPath` is provided and `excludeDynamic` is not set, the module at that path is loaded and its default export is applied after parsing and expansion:

- If a value is a function, it is called with the current dotenv map and the selected environment; its return value is assigned to the key.
- Otherwise, the value is assigned directly.

Keys are processed in object key order and can override previously loaded variables.

See the README “Dynamic Processing” section for details.

## Expansion and defaults

After merging, values are expanded recursively using `$VAR[:default]` or `${VAR[:default]}`:

- Unknown variables expand to an empty string unless a default is provided; a value that is empty after expansion is `undefined`.
- `\$` is a literal `$`, and a `$` that starts no reference (`cost $`, `$!`) stays literal while the other references in the value still expand.
- The unbraced default runs to the next whitespace, so `http://$HOST:8080` reads `8080` as `HOST`'s default: write `http://${HOST}:8080`. There is no `:-` form (`${A:-x}` has the default `-x`).
- A referenced value is itself expanded by the same rules, and so is a default (`${A:${B}}`). Each substituted value is spliced in as-is: it is never re-scanned with the surrounding text, and `$&`/`$$` in it have no special meaning.
- A reference to a variable that is already being expanded (a self or mutual reference) counts as unset: it takes its default, else the empty string. With `SELF=$SELF`, `$SELF` expands to `undefined`; with `P=${P:/usr/bin}:/x`, `$P` expands to `/usr/bin:/x`.

See the API docs for `dotenvExpand` and `dotenvExpandAll` for precise behavior.

## Output file

If `outputPath` is set, the fully expanded variables are written to a single dotenv file at the resolved path. Multiline values are quoted. The returned object from `getDotenv` matches the file contents.

## Logging and process.env

If `log` is set, the resulting map is logged. If `loadProcess` is set, the map is copied into `process.env`: a string sets the key, and an unset (`undefined`) value or a key deleted by a dynamic `null` deletes the key from `process.env`. The CLI host applies the same rule.
