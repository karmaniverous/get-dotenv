---
title: aws
---

# Shipped Plugins: aws

The AWS plugin resolves profile/region and acquires credentials using a safe cascade, writes them to `process.env`, and mirrors non‑sensitive metadata under `ctx.plugins.aws`. It also provides an `aws` subcommand to establish a session and optionally forward to the AWS CLI.

## What it does

Resolution precedence:

1. Profile

- `plugins.aws.profile` (config override) → `ctx.dotenv['AWS_LOCAL_PROFILE']` → `ctx.dotenv['AWS_PROFILE']` → undefined

2. Region

- `plugins.aws.region` (config override) → `ctx.dotenv['AWS_REGION']` → best‑effort `aws configure get region --profile <profile>` → `plugins.aws.defaultRegion`

3. Credentials (strategy: `cli-export` by default)

- Env‑first: if `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are set, they’re used and no CLI calls are made.
- Otherwise, try `aws configure export-credentials` (JSON, then env‑lines).
- If export fails and the profile looks like SSO and `loginOnDemand` is true, run `aws sso login --profile <profile>` once, then retry export.
- Static fallback: `aws configure get aws_access_key_id/secret_access_key[/aws_session_token]`.

Effects:

- Always write `AWS_REGION` and (if unset) `AWS_DEFAULT_REGION`, plus credentials variables to `process.env`.
- Mirror non‑sensitive metadata only: `{ profile?, region? }` is always published under `ctx.plugins.aws`. Credentials are intentionally not mirrored there; they still flow to child processes via env injection when forwarding.

## Config (plugins.aws)

Config keys (JSON/YAML/JS/TS under `plugins.aws`):

```json
{
  "plugins": {
    "aws": {
      "profile": "dev",
      "region": "us-east-1",
      "defaultRegion": "us-east-1",
      "profileKey": "AWS_LOCAL_PROFILE",
      "profileFallbackKey": "AWS_PROFILE",
      "regionKey": "AWS_REGION",
      "strategy": "cli-export",
      "loginOnDemand": true
    }
  }
}
```

All fields are optional; defaults favor `cli-export`.

## Subcommand: `aws`

Establish a session and optionally forward to the AWS CLI.

- Session only (no forwarding):

```bash
getdotenv aws --profile dev --region us-east-1
```

Writes region/credentials into `process.env`, mirrors `{ profile?, region? }` into `ctx.plugins.aws`, and exits 0.

- Forward to AWS CLI:

```bash
getdotenv aws -- sts get-caller-identity
```

Forwarded tokens appear after `--`. The subprocess is invoked with:

- Explicit env injection: `{ ...process.env, ...ctx.dotenv }`
- `stdio`: inherits by default; use `--capture` or `GETDOTENV_STDIO=pipe` for deterministic buffering in CI.
- Shell resolution: honors per‑script overrides and the global shell setting (see the [Shell execution behavior](../shell.md) guide).

## Usage examples

Session only (respecting config and dotenv overlays):

```bash
getdotenv aws --login-on-demand
```

Assuming `plugins.aws` in your config sets `profile: "dev"`, the plugin will log in if required and populate both `process.env` and `ctx.plugins.aws`.

Forward to AWS:

```bash
getdotenv --capture aws -- sts get-caller-identity
```

Runs the AWS CLI with captured stdout/stderr (buffered and re‑emitted), using a child env composed from the current context.

## Import paths

```ts
// Recommended: plugins barrel (shares type identity with cliHost)
import { awsPlugin } from '@karmaniverous/get-dotenv/plugins';
```

Use it with the plugin‑first host:

```ts
import type { Command } from 'commander';
import { GetDotenvCli } from '@karmaniverous/get-dotenv/cliHost';
import { awsPlugin } from '@karmaniverous/get-dotenv/plugins';

const program: Command = new GetDotenvCli('mycli').use(awsPlugin());

await (program as unknown as GetDotenvCli).resolveAndLoad();
await program.parseAsync();
```

Per‑plugin subpaths remain available when needed:

```ts
import { awsPlugin } from '@karmaniverous/get-dotenv/plugins/aws';
```

## Typed config (DX)

You can retrieve the validated, merged plugin config slice with strong typing using the helper:

```ts
import { definePlugin } from '@karmaniverous/get-dotenv/cliHost';
import type { AwsPluginConfig } from '@karmaniverous/get-dotenv/plugins/aws';

export const myAwsAwarePlugin = () => {
  const plugin = definePlugin({
    id: 'my-aws',
    setup(cli) {
      const cfg = plugin.readConfig<AwsPluginConfig>(cli);
      // cfg.profile / cfg.region / cfg.strategy ... are strongly typed here
    },
  });
  return plugin;
};
```

## Notes and caveats

- The plugin ensures `AWS_REGION` is set and copies it to `AWS_DEFAULT_REGION` if that var is unset for broader compatibility.
- SSO login is best‑effort and only triggered when export fails and the profile looks like SSO; static profiles fall back to credential getters.
- Forwarding respects `--trace` diagnostics and `--capture`; see the Shell and Plugin‑first host guides for details.
