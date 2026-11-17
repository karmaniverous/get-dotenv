---
title: Getting Started
---

# Getting Started

This page gives you four fast on‑ramps. Each section includes a minimal snippet and links to the right deep‑dive. Requires Node.js 22.12 or later.

Upgrading from 7.x? See [Migrating to 8.0](./migrating-to-8.md).

## Importing `z`

- `@karmaniverous/get-dotenv/cliHost` no longer re-exports `z` (removed in 8.0.0). Import `{ z }` from `zod` directly, and list `zod` in your own dependencies.

## 1) Run a one‑off command with your env

Use the parent alias so flags apply to getdotenv, not the inner command. Prefer single quotes to avoid outer‑shell expansion.

```bash
npx @karmaniverous/get-dotenv -c 'node -e "console.log(process.env.APP_SETTING ?? \"\")"'
```

Tips:

- Diagnostics without altering runtime values: add `--trace [keys...]` and `--redact`. Set `GETDOTENV_STDIO=pipe` or pass `--capture` for CI‑friendly buffering.
- Default shells are normalized: `/bin/bash` on POSIX and `powershell.exe` on Windows; see [Shell execution behavior](./shell.md).
- See the [cmd plugin](./shipped/cmd.md) for more patterns and quoting guidance.

## 2) Load programmatically

Compose env from dotenv files and overlays in code.

```ts
import { getDotenv } from '@karmaniverous/get-dotenv';

const vars = await getDotenv({
  env: 'dev',
  paths: ['./'],
  // dynamicPath: './.env.js' or pass dynamic: defineDynamic({...})
});

console.log(vars.APP_SETTING);
```

Next:

- Put defaults and validation in `getdotenv.config.json|yaml|js|ts` using [Config files and overlays](./config.md).
- Use `dynamic` or `dynamicPath` for computed values; see [Dynamic variables (JS/TS)](../README.md#dynamic-variables-jsts).
- TypeScript: helper APIs such as env overlays/expansion accept readonly record inputs (e.g., `as const`) to keep inference strong without casts.

## 3) Embed a CLI quickly (included plugins)

Prefer the named factory to get a small runner with the shipped plugins installed.

```ts
#!/usr/bin/env node
import { createCli } from '@karmaniverous/get-dotenv/cli';

await createCli({ alias: 'toolbox', importMetaUrl: import.meta.url })();
```

Notes:

- `importMetaUrl` is required (`createCli()` without it throws). The nearest `package.json` above it is your CLI's host package, which supplies:
  - the packaged config layer: `getdotenv.config.*` beside that `package.json` (it replaces get-dotenv's own packaged layer; there is no third layer);
  - the `-V/--version` output and the help header version (`package.json` `version`, unless you pass `version`);
  - the root help description (`package.json` `description`, unless you pass `description`).
- When the host package is also the project (a CLI that lives in the repo it runs in), the packaged layer is skipped, so its `getdotenv.config.*` applies once, as the project config.
- `createCli` installs cmd, batch, aws, and init by default. `-h/--help` prints help and returns. See [Shell execution behavior](./shell.md) and [Shipped Plugins](./shipped/index.md).
- If you need to customize which plugins are installed (omit or add your own), wire a [Custom host](./authoring/lifecycle.md) instead.

CommonJS usage (dynamic import):

```js
(async () => {
  // The package is ESM-only; use dynamic import from CommonJS.
  const { createCli } = await import('@karmaniverous/get-dotenv/cli');

  // Build and run your CLI with args. CommonJS has no import.meta.url, so
  // pass this module's file URL.
  const { pathToFileURL } = require('node:url');
  const run = createCli({
    alias: 'toolbox',
    importMetaUrl: pathToFileURL(__filename).href,
  });
  await run(['-h']);
})();
```

## 4) Scaffold config and a CLI skeleton

Use `init` to copy templates and a host‑based CLI skeleton into your project.

```bash
# JSON config + .local + CLI named "acme"
npx @karmaniverous/get-dotenv init . \
  --config-format json \
  --with-local \
  --cli-name acme \
  --force
```

or a TypeScript config with dynamic examples:

```bash
npx @karmaniverous/get-dotenv init ./apps/toolbox \
  --config-format ts \
  --cli-name toolbox
```

Notes:

- Collision flow: interactive overwrite/example/skip with “all” variants; CI defaults to skip unless `--force`. See [init](./shipped/init.md).
- The CLI skeleton wires the plugin‑first host; `__CLI_NAME__` tokens are replaced with your chosen name.

Minimal skeleton (DX‑friendly; no explicit types or casts):

```ts
#!/usr/bin/env node
import { createCli } from '@karmaniverous/get-dotenv/cli';
import { helloPlugin } from './plugins/hello';

const run = createCli({
  alias: '__CLI_NAME__',
  importMetaUrl: import.meta.url,
  compose: (p) => p.use(helloPlugin()),
});

await run();
```
