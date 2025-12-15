import { runCommand, runCommandResult } from '@/src/cliHost';

import type { AwsContext, AwsCredentials } from './types';
import type { ResolveAwsContextOptions } from './types';

const AWS_CLI_TIMEOUT_MS = 15_000;

const trim = (s: unknown) => (typeof s === 'string' ? s.trim() : '');
const unquote = (s: string) =>
  s.length >= 2 &&
  ((s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'")))
    ? s.slice(1, -1)
    : s;
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
    if (ak && sk)
      return {
        accessKeyId: ak,
        secretAccessKey: sk,
        ...(tk ? { sessionToken: tk } : {}),
      };
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
    let v = unquote(valRaw.trim());
    // Drop trailing semicolons if present (some shells)
    v = v.replace(/;$/, '');
    if (k === 'AWS_ACCESS_KEY_ID') id = v;
    else if (k === 'AWS_SECRET_ACCESS_KEY') secret = v;
    else if (k === 'AWS_SESSION_TOKEN') token = v;
  }
  if (id && secret)
    return {
      accessKeyId: id,
      secretAccessKey: secret,
      ...(token ? { sessionToken: token } : {}),
    };
  return undefined;
};

const getAwsConfigure = async (
  key: string,
  profile: string,
  timeoutMs = AWS_CLI_TIMEOUT_MS,
): Promise<string | undefined> => {
  const r = await runCommandResult(
    ['aws', 'configure', 'get', key, '--profile', profile],
    false,
    {
      env: process.env,
      timeoutMs,
    },
  );
  // Guard for mocked undefined in tests; keep narrow lint scope.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!r || typeof r.exitCode !== 'number') return undefined;
  if (r.exitCode === 0) {
    const v = trim(r.stdout);
    return v.length > 0 ? v : undefined;
  }
  return undefined;
};

const exportCredentials = async (
  profile: string,
  timeoutMs = AWS_CLI_TIMEOUT_MS,
): Promise<AwsCredentials | undefined> => {
  const tryExport = async (
    format?: string,
  ): Promise<AwsCredentials | undefined> => {
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

  // Prefer the default/JSON "process" format first; then fall back to shell env outputs.
  // Note: AWS CLI v2 supports: process | env | env-no-export | powershell | windows-cmd
  const formats: string[] = [
    'process',
    ...(process.platform === 'win32'
      ? ['powershell', 'windows-cmd', 'env', 'env-no-export']
      : ['env', 'env-no-export']),
  ];
  for (const f of formats) {
    const creds = await tryExport(f);
    if (creds) return creds;
  }
  // Final fallback: no --format (AWS CLI default output)
  return tryExport(undefined);
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

  let region: string | undefined = cfg.region ?? dotenv[regionKey] ?? undefined;

  // Short-circuit when strategy is disabled.
  if (cfg.strategy === 'none') {
    // If region is still missing and we have a profile, try best-effort region resolve.
    if (!region && profile) region = await getAwsConfigure('region', profile);
    if (!region && cfg.defaultRegion) region = cfg.defaultRegion;
    const out: AwsContext = {};
    if (profile !== undefined) out.profile = profile;
    if (region !== undefined) out.region = region;
    return out;
  }

  let credentials: AwsCredentials | undefined;

  // Profile wins over ambient env creds when present (from flags/config/dotenv).
  if (profile) {
    // Try export-credentials
    credentials = await exportCredentials(profile);

    // On failure, detect SSO and optionally login then retry
    if (!credentials) {
      const ssoSession = await getAwsConfigure('sso_session', profile);
      // Legacy SSO profiles use sso_start_url/sso_region rather than sso_session.
      const ssoStartUrl = await getAwsConfigure('sso_start_url', profile);
      const looksSSO =
        (typeof ssoSession === 'string' && ssoSession.length > 0) ||
        (typeof ssoStartUrl === 'string' && ssoStartUrl.length > 0);
      if (looksSSO && cfg.loginOnDemand) {
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
        credentials = await exportCredentials(profile);
      }
    }

    // Static fallback if still missing.
    if (!credentials) {
      const id = await getAwsConfigure('aws_access_key_id', profile);
      const secret = await getAwsConfigure('aws_secret_access_key', profile);
      const token = await getAwsConfigure('aws_session_token', profile);
      if (id && secret) {
        credentials = {
          accessKeyId: id,
          secretAccessKey: secret,
          ...(token ? { sessionToken: token } : {}),
        };
      }
    }
  } else {
    // Env-first credentials when no profile is present.
    const envId = trim(process.env.AWS_ACCESS_KEY_ID);
    const envSecret = trim(process.env.AWS_SECRET_ACCESS_KEY);
    const envToken = trim(process.env.AWS_SESSION_TOKEN);
    if (envId && envSecret) {
      credentials = {
        accessKeyId: envId,
        secretAccessKey: envSecret,
        ...(envToken ? { sessionToken: envToken } : {}),
      };
    }
  }

  // Final region resolution
  if (!region && profile) region = await getAwsConfigure('region', profile);
  if (!region && cfg.defaultRegion) region = cfg.defaultRegion;

  const out: AwsContext = {};
  if (profile !== undefined) out.profile = profile;
  if (region !== undefined) out.region = region;
  if (credentials) out.credentials = credentials;
  return out;
};
