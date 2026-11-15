/**
 * Regression tests for #77: `createCli({ rootOptionDefaults })` (and a bare
 * host's base defaults) are not Commander option defaults, so they rank below
 * config `rootOptionDefaults` and the parent options bag, and `opts()` holds
 * only values given on the command line.
 */
import { describe, expect, it } from 'vitest';

import { runFixtureCli } from '@/test/support/fixtureCli';

import { GetDotenvCli } from './GetDotenvCli';

const files = {
  'a/.env': 'FOO=fromA\n',
  'b/.env': 'FOO=fromB\n',
  'getdotenv.config.json': JSON.stringify({
    rootOptionDefaults: { paths: './b' },
  }),
};

const withParent = async <T>(bag: unknown, fn: () => Promise<T>) => {
  const prev = process.env.getDotenvCliOptions;
  process.env.getDotenvCliOptions = JSON.stringify(bag);
  try {
    return await fn();
  } finally {
    if (prev === undefined) delete process.env.getDotenvCliOptions;
    else process.env.getDotenvCliOptions = prev;
  }
};

describe('#77 createCli rootOptionDefaults rank below config and the parent bag', () => {
  it('the issue repro: config paths ./b beats createCli paths ./a', async () => {
    const run = await runFixtureCli(['probe'], files, {
      rootOptionDefaults: { paths: './a' },
    });
    expect(run.error).toBeUndefined();
    expect(run.bag?.paths).toBe('./b');
    expect(run.ctx?.dotenv.FOO).toBe('fromB');
  });

  it('createCli defaults apply when nothing above sets the option', async () => {
    const { 'getdotenv.config.json': _cfg, ...noConfig } = files;
    const run = await runFixtureCli(['probe'], noConfig, {
      rootOptionDefaults: { paths: './a' },
    });
    expect(run.ctx?.dotenv.FOO).toBe('fromA');
  });

  it('the parent bag beats createCli defaults', async () => {
    const { 'getdotenv.config.json': _cfg, ...noConfig } = files;
    const run = await withParent({ paths: './b' }, () =>
      runFixtureCli(['probe'], noConfig, {
        rootOptionDefaults: { paths: './a', dotenvToken: '.env' },
      }),
    );
    expect(run.ctx?.dotenv.FOO).toBe('fromB');
  });

  it('a CLI flag beats everything', async () => {
    const run = await withParent({ paths: './b' }, () =>
      runFixtureCli(['--paths', './a', 'probe'], files, {
        rootOptionDefaults: { paths: './b' },
      }),
    );
    expect(run.ctx?.dotenv.FOO).toBe('fromA');
  });

  it('root flags carry no Commander defaults (bare host included)', () => {
    const host = new GetDotenvCli('bare').attachRootOptions();
    const withDefault = host.options
      .filter((o) => o.defaultValue !== undefined)
      .map((o) => o.flags);
    expect(withDefault).toEqual([]);
    expect(host.parse(['node', 'bare'], { from: 'node' }).opts()).toEqual({});
  });
});
