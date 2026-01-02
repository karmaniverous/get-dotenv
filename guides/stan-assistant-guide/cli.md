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
- `--redact` / `--redact-off` + `--redact-pattern`
- `--entropy-warn` / `--entropy-warn-off`

## Embedding the shipped CLI: `createCli()`

Use `createCli` to embed a ready-to-run CLI host.

```ts
#!/usr/bin/env node
import { createCli } from '@karmaniverous/get-dotenv/cli';

await createCli({ alias: 'toolbox' })();
```

Customize plugins:

```ts
import { createCli } from '@karmaniverous/get-dotenv/cli';
import { cmdPlugin, batchPlugin } from '@karmaniverous/get-dotenv/plugins';

const run = createCli({
  alias: 'toolbox',
  compose: (p) => p.use(cmdPlugin({ asDefault: true })).use(batchPlugin()),
});
await run();
```
