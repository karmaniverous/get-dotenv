/**
 * #80: the AWS CLI probes share a 9 s budget, but an interactive
 * `aws sso login` is outside it: after a login that takes longer than the
 * budget, the export retry, the static-credential fallback and the region
 * lookup still run, each with a fresh budget. The clock is faked and the AWS
 * CLI is stubbed: nothing reaches AWS.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveAwsContext } from './service';

/** `aws configure get <key>` answers, before and after the login. */
let answers: Record<string, string> = {};
/** export-credentials stdout after the login (else it fails). */
let exportAfterLogin: string | undefined;
let loggedIn = false;
const calls: Array<{ argv: string; timeoutMs: number | undefined }> = [];

vi.mock('@/src/cliHost/exec', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    runCommandResult: (
      argv: string[],
      _shell: unknown,
      opts?: { timeoutMs?: number },
    ) => {
      calls.push({ argv: argv.join(' '), timeoutMs: opts?.timeoutMs });
      if (argv.includes('export-credentials'))
        return Promise.resolve(
          loggedIn && exportAfterLogin !== undefined
            ? { exitCode: 0, stdout: exportAfterLogin, stderr: '' }
            : { exitCode: 1, stdout: '', stderr: 'expired' },
        );
      const key = argv[3] ?? '';
      const v = answers[key];
      return Promise.resolve(
        v === undefined
          ? { exitCode: 1, stdout: '', stderr: '' }
          : { exitCode: 0, stdout: `${v}\n`, stderr: '' },
      );
    },
    runCommand: (argv: string[]) => {
      calls.push({ argv: argv.join(' '), timeoutMs: undefined });
      // The interactive login takes 30 s: longer than the 9 s budget.
      vi.setSystemTime(Date.now() + 30_000);
      loggedIn = true;
      return Promise.resolve(0);
    },
  };
});

const cfg = { profile: 'sso-profile', loginOnDemand: true } as const;
const afterLogin = () =>
  calls.slice(calls.findIndex((c) => c.argv.startsWith('aws sso login')) + 1);

describe('login-on-demand budget (#80)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-15T00:00:00Z'));
    answers = { sso_session: 'my-sso' };
    exportAfterLogin = undefined;
    loggedIn = false;
    calls.length = 0;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('the export retry after a slow login gets a fresh budget', async () => {
    exportAfterLogin = JSON.stringify({
      AccessKeyId: 'fresh-id',
      SecretAccessKey: 'fresh-secret',
      SessionToken: 'fresh-token',
    });
    answers.region = 'us-west-2';
    const out = await resolveAwsContext({ dotenv: {}, cfg });
    expect(out).toEqual({
      profile: 'sso-profile',
      region: 'us-west-2',
      credentials: {
        accessKeyId: 'fresh-id',
        secretAccessKey: 'fresh-secret',
        sessionToken: 'fresh-token',
      },
    });
    expect(afterLogin()).toEqual([
      {
        argv: 'aws configure export-credentials --profile sso-profile --format process',
        timeoutMs: 3_000,
      },
      {
        argv: 'aws configure get region --profile sso-profile',
        timeoutMs: 3_000,
      },
    ]);
  });

  it('the static fallback after a slow login gets a fresh budget', async () => {
    answers.aws_access_key_id = 'static-id';
    answers.aws_secret_access_key = 'static-secret';
    const out = await resolveAwsContext({ dotenv: {}, cfg });
    expect(out.credentials).toEqual({
      accessKeyId: 'static-id',
      secretAccessKey: 'static-secret',
    });
    expect(afterLogin().map((c) => c.timeoutMs)).toEqual(
      afterLogin().map(() => 3_000),
    );
    expect(afterLogin().map((c) => c.argv)).toContain(
      'aws configure get aws_access_key_id --profile sso-profile',
    );
  });
});
