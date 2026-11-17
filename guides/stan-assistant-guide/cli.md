---
title: 'CLI Usage'
---

# CLI Usage

The shipped CLI is plugin-first and includes: `cmd`, `batch`, `aws` (+ `aws whoami`), `init`.

Quick run:

```bash
npx @karmaniverous/get-dotenv -c 'echo $APP_SETTING'
```

Key root flags:

- `-e, --env <string>` select environment
- `--paths <string>` (delimited list)
- `--dotenv-token <string>`, `--private-token <string>`
- `-s, --shell [string]` (default OS shell), `-S, --shell-off`
- `--capture` or `GETDOTENV_STDIO=pipe` for deterministic CI output
- `--trace [keys...]` print diagnostics
- `--redact` / `--redact-off` + `--redact-pattern` (adds to the built-in patterns)
- `--entropy-warn` / `--entropy-warn-off`, `--entropy-threshold <number>`, `--entropy-min-length <number>`, `--entropy-whitelist` (adds to the built-in whitelist)

## Embedding the shipped CLI: `createCli()`

Use `createCli` to embed a ready-to-run CLI host.

```ts
#!/usr/bin/env node
import { createCli } from '@karmaniverous/get-dotenv/cli';

await createCli({ alias: 'toolbox', importMetaUrl: import.meta.url })();
```

Customize plugins:

```ts
import { createCli } from '@karmaniverous/get-dotenv/cli';
import { cmdPlugin, batchPlugin } from '@karmaniverous/get-dotenv/plugins';

const run = createCli({
  alias: 'toolbox',
  importMetaUrl: import.meta.url,
  compose: (p) => p.use(cmdPlugin({ asDefault: true })).use(batchPlugin()),
});
await run();
```

Host identity (`importMetaUrl` is required; `createCli()` without it throws):

- The host root is the nearest `package.json` above `importMetaUrl`. It supplies the packaged config layer (`<hostRoot>/getdotenv.config.*`, replacing get-dotenv's own), the `--version` (`package.json` `version`, or the `version` option) and the root description (`package.json` `description`, or the `description` option).
- When the host root is the project root (a CLI that lives in the repo it runs in), the packaged layer is skipped, so the config applies once.
- A direct host sets its root with `new GetDotenvCli(alias, { importMetaUrl })` or `brand({ importMetaUrl })` (last one wins); with neither it keeps get-dotenv's root.
- `init` always copies templates from get-dotenv's own package.
- A runner may be called more than once; `-V, --version` is registered once.
