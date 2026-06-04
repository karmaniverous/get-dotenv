---
title: aws
---

# Shipped Plugins: aws

The aws plugin establishes an AWS session once per invocation, writes the resolved region and credentials to `process.env`, and publishes a minimal, non‑sensitive breadcrumb under `ctx.plugins.aws` for downstream consumers. It also provides a small `aws` subcommand for session establishment and optional forwarding to the AWS CLI.

This plugin is intended to be the parent for child plugins that need AWS auth. Compose your child plugin under `awsPlugin()` so that ordering and context are guaranteed: the aws parent resolves profile/region/credentials first; the child runs afterward and can safely use the AWS SDK (v3) with the environment already in place.

At a glance:

- Resolution precedence (profile/region/credentials)
- Always‑on env writes (region + credentials)
- Minimal metadata mirrored under `ctx.plugins.aws` (e.g., `{ profile?, region? }`)
- A simple `aws` subcommand to resolve a session and optionally forward to the AWS CLI

## How it works (high level)

- Profile resolve:
  - From config (`plugins.aws.profile`) → dotenv (`AWS_LOCAL_PROFILE`) → dotenv fallback (`AWS_PROFILE`) → undefined.
- Region resolve:
  - From config (`plugins.aws.region`) → dotenv (`AWS_REGION`) → `aws configure get region --profile <profile>` (best‑effort) → `plugins.aws.defaultRegion`.
- Credentials resolve (strategy: `cli-export` default):
  - If a profile is selected (from flags/config/dotenv), it wins over ambient env credentials: the plugin resolves credentials for that profile via the AWS CLI (`aws configure export-credentials`, with optional SSO login-on-demand) and then applies them to `process.env`.
  - If no profile is selected, the plugin falls back to ambient credentials from `process.env` (`AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` + optional `AWS_SESSION_TOKEN`) when present.
  - Export-credentials formats: the plugin prefers `aws configure export-credentials --format process` first, then tries platform-appropriate env-like formats (PowerShell / windows-cmd / env / env-no-export), then falls back to the AWS CLI default output when needed.
  - If export fails and the profile looks like SSO and `loginOnDemand` is true, the plugin runs `aws sso login --profile <profile>` once and retries export.
  - As a last resort, it falls back to `aws configure get aws_access_key_id`, `aws_secret_access_key`, and optional `aws_session_token`.
