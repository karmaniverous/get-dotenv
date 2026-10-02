---
title: Dotenv editor (format-preserving)
---

# Dotenv editor (format-preserving)

The dotenv editor lets you update `.env*` files without destroying formatting, comments, ordering, blank lines, or unknown lines, and it can deterministically select a target file across a get-dotenv `paths` cascade (with optional template bootstrap).

Use this when you want to:

- Update keys in place while preserving the human-edited file layout.
- Keep `.env.local` or `.env.<env>.local` in sync with a secrets source without rewriting the whole file.
- Bootstrap a gitignored file from a committed template (e.g., `.env.local.template` → `.env.local`).

The editor is format-preserving by design: it parses into a document model, applies edits to the model, and renders back to text.

## API surface

All APIs below are exported from the package root (`@karmaniverous/get-dotenv`).

High-level entrypoints:

- `editDotenvText(text, updates, options?)` → string (pure text; no filesystem)
- `editDotenvFile(updates, options)` → `{ path, createdFromTemplate, changed }` (FS adapter; target selection + template bootstrap + in-place edit)

Lower-level building blocks (when you need more control):

- `parseDotenvDocument(text)` → `DotenvDocument`
- `applyDotenvEdits(doc, updates, opts?)` → `DotenvDocument`
- `renderDotenvDocument(doc, eolMode?)` → string

Types of interest:

- `DotenvUpdateMap`, `DotenvUpdateValue`
- `DotenvEditOptions` (`mode`, `duplicateKeys`, `eol`, etc.)
- `EditDotenvFileOptions`, `EditDotenvFileResult`
- `DotenvTargetScope` (`global | env`), `DotenvTargetPrivacy` (`public | private`)

## Pure text editing: editDotenvText

Use this when you already have the file contents in memory (or when you’re writing a tool that manages IO separately).

```ts
import { editDotenvText } from '@karmaniverous/get-dotenv';

const before = [
  '# header',
  '',
  'APP_SETTING=one',
  'raw line stays',
  'ENV_SETTING=two',
  '',
].join('\n');

const after = editDotenvText(before, { APP_SETTING: 'updated', UNUSED: null });
console.log(after);
```

Key behaviors:

- Unknown/unparsed lines are preserved verbatim.
- Ordering is preserved; new keys (merge mode) are appended at the end.
- Inline comment spacing is preserved when updating existing assignment lines.

## Update map semantics (DotenvUpdateMap)

Updates are expressed as a `Record<string, DotenvUpdateValue>`.

Supported value types:

- `string | number | boolean` → written as string tokens (`number/boolean` are stringified)
- `Record<string, unknown> | unknown[]` → written as `JSON.stringify(value)`
- `null` → delete matching key lines (default `nullBehavior: 'delete'`)
- `undefined` → skip (default `undefinedBehavior: 'skip'`)

Important nuance (sync mode):

- In `mode: 'sync'`, keys that are not present in the update map are deleted, but a key that is present with `undefined` counts as “present” and is not deleted (while also not being updated).

## Modes and duplicates

### Mode: merge vs sync

- `mode: 'merge'` (default): update existing keys and append missing keys; do not delete unrelated keys.
- `mode: 'sync'`: delete assignment/bare-key lines for keys not present in the update map, while preserving comments/unknown lines.

### Duplicate keys

When the same key appears multiple times, you can choose how to update/delete occurrences:

- `duplicateKeys: 'all'` (default)
- `duplicateKeys: 'first'`
- `duplicateKeys: 'last'`

## Quoting, multiline, and comment safety

The editor prefers correctness over minimal diff, but it preserves quote style where it is safe to do so.

Rules of thumb:

- Multiline values are always written using double quotes for correctness.
- Leading/trailing whitespace forces quoting (to avoid silent trimming by dotenv parsers).
- If a line has an inline comment suffix and the new value contains `#`, the value is quoted to avoid comment truncation.
- Bare-key placeholders like `FOO` or `BAR  # comment` are converted into assignments when updated (default separator `=`), preserving the inline comment.

## EOL policy (LF vs CRLF)

Rendering can preserve EOLs or normalize them:

- `eol: 'preserve'` (default): detect file EOL and keep it; inserted line breaks use the detected EOL.
- `eol: 'lf'` or `eol: 'crlf'`: normalize the entire output.

Trailing newline presence/absence is preserved.

