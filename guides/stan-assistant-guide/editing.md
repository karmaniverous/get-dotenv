---
title: 'Dotenv File Editing'
---

# Dotenv file editing (format-preserving)

Use the dotenv edit utilities when you need to update a `.env*` file in place without destroying comments, spacing, ordering, unknown lines, or line endings.

## Pure text (no filesystem)

```ts
import { editDotenvText } from '@karmaniverous/get-dotenv';

const next = editDotenvText('A=1\n# keep\nB=2\n', {
  A: 'updated',
  UNUSED: null,
});
```

## FS-level (deterministic target selection)

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

### Key rules

- Target selection is deterministic and uses `paths` only (directories).
  - `searchOrder: 'reverse'` (default): last path wins.
  - `searchOrder: 'forward'`: first path wins.
- Resolution order, in tiers, each checking every path in search order before the next: an existing target in any path; else the env-specific template `<target>.<templateExtension>` (default `template`), copied to the target beside it first; else (env scope) the shared env template.
- Shared env template fallback (`scope: 'env'` only): if neither the target nor its env-specific template exists, a shared template is tried next. It's named the same way as the env target, but with a fixed token (`sharedEnvTemplateToken`, default `'env'`) in place of the env name — e.g. `.env.env.local.template` for `.env.<env>.local`, or `.env.env.template` for `.env.<env>`. An env-specific template in any path beats a shared template in any path. Global scope never uses this fallback.
- Return shape: `{ path, createdFromTemplate, changed }`.

### Selector mapping

- `scope: 'global'`, `privacy: 'public'` → `<dotenvToken>`
- `scope: 'env'`, `privacy: 'public'` → `<dotenvToken>.<env>`
- `scope: 'global'`, `privacy: 'private'` → `<dotenvToken>.<privateToken>`
- `scope: 'env'`, `privacy: 'private'` → `<dotenvToken>.<env>.<privateToken>`

If `scope: 'env'` and neither `env` nor `defaultEnv` can be resolved, `editDotenvFile` throws.

### Update map semantics

- `null` deletes key assignment lines (default).
- `undefined` skips (default).
- Objects/arrays are stringified.
- `mode: 'merge'` (default) updates and appends; `mode: 'sync'` upserts: the file ends up with exactly the given keys (updated in place, missing ones appended, others deleted; comments kept).
- New keys always start on their own line, also after a last line with no final newline.
- Values are quoted so dotenv reads them back exactly (the same formatter as `-o`): bare when safe, else the line's quote style, double, single or backtick quotes; a value no form can hold throws, naming the key.

### Low-level building blocks

For advanced use:

- `parseDotenvDocument(text)` → `DotenvDocument`
- `applyDotenvEdits(doc, updates, opts?)` → `DotenvDocument`
- `renderDotenvDocument(doc, eolMode?)` → string
- `buildDotenvTargetFilename(opts)` → target filename
- `resolveDotenvTarget(opts)` → `{ targetPath, templatePath?, filename }`