- Effects:
  - Writes `AWS_REGION` and (when unset) `AWS_DEFAULT_REGION` into `process.env`.
  - Ensures mutually exclusive AWS credential sources in `process.env`:
    - When using static/exported credentials: clears `AWS_PROFILE` / `AWS_DEFAULT_PROFILE` / `AWS_SDK_LOAD_CONFIG`.
    - When using a profile (SSO): clears static credential vars (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`) and sets `AWS_PROFILE` / `AWS_DEFAULT_PROFILE` / `AWS_SDK_LOAD_CONFIG=1`.
  - When credentials are resolved, writes `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and optional `AWS_SESSION_TOKEN` to `process.env`.
  - Mirrors non‑sensitive metadata only (`{ profile?, region? }`) under `ctx.plugins.aws`.
  - Child plugins can rely on `process.env` for AWS SDK default providers and can read profile/region via `ctx.plugins.aws`.

## Options and flags

You can configure the aws plugin via getdotenv config (JSON/YAML/JS/TS) and/or via the `aws` subcommand flags. Config is recommended for defaults; flags are useful per‑run.

Config keys (under `plugins.aws`):

- `profile?: string` — preferred AWS profile
- `region?: string` — preferred region
- `defaultRegion?: string` — fallback region when none can be detected
- `profileKey?: string` — dotenv/config key for local profile (default: `"AWS_LOCAL_PROFILE"`)
- `profileFallbackKey?: string` — fallback dotenv/config key for profile (default: `"AWS_PROFILE"`)
- `regionKey?: string` — dotenv/config key for region (default: `"AWS_REGION"`)
- `strategy?: "cli-export" | "none"` — credential acquisition strategy (default `"cli-export"`). Use `"none"` to skip credential resolution; region resolution still applies.
- `loginOnDemand?: boolean` — attempt `aws sso login` once when export fails for SSO profiles (default `false`)

Subcommand flags (map directly to config for effective defaults):

- `--login-on-demand` / `--no-login-on-demand` — enable/disable SSO login retry
- `--profile <string>` — override profile
- `--region <string>` — override region
- `--default-region <string>` — override fallback region
- `--strategy <string>` — `cli-export` | `none`
- `--profile-key <string>` — override config key name for profile (`AWS_LOCAL_PROFILE` by default)
- `--profile-fallback-key <string>` — override fallback key (`AWS_PROFILE` by default)
- `--region-key <string>` — override config key name for region (`AWS_REGION` by default)

Note on capture: The shipped host treats `--capture` (or `GETDOTENV_STDIO=pipe`) as a global behavior. The aws subcommand honors it when forwarding to the AWS CLI and in child processes; when piped, the current executor re-emits buffered stdout (stderr is not re-emitted by default).

## Config examples

JSON:

```json
{
  "plugins": {
    "aws": {
      "profile": "dev",
      "region": "us-east-1",
      "defaultRegion": "us-east-1",
      "strategy": "cli-export",
      "loginOnDemand": true
    }
  }
}
```

YAML:

```yaml
plugins:
  aws:
    profile: dev
    region: us-east-1
    defaultRegion: us-east-1
    strategy: cli-export
    loginOnDemand: true
```

JS/TS (dynamic allowed): Same keys as above; you can also compute values at runtime.

## Authoring child plugins (recommended pattern)

Compose your plugin as a child of the aws plugin so that auth is established first. Your plugin should:

- Read region/profile from `ctx.plugins.aws` (non‑sensitive metadata).
- Use AWS SDK v3 (or any AWS client) that respects `process.env` for credentials.
- Avoid duplicating profile/credential logic. Let the aws parent resolve and publish.

### Example: whoami child plugin (STS GetCallerIdentity)

Install the AWS SDK client:

```bash
npm i @aws-sdk/client-sts
```

Author the child plugin:

```ts
import { definePlugin } from '@karmaniverous/get-dotenv/cliHost';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

export const whoamiPlugin = () =>
  definePlugin({
    ns: 'whoami',
    setup(cli) {
      cli
        .description('Print AWS caller identity (uses parent aws session)')
        .action(async () => {
          // The AWS SDK default providers will read credentials from process.env,
          // which the aws parent has already populated.
          const client = new STSClient();
          const result = await client.send(new GetCallerIdentityCommand());
          console.log(JSON.stringify(result, null, 2));
        });
    },
  });
```

Wire the child under the aws parent:

```ts
#!/usr/bin/env node
import { createCli } from '@karmaniverous/get-dotenv/cli';
import { awsPlugin } from '@karmaniverous/get-dotenv/plugins';
import { whoamiPlugin } from './plugins/aws-whoami';

const run = createCli({
  alias: 'mycli',
  compose: (p) => p.use(awsPlugin().use(whoamiPlugin())),
});

await run();
```

Usage:

```bash
# Establish session and then print identity
mycli aws --login-on-demand whoami
```

Notes:

- Composition (`awsPlugin().use(whoamiPlugin())`) guarantees that the aws parent resolves profile/region/credentials before the child runs.
- The child plugin does not need to manage profile/credential logic. The default AWS SDK providers will use environment variables populated by the aws parent.
- For diagnostics without altering behavior, run with `--capture` or set `GETDOTENV_STDIO=pipe` to buffer outputs deterministically in CI.

## Session‑only and AWS CLI forwarding

The `aws` subcommand establishes the session and can optionally forward to the AWS CLI:

- Session only:

```bash
mycli aws --profile dev --region us-east-1
```

Writes region and credentials to `process.env`, mirrors `{ profile, region }` to `ctx.plugins.aws`, then exits.

- Forward to AWS CLI:

```bash
mycli aws -- sts get-caller-identity
```

Tokens after `--` are forwarded to `aws …`. The subprocess runs with an environment composed from `{ ...process.env, ...ctx.dotenv }` and honors capture (`--capture` or `GETDOTENV_STDIO=pipe`).

## Security & behavior notes

- The plugin writes standard AWS environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, optional `AWS_SESSION_TOKEN`) to `process.env` for this process only. It also ensures `AWS_REGION` is set and synchronizes `AWS_DEFAULT_REGION` when missing.
- Only non‑sensitive metadata is mirrored under `ctx.plugins.aws`. Credentials are not mirrored there.
- With `strategy: "none"`, credential resolution is skipped; region resolution still applies. This can be useful when credentials arrive via other means (e.g., container IMDS or an external provider), but you still want normalized region handling.
