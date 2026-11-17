import { runCommand, runCommandResult, stripOne } from '@/src/cliHost';

import type { AwsContext, AwsCredentials } from './types';
import type { ResolveAwsContextOptions } from './types';

// Keep AWS CLI probing bounded so the aws plugin does not stall unrelated commands.
// This is especially important when a profile is present but SSO refresh/export
// is slow or blocked (common on Windows).
const AWS_CLI_TIMEOUT_MS = 3_000;
const AWS_CLI_BUDGET_MS = 9_000;

const pickTimeoutMs = (deadlineMs?: number): number => {
  if (typeof deadlineMs !== 'number') return AWS_CLI_TIMEOUT_MS;
  const remaining = deadlineMs - Date.now();
  if (remaining <= 0) return 0;
  return Math.min(AWS_CLI_TIMEOUT_MS, remaining);
};

const trim = (s: unknown) => (typeof s === 'string' ? s.trim() : '');

// Credentials from an access key id, secret and optional session token; none
// unless both the id and the secret are set.
const credentialsOf = (
  id: string | undefined,
  secret: string | undefined,
  token: string | undefined,
): AwsCredentials | undefined =>
  id && secret
    ? {
        accessKeyId: id,
        secretAccessKey: secret,
        ...(token ? { sessionToken: token } : {}),
      }
    : undefined;
/**
 * Parse AWS credentials from JSON output (AWS CLI v2 export-credentials).
 *
 * @param txt - Raw stdout text from the AWS CLI.
 * @returns Parsed credentials, or `undefined` when the input is not recognized.
 */
export const parseExportCredentialsJson = (
  txt: string,
): AwsCredentials | undefined => {
  try {
    const obj = JSON.parse(txt) as
      | {
          AccessKeyId?: string;
          SecretAccessKey?: string;
          SessionToken?: string;
        }
      | {
          Credentials?: {
            AccessKeyId?: string;
            SecretAccessKey?: string;
            SessionToken?: string;
          };
        };
    const src = (obj as { Credentials?: unknown }).Credentials ?? obj;
    const ak = (src as { AccessKeyId?: string }).AccessKeyId;
    const sk = (src as { SecretAccessKey?: string }).SecretAccessKey;
    const tk = (src as { SessionToken?: string }).SessionToken;
    return credentialsOf(ak, sk, tk);
  } catch {
    /* ignore */
  }
  return undefined;
};

/**
 * Parse AWS credentials from environment-export output (shell-agnostic).
 * Supports POSIX `export KEY=VAL` and PowerShell `$Env:KEY=VAL`.
 * Also supports AWS CLI `windows-cmd` (`set KEY=VAL`) and `env-no-export` (`KEY=VAL`).
 *
 * @param txt - Raw stdout text from the AWS CLI.
 * @returns Parsed credentials, or `undefined` when the input is not recognized.
 */
export const parseExportCredentialsEnv = (
  txt: string,
): AwsCredentials | undefined => {
  const lines = txt.split(/\r?\n/);
  let id: string | undefined;
  let secret: string | undefined;
  let token: string | undefined;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    // POSIX: export AWS_ACCESS_KEY_ID=..., ...
    let m: RegExpExecArray | null = /^export\s+([A-Z0-9_]+)\s*=\s*(.+)$/.exec(
      line,
    );
    // PowerShell: $Env:AWS_ACCESS_KEY_ID="...", etc.
    if (!m) m = /^\$Env:([A-Z0-9_]+)\s*=\s*(.+)$/i.exec(line);
    // Windows cmd: set AWS_ACCESS_KEY_ID=..., etc.
    if (!m) m = /^(?:set)\s+([A-Z0-9_]+)\s*=\s*(.+)$/i.exec(line);
    // env-no-export: AWS_ACCESS_KEY_ID=..., etc.
    if (!m) m = /^([A-Z0-9_]+)\s*=\s*(.+)$/.exec(line);
    if (!m) continue;
    const k = m[1];
    const valRaw = m[2];
    if (typeof valRaw !== 'string') continue;
    let v = stripOne(valRaw.trim());
    // Drop trailing semicolons if present (some shells)
    v = v.replace(/;$/, '');
    if (k === 'AWS_ACCESS_KEY_ID') id = v;
    else if (k === 'AWS_SECRET_ACCESS_KEY') secret = v;
    else if (k === 'AWS_SESSION_TOKEN') token = v;
  }
  return credentialsOf(id, secret, token);
};

const getAwsConfigure = async (
  key: string,
  profile: string,
  deadlineMs?: number,
): Promise<string | undefined> => {
  const timeoutMs = pickTimeoutMs(deadlineMs);
  if (timeoutMs <= 0) return undefined;
  const r = await runCommandResult(
    ['aws', 'configure', 'get', key, '--profile', profile],
    false,
    {
      env: process.env,
      timeoutMs,
    },
  );
  if (r.exitCode === 0) {
    const v = trim(r.stdout);
    return v.length > 0 ? v : undefined;
  }
  return undefined;
};

const exportCredentials = async (
  profile: string,
  deadlineMs?: number,
): Promise<AwsCredentials | undefined> => {
  const tryExport = async (
    format?: string,
  ): Promise<AwsCredentials | undefined> => {
    const timeoutMs = pickTimeoutMs(deadlineMs);
    if (timeoutMs <= 0) return undefined;
    const argv = [
      'aws',
      'configure',
      'export-credentials',
      '--profile',
      profile,
      ...(format ? (['--format', format] as const) : []),
    ];
    const r = await runCommandResult(argv, false, {
      env: process.env,
      timeoutMs,
    });
    if (r.exitCode !== 0) return undefined;
    const out = trim(r.stdout);
    if (!out) return undefined;
    // Some formats produce JSON ("process"), some produce shell-ish env lines.
    return parseExportCredentialsJson(out) ?? parseExportCredentialsEnv(out);
  };

  // Keep the probe set small; budgeted calls above prevent long hangs.
  const primary = await tryExport('process');
  if (primary) return primary;
  const secondary = await tryExport(
    process.platform === 'win32' ? 'powershell' : 'env',
  );
  if (secondary) return secondary;
  return tryExport(undefined);
};

