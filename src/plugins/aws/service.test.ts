import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  parseExportCredentialsEnv,
  parseExportCredentialsJson,
  resolveAwsContext,
} from './service';
import type { AwsPluginConfig } from './types';

// Mock the exec seam used by the service.
const runCommandResultMock = vi.fn<
  (
    cmd: string | string[],
    shell: string | boolean | URL,
    opts?: Record<string, unknown>,
  ) => Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
  }>
>();
vi.mock('../../cliCore/exec', () => ({
  runCommandResult: (
    cmd: string | string[],
    shell: string | boolean | URL,
    opts?: Record<string, unknown>,
  ) => runCommandResultMock(cmd, shell, opts ?? {}),
}));

const baseCfg: AwsPluginConfig = {
  strategy: 'cli-export',
  loginOnDemand: false,
  profileKey: 'AWS_LOCAL_PROFILE',
  profileFallbackKey: 'AWS_PROFILE',
  regionKey: 'AWS_REGION',
};

describe('plugins/aws/service parsers', () => {
  it('parseExportCredentialsJson tolerant shapes', () => {
    const a = parseExportCredentialsJson(
      JSON.stringify({
        AccessKeyId: 'A',
        SecretAccessKey: 'S',
        SessionToken: 'T',
      }),
    );
    expect(a).toEqual({
      accessKeyId: 'A',
      secretAccessKey: 'S',
      sessionToken: 'T',
    });
    const b = parseExportCredentialsJson(
      JSON.stringify({
        Credentials: { AccessKeyId: 'A', SecretAccessKey: 'S' },
      }),
    );
    expect(b).toEqual({ accessKeyId: 'A', secretAccessKey: 'S' });
  });

  it('parseExportCredentialsEnv supports POSIX and PowerShell', () => {
    const posix = `export AWS_ACCESS_KEY_ID=AKIA
export AWS_SECRET_ACCESS_KEY=SECRET
export AWS_SESSION_TOKEN="TOKEN"`;
    expect(parseExportCredentialsEnv(posix)).toEqual({
      accessKeyId: 'AKIA',
      secretAccessKey: 'SECRET',
      sessionToken: 'TOKEN',
    });

    const ps = `$Env:AWS_ACCESS_KEY_ID="AKIA"
$Env:AWS_SECRET_ACCESS_KEY="SECRET"
$Env:AWS_SESSION_TOKEN='TOKEN'`;
    expect(parseExportCredentialsEnv(ps)).toEqual({
      accessKeyId: 'AKIA',
      secretAccessKey: 'SECRET',
      sessionToken: 'TOKEN',
    });
  });
});

describe('plugins/aws/service.resolveAwsContext', () => {
  beforeEach(() => {
    runCommandResultMock.mockReset();
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_SESSION_TOKEN;
  });

  it('env-first credentials (no CLI calls)', async () => {
    process.env.AWS_ACCESS_KEY_ID = 'AKIA';
    process.env.AWS_SECRET_ACCESS_KEY = 'SECRET';
    const out = await resolveAwsContext({
      dotenv: {} as Record<string, string | undefined>,
      cfg: baseCfg,
    });
    expect(out.credentials).toEqual({
      accessKeyId: 'AKIA',
      secretAccessKey: 'SECRET',
    });
    expect(runCommandResultMock).not.toHaveBeenCalled();
  });

  it('export-credentials (JSON path)', async () => {
    const json = JSON.stringify({
      AccessKeyId: 'A',
      SecretAccessKey: 'S',
      SessionToken: 'T',
    });
    // First call: export with --format json -> success
    runCommandResultMock.mockResolvedValueOnce({
      exitCode: 0,
      stdout: json,
      stderr: '',
    });
    const out = await resolveAwsContext({
      dotenv: { AWS_LOCAL_PROFILE: 'dev' },
      cfg: baseCfg,
    });
    expect(out.credentials).toEqual({
      accessKeyId: 'A',
      secretAccessKey: 'S',
      sessionToken: 'T',
    });
  });

  it('export-credentials fallback to env-lines', async () => {
    // First call (json) fails, second (env) succeeds
    runCommandResultMock
      .mockResolvedValueOnce({ exitCode: 1, stdout: '', stderr: 'no json' })
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout:
          'export AWS_ACCESS_KEY_ID=AKIA\nexport AWS_SECRET_ACCESS_KEY=SECRET',
        stderr: '',
      });
    const out = await resolveAwsContext({
      dotenv: { AWS_PROFILE: 'dev' },
      cfg: baseCfg,
    });
    expect(out.credentials).toEqual({
      accessKeyId: 'AKIA',
      secretAccessKey: 'SECRET',
    });
  });

  it('static fallback when export fails', async () => {
    // export json/env both fail
    runCommandResultMock
      .mockResolvedValueOnce({ exitCode: 1, stdout: '', stderr: '' }) // export json
      .mockResolvedValueOnce({ exitCode: 1, stdout: '', stderr: '' }) // export env
      // sso_session get -> empty (not SSO)
      .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' })
      // aws_access_key_id
      .mockResolvedValueOnce({ exitCode: 0, stdout: 'AKIA', stderr: '' })
      // aws_secret_access_key
      .mockResolvedValueOnce({ exitCode: 0, stdout: 'SECRET', stderr: '' })
      // aws_session_token (optional, missing)
      .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' });
    const out = await resolveAwsContext({
      dotenv: { AWS_LOCAL_PROFILE: 'dev' },
      cfg: baseCfg,
    });
    expect(out.credentials).toEqual({
      accessKeyId: 'AKIA',
      secretAccessKey: 'SECRET',
    });
  });

  it('SSO loginOnDemand retry when export fails and sso_session present', async () => {
    // export json/env both fail initially
    runCommandResultMock
      .mockResolvedValueOnce({ exitCode: 1, stdout: '', stderr: '' }) // export json
      .mockResolvedValueOnce({ exitCode: 1, stdout: '', stderr: '' }) // export env
      // sso_session get -> present
      .mockResolvedValueOnce({ exitCode: 0, stdout: 'mysession', stderr: '' })
      // aws sso login
      .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' })
      // retry export json -> success
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: JSON.stringify({ AccessKeyId: 'A', SecretAccessKey: 'S' }),
        stderr: '',
      });
    const out = await resolveAwsContext({
      dotenv: { AWS_PROFILE: 'dev' },
      cfg: { ...baseCfg, loginOnDemand: true },
    });
    expect(out.credentials).toEqual({ accessKeyId: 'A', secretAccessKey: 'S' });
  });
});
