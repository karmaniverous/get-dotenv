import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProcessEnv } from '@/src/core';

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
const runCommandMock =
  vi.fn<
    (
      cmd: string | readonly string[],
      shell: string | boolean | URL,
      opts?: Record<string, unknown>,
    ) => Promise<number>
  >();
vi.mock('../../cliHost/exec', () => ({
  runCommandResult: (
    cmd: string | string[],
    shell: string | boolean | URL,
    opts?: Record<string, unknown>,
  ) => runCommandResultMock(cmd, shell, opts ?? {}),
  runCommand: (
    cmd: string | readonly string[],
    shell: string | boolean | URL,
    opts?: Record<string, unknown>,
  ) => runCommandMock(cmd, shell, opts ?? {}).then((exitCode) => exitCode),
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

  it('parseExportCredentialsEnv supports env-no-export and windows-cmd', () => {
    const envNoExport = `AWS_ACCESS_KEY_ID=AKIA
AWS_SECRET_ACCESS_KEY=SECRET
AWS_SESSION_TOKEN=TOKEN`;
    expect(parseExportCredentialsEnv(envNoExport)).toEqual({
      accessKeyId: 'AKIA',
      secretAccessKey: 'SECRET',
      sessionToken: 'TOKEN',
    });

    const winCmd = `set AWS_ACCESS_KEY_ID=AKIA
set AWS_SECRET_ACCESS_KEY=SECRET
set AWS_SESSION_TOKEN=TOKEN`;
    expect(parseExportCredentialsEnv(winCmd)).toEqual({
      accessKeyId: 'AKIA',
      secretAccessKey: 'SECRET',
      sessionToken: 'TOKEN',
    });
  });
});

describe('plugins/aws/service.resolveAwsContext', () => {
  beforeEach(() => {
    runCommandResultMock.mockReset();
    runCommandMock.mockReset().mockResolvedValue(0);
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_SESSION_TOKEN;
  });

  it('env-first credentials (no CLI calls)', async () => {
    process.env.AWS_ACCESS_KEY_ID = 'AKIA';
    process.env.AWS_SECRET_ACCESS_KEY = 'SECRET';
    const out = await resolveAwsContext({
      dotenv: {} as ProcessEnv,
      cfg: baseCfg,
    });
    expect(out.credentials).toEqual({
      accessKeyId: 'AKIA',
      secretAccessKey: 'SECRET',
    });
    expect(runCommandResultMock).not.toHaveBeenCalled();
  });

  it('export-credentials (process/JSON path)', async () => {
    const json = JSON.stringify({
      AccessKeyId: 'A',
      SecretAccessKey: 'S',
      SessionToken: 'T',
    });
    runCommandResultMock.mockImplementation((cmd) => {
      const args = Array.isArray(cmd) ? cmd : cmd.split(/\s+/);
      const isExport =
        args[0] === 'aws' &&
        args[1] === 'configure' &&
        args[2] === 'export-credentials';
      const fmtIdx = args.indexOf('--format');
      const fmt = fmtIdx >= 0 ? args[fmtIdx + 1] : undefined;
      if (isExport && fmt === 'process') {
        return Promise.resolve({ exitCode: 0, stdout: json, stderr: '' });
      }
      return Promise.resolve({ exitCode: 1, stdout: '', stderr: '' });
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
    runCommandResultMock.mockImplementation((cmd) => {
      const args = Array.isArray(cmd) ? cmd : cmd.split(/\s+/);
      const isExport =
        args[0] === 'aws' &&
        args[1] === 'configure' &&
        args[2] === 'export-credentials';
      const fmtIdx = args.indexOf('--format');
      const fmt = fmtIdx >= 0 ? args[fmtIdx + 1] : undefined;
      if (!isExport)
        return Promise.resolve({ exitCode: 1, stdout: '', stderr: '' });
      if (fmt === 'process')
        return Promise.resolve({ exitCode: 1, stdout: '', stderr: 'no json' });
      return Promise.resolve({
        exitCode: 0,
        stdout:
          'export AWS_ACCESS_KEY_ID=AKIA\nexport AWS_SECRET_ACCESS_KEY=SECRET',
        stderr: '',
      });
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
    runCommandResultMock.mockImplementation((cmd) => {
      const args = Array.isArray(cmd) ? cmd : cmd.split(/\s+/);
      const isExport =
        args[0] === 'aws' &&
        args[1] === 'configure' &&
        args[2] === 'export-credentials';
      if (isExport)
        return Promise.resolve({ exitCode: 1, stdout: '', stderr: '' });
      const isGet =
        args[0] === 'aws' &&
        args[1] === 'configure' &&
        args[2] === 'get' &&
        typeof args[3] === 'string';
      if (isGet) {
        const key = args[3];
        if (key === 'sso_session')
          return Promise.resolve({ exitCode: 0, stdout: '', stderr: '' });
        if (key === 'sso_start_url')
          return Promise.resolve({ exitCode: 0, stdout: '', stderr: '' });
        if (key === 'aws_access_key_id')
          return Promise.resolve({ exitCode: 0, stdout: 'AKIA', stderr: '' });
        if (key === 'aws_secret_access_key')
          return Promise.resolve({ exitCode: 0, stdout: 'SECRET', stderr: '' });
        if (key === 'aws_session_token')
          return Promise.resolve({ exitCode: 0, stdout: '', stderr: '' });
        if (key === 'region')
          return Promise.resolve({ exitCode: 0, stdout: '', stderr: '' });
      }
      return Promise.resolve({ exitCode: 1, stdout: '', stderr: '' });
    });
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
    let loggedIn = false;
    runCommandResultMock.mockImplementation((cmd) => {
      const args = Array.isArray(cmd) ? cmd : cmd.split(/\s+/);
      const isExport =
        args[0] === 'aws' &&
        args[1] === 'configure' &&
        args[2] === 'export-credentials';
      if (isExport) {
        if (!loggedIn)
          return Promise.resolve({ exitCode: 1, stdout: '', stderr: '' });
        return Promise.resolve({
          exitCode: 0,
          stdout: JSON.stringify({ AccessKeyId: 'A', SecretAccessKey: 'S' }),
          stderr: '',
        });
      }
      const isGet =
        args[0] === 'aws' &&
        args[1] === 'configure' &&
        args[2] === 'get' &&
        typeof args[3] === 'string';
      if (isGet) {
        const key = args[3];
        if (key === 'sso_session')
          return Promise.resolve({
            exitCode: 0,
            stdout: 'mysession',
            stderr: '',
          });
        if (key === 'sso_start_url')
          return Promise.resolve({ exitCode: 0, stdout: '', stderr: '' });
        return Promise.resolve({ exitCode: 0, stdout: '', stderr: '' });
      }
      return Promise.resolve({ exitCode: 1, stdout: '', stderr: '' });
    });
    runCommandMock.mockImplementation((cmd) => {
      const args = Array.isArray(cmd) ? cmd : String(cmd).split(/\s+/);
      const isLogin =
        args[0] === 'aws' && args[1] === 'sso' && args[2] === 'login';
      if (isLogin) {
        loggedIn = true;
        return Promise.resolve(0);
      }
      return Promise.resolve(1);
    });
    const out = await resolveAwsContext({
      dotenv: { AWS_PROFILE: 'dev' },
      cfg: { ...baseCfg, loginOnDemand: true },
    });
    expect(out.credentials).toEqual({ accessKeyId: 'A', secretAccessKey: 'S' });
  });

  it('SSO loginOnDemand retry when export fails and legacy sso_start_url present', async () => {
    let loggedIn = false;
    runCommandResultMock.mockImplementation((cmd) => {
      const args = Array.isArray(cmd) ? cmd : cmd.split(/\s+/);
      const isExport =
        args[0] === 'aws' &&
        args[1] === 'configure' &&
        args[2] === 'export-credentials';
      if (isExport) {
        if (!loggedIn)
          return Promise.resolve({ exitCode: 1, stdout: '', stderr: '' });
        return Promise.resolve({
          exitCode: 0,
          stdout: JSON.stringify({ AccessKeyId: 'A', SecretAccessKey: 'S' }),
          stderr: '',
        });
      }
      const isGet =
        args[0] === 'aws' &&
        args[1] === 'configure' &&
        args[2] === 'get' &&
        typeof args[3] === 'string';
      if (isGet) {
        const key = args[3];
        if (key === 'sso_session')
          return Promise.resolve({ exitCode: 0, stdout: '', stderr: '' });
        if (key === 'sso_start_url')
          return Promise.resolve({
            exitCode: 0,
            stdout: 'https://example.awsapps.com/start',
            stderr: '',
          });
        return Promise.resolve({ exitCode: 0, stdout: '', stderr: '' });
      }
      return Promise.resolve({ exitCode: 1, stdout: '', stderr: '' });
    });
    runCommandMock.mockImplementation((cmd) => {
      const args = Array.isArray(cmd) ? cmd : String(cmd).split(/\s+/);
      const isLogin =
        args[0] === 'aws' && args[1] === 'sso' && args[2] === 'login';
      if (isLogin) {
        loggedIn = true;
        return Promise.resolve(0);
      }
      return Promise.resolve(1);
    });
    const out = await resolveAwsContext({
      dotenv: { AWS_PROFILE: 'dev' },
      cfg: { ...baseCfg, loginOnDemand: true },
    });
    expect(out.credentials).toEqual({ accessKeyId: 'A', secretAccessKey: 'S' });
  });

  it('profile wins over ambient env credentials when present', async () => {
    process.env.AWS_ACCESS_KEY_ID = 'ENV_AKIA';
    process.env.AWS_SECRET_ACCESS_KEY = 'ENV_SECRET';

    runCommandResultMock.mockImplementation((cmd) => {
      const args = Array.isArray(cmd) ? cmd : cmd.split(/\s+/);
      const isExport =
        args[0] === 'aws' &&
        args[1] === 'configure' &&
        args[2] === 'export-credentials';
      const fmtIdx = args.indexOf('--format');
      const fmt = fmtIdx >= 0 ? args[fmtIdx + 1] : undefined;
      if (isExport && fmt === 'process') {
        return Promise.resolve({
          exitCode: 0,
          stdout: JSON.stringify({ AccessKeyId: 'P', SecretAccessKey: 'S' }),
          stderr: '',
        });
      }
      return Promise.resolve({ exitCode: 1, stdout: '', stderr: '' });
    });

    const out = await resolveAwsContext({
      dotenv: {},
      cfg: { ...baseCfg, profile: 'dev' },
    });
    expect(out.credentials).toEqual({ accessKeyId: 'P', secretAccessKey: 'S' });
  });
});
