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
- `buildDotenvTargetFilename(opts)` → the target filename for a scope/privacy selector
- `resolveDotenvTarget(opts)` → `{ targetPath, templatePath?, filename }` (the target selection `editDotenvFile` uses; see [Resolution order](#resolution-order))

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
- Ordering is preserved; new keys are appended at the end, in update-map order (both modes).
- A new key must be one dotenv reads: letters, digits, `_`, `.` and `-` (`[\w.-]+`). Any other key (a space, `=`, a line break, an empty key) throws `can't add dotenv key "..."` instead of writing a line dotenv would never read back as that key.
- A new key always starts on its own line: when the file's last line has no final newline, `editDotenvFile` ends that line first (in the file's EOL style) and the file still ends without a final newline.
- Inline comment spacing is preserved when updating existing assignment lines.

## Update map semantics (DotenvUpdateMap)

Updates are expressed as a `Record<string, DotenvUpdateValue>`.

Supported value types:

- `string | number | boolean` → written as string tokens (`number/boolean` are stringified)
- `Record<string, unknown> | unknown[]` → written as `JSON.stringify(value)`
- `null` → delete matching key lines (default `nullBehavior: 'delete'`)
- `undefined` → skip (default `undefinedBehavior: 'skip'`)

Important nuance (sync mode):

- In `mode: 'sync'`, keys that are not present in the update map are deleted, but a key that is present with `undefined` counts as “present”: it is not deleted if it is in the file, not updated, and not added if it is missing.

## Modes and duplicates

### Mode: merge vs sync

- `mode: 'merge'` (default): update existing keys and append missing keys; do not delete unrelated keys.
- `mode: 'sync'`: make the file hold exactly the given keys (an upsert). Existing keys are updated in place, missing keys are appended as `merge` appends them, and assignment/bare-key lines for keys not in the update map are deleted. Comments, blank lines and unknown lines are kept.

```ts
editDotenvText('A=1\nC=3\n', { A: '9', B: '2' }, { mode: 'sync' });
// 'A=9\nB=2\n'
```

### Duplicate keys

When the same key appears multiple times, you can choose how to update/delete occurrences:

- `duplicateKeys: 'all'` (default)
- `duplicateKeys: 'first'`
- `duplicateKeys: 'last'`

## Quoting, multiline, and comment safety

Every value is written so that get-dotenv reads it back exactly: dotenv's `parse`, then get-dotenv's expander. A value is literal, so a `$` the expander would act on (one that starts a reference such as `$HOME` or `${A:-x}`, or one after a `\`) is written `\$`: `pa$$word` becomes `pa$\$word`. A `$` that starts no reference (`cost $`) is left alone. To write a reference that get-dotenv expands, write that line yourself. The dotenv file-editing API (`editDotenvFile`) and the `outputPath` (`-o`) writer share one formatter, which tries these forms of the escaped value in order and writes the first that dotenv reads back unchanged (and that `editDotenvFile` reads as the same single value the next time it edits the file):

- An existing line: its current quote style, then double quotes, single quotes, backticks, then bare.
- A new key, or an unquoted line: bare, then double quotes, single quotes, backticks.

What that means in practice (dotenv 18):

| Value                                                   | Written as                                       | Why                                                                                                 |
| ------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `plain`, `C:\new\dir`                                   | bare                                             | nothing needs quoting; a bare value is never unescaped                                              |
| contains `#` (`x #y`)                                   | `"x #y"`                                         | a bare value ends at the first `#`                                                                  |
| leading/trailing whitespace (` lead`)                   | `" lead"`                                        | a bare value is trimmed                                                                             |
| line breaks                                             | `"a↵b"` (literal line breaks, in the file's EOL) |                                                                                                     |
| needs quotes and contains `"` (`say "hi" #1`)           | `'say "hi" #1'`                                  | double quotes can't hold a `"` (an existing double-quoted line moves to single quotes the same way) |
| needs quotes and contains `\n` or `\r` text (` C:\new`) | `' C:\new'`                                      | inside double quotes dotenv expands `\n` and `\r`                                                   |
| contains both `"` and `'` and needs quotes              | backticks                                        |                                                                                                     |
| carriage return                                         | `"a\rb"`                                         | only double quotes can express one                                                                  |

Inside double quotes dotenv expands `\n` and `\r` and unescapes nothing else, so the formatter never escapes `\\` or `\"`. A value that no form can hold (for example one that needs quotes and contains all three quote characters, or a carriage return together with `"`) throws `Unable to write dotenv key "<KEY>": ...`; the message names the key, never the value.

The parser recognises double quotes, single quotes and backticks, single-line or multiline.

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

If the target file does not exist in any path, but a template exists at `<target>.<templateExtension>`, it is copied to `<target>` (in the template's directory) before editing.

- `templateExtension: 'template'` by default, producing patterns like `.env.local.template`.

### Shared env template (`scope: 'env'` only)

Env-scoped templates are usually identical across environments (`dev`, `stg`, `prod`, ...), which means keeping separate `.env.<env>.local.template` files per environment just invites drift. When an env-scoped target is missing _and_ it has no env-specific template, `resolveDotenvTarget` falls back to a **shared env template** before throwing.

The shared template filename is built the same way as the env target, but with a fixed token in place of the actual env name. That token is configurable via `sharedEnvTemplateToken` (default `'env'`), and it respects `dotenvToken`, `privateToken`, and `templateExtension`:

- `.env.<env>.local` → shared template `.env.env.local.template`
- `.env.<env>` → shared template `.env.env.template`

### Resolution order

`resolveDotenvTarget` (and so `editDotenvFile`) searches in tiers. Each tier checks every path, in `searchOrder`, before the next tier starts, so an existing target in any path beats a template in any path, and an env-specific template in any path beats a shared one:

| Tier | Candidate (example: `scope: 'env'`, `privacy: 'private'`, `env: 'dev'`)  | Used when                                          | Result                                               |
| ---- | ------------------------------------------------------------------------ | -------------------------------------------------- | ---------------------------------------------------- |
| 1    | the target, `.env.dev.local`                                             | it exists in any path                              | edit it in place                                     |
| 2    | the env-specific template, `.env.dev.local.template`                     | no target in any path                              | copy it to `.env.dev.local` beside it, then edit     |
| 3    | the shared env template, `.env.env.local.template` (`scope: 'env'` only) | no target and no env-specific template in any path | copy it to `.env.dev.local` beside it, then edit     |
| —    | nothing                                                                  | none of the above in any path                      | throw, listing every candidate checked, tier by tier |

For example, with `paths: ['./a', './b']` (reverse order searches `./b` first), `./a/.env.dev.local` beats `./b/.env.dev.local.template`, and `./a/.env.dev.local.template` beats `./b/.env.env.local.template`. Global scope has tiers 1 and 2 only.

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
