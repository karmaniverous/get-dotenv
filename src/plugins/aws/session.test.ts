/**
 * #56: one AWS session per invocation, with the `aws` flags applied, kept by
 * aws child commands; and on a forward the session's `AWS_*` entries go over
 * the dotenv overlay. The AWS CLI is stubbed: nothing reaches AWS.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { definePlugin } from '@/src/cliHost/definePlugin';

import { runFixtureCli } from '../../../test/support/fixtureCli';
import { awsPlugin } from '.';

type Env = Record<string, string | undefined>;

/** Stubbed AWS CLI probes: argv → stdout (exit 0), else exit 1. */
let probeAnswers: Record<string, string> = {};
const probes: string[][] = [];
const forwards: Array<{ argv: string[]; env: Env }> = [];

vi.mock('../../cliHost/exec', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    runCommandResult: (argv: string[]) => {
      probes.push([...argv]);
      const stdout = probeAnswers[argv.join(' ')];
      return Promise.resolve(
        stdout === undefined
          ? { exitCode: 1, stdout: '', stderr: 'stub' }
          : { exitCode: 0, stdout, stderr: '' },
      );
    },
    runCommand: (argv: string[], _shell: unknown, opts: { env?: Env }) => {
      forwards.push({ argv: [...argv], env: { ...(opts.env ?? {}) } });
      return Promise.resolve(0);
    },
  };
});

/** What the fixture child `aws session show` saw. */
let seen: { env: Env; aws: unknown } | undefined;

const sessionChild = () =>
  definePlugin({
    ns: 'session',
    setup(cli) {
      const show = cli.ns('show');
      show.action(() => {
        seen = {
          env: {
            AWS_PROFILE: process.env.AWS_PROFILE,
            AWS_REGION: process.env.AWS_REGION,
          },
          aws: show.getCtx().plugins?.aws,
        };
      });
      return undefined;
    },
  });

const run = (args: string[], env: string) =>
  runFixtureCli(
    args,
    { '.env': env },
    { compose: (p) => p.use(awsPlugin().use(sessionChild())) },
  );

const exportCalls = () =>
  probes.filter(
    (p) => p.includes('export-credentials') && p.includes('process'),
  );

const CREDS = JSON.stringify({
  AccessKeyId: 'exported-id',
  SecretAccessKey: 'exported-secret',
});

describe('aws session (#56)', () => {
  beforeEach(() => {
    probeAnswers = {};
    probes.length = 0;
    forwards.length = 0;
    seen = undefined;
  });

  it('aws --profile X <child>: the child keeps the flag profile', async () => {
    await run(
      ['aws', '--profile', 'flag-profile', 'session', 'show'],
      'AWS_LOCAL_PROFILE=dotenv-profile\n',
    );
    expect(seen).toEqual({
      env: { AWS_PROFILE: 'flag-profile', AWS_REGION: undefined },
      aws: { profile: 'flag-profile' },
    });
    // One resolution, with the flag: no probe ever names the dotenv profile.
    expect(exportCalls()).toEqual([
      [
        'aws',
        'configure',
        'export-credentials',
        '--profile',
        'flag-profile',
        '--format',
        'process',
      ],
    ]);
    expect(probes.flat()).not.toContain('dotenv-profile');
  });

  it('aws <args>: the session is resolved once', async () => {
    await run(['aws', 'sts', 'get-caller-identity'], 'AWS_LOCAL_PROFILE=p\n');
    expect(exportCalls()).toHaveLength(1);
    expect(forwards.map((f) => f.argv)).toEqual([
      ['aws', 'sts', 'get-caller-identity'],
    ]);
  });

  it('forward: --region beats a dotenv AWS_REGION in the child', async () => {
    await run(
      [
        'aws',
        '--strategy',
        'none',
        '--region',
        'eu-west-3',
        'configure',
        'list',
      ],
      'AWS_REGION=us-east-1\n',
    );
    expect(forwards).toHaveLength(1);
    expect(forwards[0]?.env.AWS_REGION).toBe('eu-west-3');
  });

  it('forward, exported credentials: dotenv profile and static keys do not come back', async () => {
    probeAnswers[
      'aws configure export-credentials --profile dotenv-profile --format process'
    ] = CREDS;
    await run(
      ['aws', 'sts', 'get-caller-identity'],
      'AWS_PROFILE=dotenv-profile\nAWS_ACCESS_KEY_ID=dotenv-id\nAWS_SECRET_ACCESS_KEY=dotenv-secret\nAWS_SESSION_TOKEN=dotenv-token\n',
    );
    const env = forwards[0]?.env ?? {};
    expect(env.AWS_ACCESS_KEY_ID).toBe('exported-id');
    expect(env.AWS_SECRET_ACCESS_KEY).toBe('exported-secret');
    expect('AWS_SESSION_TOKEN' in env).toBe(false);
    expect('AWS_PROFILE' in env).toBe(false);
    expect('AWS_DEFAULT_PROFILE' in env).toBe(false);
  });

  it('forward, profile session: dotenv static credentials do not come back', async () => {
    await run(
      ['aws', 'sts', 'get-caller-identity'],
      'AWS_LOCAL_PROFILE=sso-profile\nAWS_ACCESS_KEY_ID=dotenv-id\nAWS_SECRET_ACCESS_KEY=dotenv-secret\n',
    );
    const env = forwards[0]?.env ?? {};
    expect(env.AWS_PROFILE).toBe('sso-profile');
    expect(env.AWS_SDK_LOAD_CONFIG).toBe('1');
    expect('AWS_ACCESS_KEY_ID' in env).toBe(false);
    expect('AWS_SECRET_ACCESS_KEY' in env).toBe(false);
  });
});
