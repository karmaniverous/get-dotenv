import { runCommandResult } from '../../cliCore/exec';
import type { ProcessEnv } from '../../GetDotenvOptions';
import type {
  AwsContext,
  AwsCredentials,
  AwsPluginConfigResolved,
} from './types';

const DEFAULT_TIMEOUT_MS = 15_000;

const trim = (s: unknown) => (typeof s === 'string' ? s.trim() : '');
const unquote = (s: string) =>
  s.length >= 2 &&
  ((s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'")))
    ? s.slice(1, -1)
    : s;
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
    // POSIX: export AWS_ACCESS_KEY_ID=..., export AWS_SECRET_ACCESS_KEY=..., export AWS_SESSION_TOKEN=...
    let m = /^export\s+([A-Z0-9_]+)\s*=\s*(.+)$/.exec(line);
    if (!m) {
      // PowerShell: $Env:AWS_ACCESS_KEY_ID="...", etc.
      m = /^\$Env:([A-Z0-9_]+)\s*=\s*(.+)$/.exec(line);
    }
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
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<string | undefined> => {
  const r = await runCommandResult(
    ['aws', 'configure', 'get', key, '--profile', profile],
    false,
    {
      env: process.env,
      timeoutMs,
    },
  );
  if (!r || typeof r.exitCode !== 'number') return undefined;
  if (r.exitCode === 0) {
    const v = trim(r.stdout);
    return v.length > 0 ? v : undefined;
  }
  return undefined;
};

const exportCredentials = async (
  profile: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<AwsCredentials | undefined> => {
  // Try JSON format first (AWS CLI v2)
  const rJson = await runCommandResult(
    [
      'aws',
      'configure',
      'export-credentials',
      '--profile',
      profile,
      '--format',
      'json',
    ],
    false,
    { env: process.env, timeoutMs },
  );
  if (rJson.exitCode === 0) {
    const creds = parseExportCredentialsJson(rJson.stdout);
    if (creds) return creds;
  }
  // Fallback: env lines
  const rEnv = await runCommandResult(
    ['aws', 'configure', 'export-credentials', '--profile', profile],
    false,
    { env: process.env, timeoutMs },
  );
  if (rEnv.exitCode === 0) {
    const creds = parseExportCredentialsEnv(rEnv.stdout);
    if (creds) return creds;
  }
  return undefined;
};

export const resolveAwsContext = async ({
  dotenv,
  cfg,
}: {
  dotenv: ProcessEnv;
  cfg: AwsPluginConfigResolved;
}): Promise<AwsContext> => {
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
  // Env-first credentials.
  let credentials: AwsCredentials | undefined;
  const envId = trim(process.env.AWS_ACCESS_KEY_ID);
  const envSecret = trim(process.env.AWS_SECRET_ACCESS_KEY);
  const envToken = trim(process.env.AWS_SESSION_TOKEN);
  if (envId && envSecret) {
    credentials = {
      accessKeyId: envId,
      secretAccessKey: envSecret,
      ...(envToken ? { sessionToken: envToken } : {}),
    };
  } else if (profile) {
    // Try export-credentials
    credentials = await exportCredentials(profile);

    // On failure, detect SSO and optionally login then retry
    if (!credentials) {
      const ssoSession = await getAwsConfigure('sso_session', profile);
      const looksSSO = typeof ssoSession === 'string' && ssoSession.length > 0;
      if (looksSSO && cfg.loginOnDemand) {
        // Best-effort login, then retry export once.
        await runCommandResult(
          ['aws', 'sso', 'login', '--profile', profile],
          false,
          {
            env: process.env,
            timeoutMs: DEFAULT_TIMEOUT_MS,
          },
        );
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
