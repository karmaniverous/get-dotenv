---
title: Packaging
---

# Authoring Plugins: Packaging

A plugin package usually has a product of its own (a client library, a set of tools) and a get-dotenv plugin on the side. This page shows how to package it so the product works without get-dotenv, while a host and its plugins share a single copy of get-dotenv. The first-party plugin packages follow it.

## get-dotenv is an optional peer

Declare `@karmaniverous/get-dotenv` as an optional `peerDependency`, plus a `devDependency` for your own build and tests. Never make it a direct dependency: a second copy of get-dotenv in a host's tree breaks `readMergedOptions` (the root isn't that copy's `GetDotenvCli`) and dynamic help.

```json
{
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.mjs" },
    "./get-dotenv": {
      "types": "./dist/get-dotenv.d.ts",
      "import": "./dist/get-dotenv.mjs"
    }
  },
  "dependencies": { "zod": "^4" },
  "peerDependencies": { "@karmaniverous/get-dotenv": "^8" },
  "peerDependenciesMeta": {
    "@karmaniverous/get-dotenv": { "optional": true }
  },
  "devDependencies": { "@karmaniverous/get-dotenv": "^8" }
}
```

## The main entry never loads get-dotenv

- **The main entry (`.`) is your product.** Nothing reachable from it imports get-dotenv, at runtime or in its types. That includes `import type`: it still emits `from '@karmaniverous/get-dotenv'` into the entry's `.d.ts`, which breaks type-checking for a consumer who hasn't installed get-dotenv.
- **The plugin lives in a subpath**, `./get-dotenv`, together with its config schema. A host imports it from there:

  ```ts
  import { secretsPlugin } from '@karmaniverous/aws-secrets-manager-tools/get-dotenv';
  ```

- **Types the main entry exposes are defined locally.** If your product takes a logger or an environment map, define structural copies instead of importing get-dotenv's, and replace runtime helpers such as `assertLogger` with a local check:

  ```ts
  /** The logger the tools accept (structurally the same as get-dotenv's). */
  export interface Logger {
    debug: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  }

  /** An environment map. */
  export type ProcessEnv = Record<string, string | undefined>;
  ```

- **`zod` is your own dependency.** get-dotenv no longer re-exports `z`. Import it from `zod`, declare `zod` in `dependencies`, and keep it external in your build, so it isn't bundled. (Rollup externalises only dependencies and peers.)
- **Test it.** Import the main entry, and run `tsc` with `skipLibCheck: false` against the packed main entry's types, in a fixture where get-dotenv is not installed.

## A bin is a launcher

npm doesn't install optional peers, so a bin built on get-dotenv has to fail cleanly when get-dotenv is missing, rather than with a module-resolution stack trace. Make the bin a small launcher that loads the CLI module, and through it get-dotenv, with a dynamic `import()`:

- The CLI module is not the bin file. Importing the bin runs the CLI, so a library entry that exports your CLI pieces must be a separate module.
- The build must emit the dynamically loaded chunk: Rollup `output.dir`, not `output.file`.
- When the import fails with `ERR_MODULE_NOT_FOUND` for `@karmaniverous/get-dotenv`, print all three install routes to stderr and exit 1.

```js
#!/usr/bin/env node
// The CLI module, and through it get-dotenv, loads only here.
const bin = 'mytool';
const pkg = '@acme/mytool';
try {
  await import('../dist/cli.mjs');
} catch (error) {
  if (
    error?.code === 'ERR_MODULE_NOT_FOUND' &&
    String(error.message).includes('@karmaniverous/get-dotenv')
  ) {
    console.error(
      [
        `${bin} needs @karmaniverous/get-dotenv ^8. Install it:`,
        '  local:  npm i -D @karmaniverous/get-dotenv@^8',
        '  global: npm i -g @karmaniverous/get-dotenv@^8',
        `  npx:    npx -p @karmaniverous/get-dotenv@^8 -p ${pkg} ${bin}`,
      ].join('\n'),
    );
    process.exit(1);
  }
  throw error;
}
```

The CLI module itself is an ordinary host. It passes its own URL, so `--version`, the description and the packaged config come from your package (see [Host identity](./lifecycle.md#host-identity-and-branding)):

```ts
// src/cli.ts
import { createCli } from '@karmaniverous/get-dotenv/cli';

import { myPlugin } from './get-dotenv';

await createCli({
  alias: 'mytool',
  importMetaUrl: import.meta.url,
  compose: (p) => p.use(myPlugin()),
})();
```

## Choosing an alias

Your CLI's alias reserves the `--<alias>-` prefix on its command line (see [Qualified names](./qualified-names.md)). If your CLI may run under another get-dotenv CLI, pick an alias that doesn't start with that CLI's alias followed by a dash. See [Nested CLIs](./qualified-names.md#nested-clis-choosing-an-alias).
