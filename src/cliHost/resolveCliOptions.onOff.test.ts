/**
 * Regression tests for #45: every ON/OFF pair resolves from the raw CLI flags
 * of this invocation, so an OFF flag overrides a default that is already
 * true, and `--entropy-warn` / `--redact-off` take effect.
 */
import { describe, expect, it } from 'vitest';

import { cmdPlugin } from '@/src/plugins/cmd';
import { runFixtureCli } from '@/test/support/fixtureCli';

import type { GetDotenvCli } from './GetDotenvCli';
import { resolveCliOptions } from './resolveCliOptions';
import type { RootOptionsShape } from './types';

const resolve = (
  raw: Record<string, unknown>,
  defaults: Partial<RootOptionsShape>,
  parent?: Partial<RootOptionsShape>,
) =>
  resolveCliOptions<RootOptionsShape>(
    raw,
    defaults,
    parent ? JSON.stringify(parent) : undefined,
  ).merged;

const HIGH_ENTROPY = 'Zx8Qp2Lm9Rt4Vb7Nc1Kd6Hf3Jg5Ws0Ya';

describe('#45 OFF flags override a true default', () => {
  const allTrue: Partial<RootOptionsShape> = {
    loadProcess: true,
    log: true,
    debug: true,
    redact: true,
    warnEntropy: true,
    excludeDynamic: true,
    excludeEnv: true,
    excludeGlobal: true,
    excludePrivate: true,
    excludePublic: true,
  };

  it.each([
    ['loadProcessOff', 'loadProcess'],
    ['logOff', 'log'],
    ['debugOff', 'debug'],
    ['redactOff', 'redact'],
    ['entropyWarnOff', 'warnEntropy'],
    ['excludeDynamicOff', 'excludeDynamic'],
    ['excludeEnvOff', 'excludeEnv'],
    ['excludeGlobalOff', 'excludeGlobal'],
    ['excludePrivateOff', 'excludePrivate'],
    ['excludePublicOff', 'excludePublic'],
  ] as const)('%s turns off a true %s default', (off, key) => {
    const merged = resolve({ [off]: true }, allTrue);
    expect(merged[key]).toBe(false);
    expect(merged).not.toHaveProperty(off);
  });

  it('-A turns off every true exclusion default', () => {
    const merged = resolve({ excludeAllOff: true }, allTrue);
    expect(merged).toMatchObject({
      excludeDynamic: false,
      excludeEnv: false,
      excludeGlobal: false,
      excludePrivate: false,
      excludePublic: false,
    });
  });

  it('an individual flag beats -a / -A', () => {
    expect(
      resolve({ excludeAll: true, excludePrivateOff: true }, {}),
    ).toMatchObject({ excludePrivate: false, excludePublic: true });
    expect(
      resolve({ excludeAllOff: true, excludePrivate: true }, allTrue),
    ).toMatchObject({ excludePrivate: true, excludePublic: false });
  });

  it('--entropy-warn re-enables warnings a default turned off', () => {
    expect(resolve({ entropyWarn: true }, { warnEntropy: false })).toEqual(
      expect.objectContaining({ warnEntropy: true }),
    );
    expect(resolve({ entropyWarn: true }, {})).not.toHaveProperty(
      'entropyWarn',
    );
  });

  it('an OFF flag beats the parent bag, and the parent bag beats defaults', () => {
    expect(resolve({ logOff: true }, {}, { log: true }).log).toBe(false);
    expect(resolve({}, { loadProcess: true }, { loadProcess: false })).toEqual(
      expect.objectContaining({ loadProcess: false }),
    );
  });

  it('with no flag, the stacked default applies (and unset stays unset)', () => {
    expect(resolve({}, allTrue)).toMatchObject(allTrue);
    expect(resolve({}, {})).not.toHaveProperty('log');
    expect(resolve({ log: true }, { log: false }).log).toBe(true);
  });

  it('getdotenv --entropy-warn-off --trace HIGH cmd ... prints no [entropy] line', async () => {
    const files = { '.env': `APP=base\nHIGH=${HIGH_ENTROPY}\n` };
    const withCmd = { compose: (p: GetDotenvCli) => p.use(cmdPlugin()) };
    // --trace is variadic: another option ends its keys.
    const cmd = ['--trace', 'HIGH', '-S', 'cmd', 'node', '-e', '0'];
    const entropyLines = (output: string[]) =>
      output.filter((l) => l.startsWith('[entropy] key=HIGH'));

    const on = await runFixtureCli(cmd, files, withCmd);
    expect(entropyLines(on.output)).toHaveLength(1);
    const off = await runFixtureCli(
      ['--entropy-warn-off', ...cmd],
      files,
      withCmd,
    );
    expect(off.output.some((l) => l.startsWith('[trace] key=HIGH'))).toBe(true);
    expect(entropyLines(off.output)).toEqual([]);
  });

  it('getdotenv --redact-off overrides config rootOptionDefaults.redact', async () => {
    const files = {
      'getdotenv.config.json': JSON.stringify({
        rootOptionDefaults: { redact: true },
      }),
    };
    expect((await runFixtureCli(['probe'], files)).bag?.redact).toBe(true);
    const off = await runFixtureCli(['--redact-off', 'probe'], files);
    expect(off.bag?.redact).toBe(false);
    expect(off.bag).not.toHaveProperty('redactOff');
  });

  it('getdotenv -P does not load process.env (base default loadProcess: true)', async () => {
    const files = { '.env': 'S5_45_LOADED=yes\n' };
    const on = await runFixtureCli(['probe'], files);
    expect(on.ctx?.optionsResolved.loadProcess).toBe(true);
    const off = await runFixtureCli(['-P', 'probe'], files);
    expect(off.bag?.loadProcess).toBe(false);
    expect(off.ctx?.optionsResolved.loadProcess).toBe(false);
  });
});