// The region: the given one, else the profile's configured region, else
// `cfg.defaultRegion`.
const resolveRegion = async (
  region: string | undefined,
  profile: string | undefined,
  cfg: ResolveAwsContextOptions['cfg'],
  deadlineMs: number,
): Promise<string | undefined> => {
  let out = region;
  if (!out && profile)
    out = await getAwsConfigure('region', profile, deadlineMs);
  if (!out && cfg.defaultRegion) out = cfg.defaultRegion;
  return out;
};

// The context with only the parts that are set.
const contextOf = (
  profile: string | undefined,
  region: string | undefined,
  credentials?: AwsCredentials,
): AwsContext => {
  const out: AwsContext = {};
  if (profile !== undefined) out.profile = profile;
  if (region !== undefined) out.region = region;
  if (credentials) out.credentials = credentials;
  return out;
};

// Whether a profile is an SSO profile (`sso_session`, or the legacy
// `sso_start_url`).
const isSsoProfile = async (
  profile: string,
  deadlineMs: number,
): Promise<boolean> => {
  const ssoSession = await getAwsConfigure('sso_session', profile, deadlineMs);
  // Legacy SSO profiles use sso_start_url/sso_region rather than sso_session.
  const ssoStartUrl = await getAwsConfigure(
    'sso_start_url',
    profile,
    deadlineMs,
  );
  return (
    (typeof ssoSession === 'string' && ssoSession.length > 0) ||
    (typeof ssoStartUrl === 'string' && ssoStartUrl.length > 0)
  );
};

// A profile's credentials: export-credentials; on failure, for an SSO profile
// with `loginOnDemand`, an interactive login and one retry; then the
// profile's static keys. Returns the deadline left for later lookups: the
// login is outside the budget, so after it a fresh one starts (#80).
const profileCredentials = async (
  profile: string,
  cfg: ResolveAwsContextOptions['cfg'],
  deadline: number,
): Promise<{ credentials: AwsCredentials | undefined; deadlineMs: number }> => {
  let deadlineMs = deadline;
  // Try export-credentials
  let credentials = await exportCredentials(profile, deadlineMs);

  // On failure, detect SSO and optionally login then retry
  if (
    !credentials &&
    (await isSsoProfile(profile, deadlineMs)) &&
    cfg.loginOnDemand
  ) {
    // Interactive login (no timeout by default), then retry export once.
    const exit = await runCommand(
      ['aws', 'sso', 'login', '--profile', profile],
      false,
      {
        env: process.env,
        stdio: 'inherit',
      },
    );
    if (exit !== 0) {
      throw new Error(
        `aws sso login failed for profile '${profile}' (exit ${String(exit)})`,
      );
    }
    // The interactive login is outside the budget: the retry, the
    // static fallback and the region lookup get a fresh one (#80).
    deadlineMs = Date.now() + AWS_CLI_BUDGET_MS;
    credentials = await exportCredentials(profile, deadlineMs);
  }

  // Static fallback if still missing.
  credentials ??= credentialsOf(
    await getAwsConfigure('aws_access_key_id', profile, deadlineMs),
    await getAwsConfigure('aws_secret_access_key', profile, deadlineMs),
    await getAwsConfigure('aws_session_token', profile, deadlineMs),
  );
  return { credentials, deadlineMs };
};

/**
 * Resolve AWS context (profile, region, credentials) using configuration and environment.
 * Applies strategy (cli-export vs none) and handling for SSO login-on-demand.
 *
 * @param options - Context options including current dotenv and plugin config.
 * @returns A `Promise\<AwsContext\>` containing any resolved profile, region, and credentials.
 */
export const resolveAwsContext = async ({
  dotenv,
  cfg,
}: ResolveAwsContextOptions): Promise<AwsContext> => {
  const profileKey = cfg.profileKey ?? 'AWS_LOCAL_PROFILE';
  const profileFallbackKey = cfg.profileFallbackKey ?? 'AWS_PROFILE';
  const regionKey = cfg.regionKey ?? 'AWS_REGION';

  const profile =
    cfg.profile ??
    dotenv[profileKey] ??
    dotenv[profileFallbackKey] ??
    undefined;
  const region: string | undefined =
    cfg.region ?? dotenv[regionKey] ?? undefined;

  // Short-circuit when strategy is disabled: a best-effort region only.
  if (cfg.strategy === 'none')
    return contextOf(
      profile,
      await resolveRegion(region, profile, cfg, Date.now() + AWS_CLI_BUDGET_MS),
    );

  // Profile wins over ambient env creds when present (from flags/config/dotenv).
  let deadlineMs = Date.now() + AWS_CLI_BUDGET_MS;
  let credentials: AwsCredentials | undefined;
  if (profile) {
    ({ credentials, deadlineMs } = await profileCredentials(
      profile,
      cfg,
      deadlineMs,
    ));
  } else {
    // Env-first credentials when no profile is present.
    credentials = credentialsOf(
      trim(process.env.AWS_ACCESS_KEY_ID),
      trim(process.env.AWS_SECRET_ACCESS_KEY),
      trim(process.env.AWS_SESSION_TOKEN),
    );
  }

  return contextOf(
    profile,
    await resolveRegion(region, profile, cfg, deadlineMs),
    credentials,
  );
};