## FS adapter: editDotenvFile (target resolution + template bootstrap)

Use this when you want the library to select and update a specific dotenv target file across `paths` deterministically.

### Target selection axes

The target is determined by:

- `paths: string[]` (directories only; this is the only search surface)
- `scope: 'global' | 'env'`
- `privacy: 'public' | 'private'`
- `dotenvToken` (default: `.env`)
- `privateToken` (default: `local`)
- `env` (and optional `defaultEnv`) when `scope: 'env'`

Filename construction:

- public/global: `<dotenvToken>`
- public/env: `<dotenvToken>.<env>`
- private/global: `<dotenvToken>.<privateToken>`
- private/env: `<dotenvToken>.<env>.<privateToken>`

### Search order across paths

By default, selection uses reverse path order (highest precedence wins), matching the get-dotenv overlay model:

- `searchOrder: 'reverse'` (default): checks `paths` from last → first
- `searchOrder: 'forward'`: checks `paths` from first → last

### Template bootstrap

If the target file does not exist anywhere under `paths`, but a template exists at `<target>.<templateExtension>`, it will be copied to `<target>` before editing.

- `templateExtension: 'template'` by default, producing patterns like `.env.local.template`.

If neither the target nor the template exists under any provided path, `editDotenvFile` throws, and the error message lists every candidate filename it checked.

### Shared env template fallback (`scope: 'env'` only)

Env-scoped templates are usually identical across environments (`dev`, `stg`, `prod`, ...), which means keeping separate `.env.<env>.local.template` files per environment just invites drift. When an env-scoped target is missing *and* it has no env-specific template, `resolveDotenvTarget` falls back to a **shared env template** before throwing.

The shared template filename is built the same way as the env target, but with a fixed token in place of the actual env name. That token is configurable via `sharedEnvTemplateToken` (default `'env'`), and it respects `dotenvToken`, `privateToken`, and `templateExtension`:

- `.env.<env>.local` → shared template `.env.env.local.template`
- `.env.<env>` → shared template `.env.env.template`

Resolution order per path, in the configured `searchOrder`:

1. The target itself (e.g. `.env.dev.local`) — if it exists anywhere under `paths`, it wins outright.
2. The env-specific template (e.g. `.env.dev.local.template`) — this **always** takes priority over the shared template when present, in any searched path.
3. Only when neither of the above is found anywhere under `paths`: the shared env template (e.g. `.env.env.local.template`), searched again across the same ordered paths.

Notes:

- This fallback only applies to `scope: 'env'`. Global-scoped targets (`.env`, `.env.local`) never use it — `.env.local.template` remains the template for `.env.local` only.
- When a shared template is selected, `resolveDotenvTarget` returns the env target path (in the directory where the shared template was found) as `targetPath`, and the shared template path as `templatePath`. `editDotenvFile` bootstraps from it exactly like any other template, reporting `createdFromTemplate: true`.

```ts
import { editDotenvFile } from '@karmaniverous/get-dotenv';

// With `.env.env.local.template` committed at the repo root, this works for
// every env without a per-env template file.
await editDotenvFile(
  { API_URL: 'https://example.com' },
  {
    paths: ['./'],
    scope: 'env',
    privacy: 'private',
    env: 'dev',
  },
);
```

### Example: create `.env.local` from template and set keys

```ts
import { editDotenvFile } from '@karmaniverous/get-dotenv';

await editDotenvFile(
  { API_URL: 'https://example.com', UNUSED: null },
  {
    paths: ['./'],
    scope: 'global',
    privacy: 'private',
    dotenvToken: '.env',
    privateToken: 'local',
  },
);
```

### Example: env-scoped private file with defaultEnv

```ts
import { editDotenvFile } from '@karmaniverous/get-dotenv';

await editDotenvFile(
  { FEATURE_FLAG: '1' },
  {
    paths: ['./'],
    scope: 'env',
    privacy: 'private',
    defaultEnv: 'dev',
  },
);
```

## Implementation notes (what is preserved vs interpreted)

- The parser is intentionally conservative: unrecognized/malformed lines are kept as raw text segments rather than being “fixed”.
- Unterminated quoted values are preserved verbatim as raw segments (other keys can still be edited safely).

## Related guides

- For dotenv cascade naming and precedence (reading), see [Cascade and precedence](./cascade.md).
- For config overlays and dynamic variables (authoring), see [Config files and overlays](./config.md).
