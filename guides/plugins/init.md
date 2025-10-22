---
title: Init plugin
---

# Init plugin

Scaffold get‑dotenv config files and a host‑based CLI skeleton with safe
collision flow and CI heuristics.

## Import paths

```ts
// Recommended: plugins barrel (shares type identity with cliHost)
import { initPlugin } from '@karmaniverous/get-dotenv/plugins';
```

Per‑plugin subpaths remain available when needed:

```ts
import { initPlugin } from '@karmaniverous/get-dotenv/plugins/init';
```

## Command

```bash
getdotenv init [dest] [options]
```

Options:

- `--config-format <json|yaml|js|ts>` Config format (default: `json`)
- `--with-local` Include the `.local` variant (JSON/YAML)
- `--dynamic` Include dynamic examples (JS/TS configs)
- `--cli-name <string>` CLI name for skeleton and token replacement
- `--force` Overwrite all existing files
- `--yes` Skip all collisions (no overwrite)

## Behavior

- Templates are shipped and copied verbatim (no inline codegen).
- Collision flow supports `[o/e/s]` and “all” variants `[O/E/S]`.
- Non‑interactive detection (CI, no‑TTY) defaults to `--yes` unless `--force`.
- Precedence: `--force` > `--yes` > auto‑detect.
- Adds/updates `.gitignore` to include `getdotenv.config.local.*` and `*.local`.

## Examples

JSON + local + CLI named “acme”:

```bash
getdotenv init . \
  --config-format json \
  --with-local \
  --cli-name acme \
  --force
```

TypeScript config + CLI named “toolbox”:

```bash
getdotenv init ./apps/toolbox \
  --config-format ts \
  --cli-name toolbox
```

## Generated files

- `getdotenv.config.*` (public; and `.local` if requested)
- `src/cli/<name>/index.ts` and `src/cli/<name>/plugins/hello.ts` skeleton

## Notes

- You can edit the scaffolded CLI to install plugins:

```ts
import type { Command } from 'commander';
import { GetDotenvCli } from '@karmaniverous/get-dotenv/cliHost';
import { batchPlugin } from '@karmaniverous/get-dotenv/plugins/batch';
import { awsPlugin } from '@karmaniverous/get-dotenv/plugins/aws';

const program: Command = new GetDotenvCli('acme')
  .use(batchPlugin())
  .use(awsPlugin());

await (program as unknown as GetDotenvCli).resolveAndLoad();
await program.parseAsync();
```
