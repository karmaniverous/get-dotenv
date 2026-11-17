/**
 * Type regression tests for #71: the public types match the code.
 *
 * These assertions are checked by the type checker (`tsc --noEmit`, a gate):
 * on a tree where the types diverge from the schemas, this file fails to
 * compile. The runtime expectations are incidental.
 */
import { describe, expect, expectTypeOf, it } from 'vitest';

import type { GetDotenvConfigRaw } from '@/src/schema';
import { runFixtureCli } from '@/test/support/fixtureCli';

import { getDotenv } from './getDotenv';
import {
  defineGetDotenvConfig,
  getDotenvCliOptions2Options,
  type GetDotenvConfig,
  type GetDotenvOptions,
  type ProcessEnv,
  type RootOptionsShapeCompat,
} from './GetDotenvOptions';

describe('#71 GetDotenvOptions declares the redaction/entropy options', () => {
  it('types every option getDotenv() honours', async () => {
    expectTypeOf<GetDotenvOptions['redact']>().toEqualTypeOf<
      boolean | undefined
    >();
    expectTypeOf<GetDotenvOptions['redactPatterns']>().toEqualTypeOf<
      (string | RegExp)[] | undefined
    >();
    expectTypeOf<GetDotenvOptions['warnEntropy']>().toEqualTypeOf<
      boolean | undefined
    >();
    expectTypeOf<GetDotenvOptions['entropyThreshold']>().toEqualTypeOf<
      number | undefined
    >();
    expectTypeOf<GetDotenvOptions['entropyMinLength']>().toEqualTypeOf<
      number | undefined
    >();
    expectTypeOf<GetDotenvOptions['entropyWhitelist']>().toEqualTypeOf<
      (string | RegExp)[] | undefined
    >();

    // The issue repro: a typed caller passes them with no excess-property error.
    const lines: unknown[] = [];
    const logger = {
      debug: () => undefined,
      error: () => undefined,
      info: (v: unknown) => lines.push(v),
      warn: () => undefined,
    };
    await getDotenv({
      paths: [],
      vars: { API_TOKEN: 'abc', HIGH: 'Zx8Qp2Lm9Rt4Vb7Nc1Kd6Hf3Jg5Ws0Ya' },
      log: true,
      logger,
      redact: true,
      redactPatterns: ['TOKEN', /^HIGH$/],
      warnEntropy: true,
      entropyThreshold: 3,
      entropyMinLength: 8,
      entropyWhitelist: [/^NOPE$/],
    });
    expect(lines[0]).toEqual({ API_TOKEN: '[redacted]', HIGH: '[redacted]' });
  });
});

describe('#71 the declared entropy numbers accept the CLI string form', () => {
  it('getDotenvCliOptions2Options keeps finite numbers and drops the rest', () => {
    const cli = {
      entropyThreshold: '9',
      entropyMinLength: 'abc',
    } as unknown as RootOptionsShapeCompat;
    const out = getDotenvCliOptions2Options(cli);
    expect(out.entropyThreshold).toBe(9);
    expect(out).not.toHaveProperty('entropyMinLength');
  });

  it('getdotenv --entropy-threshold 9 still runs (the options schema now validates it)', async () => {
    const run = await runFixtureCli([
      '--entropy-threshold',
      '9',
      '--entropy-min-length',
      '64',
      'probe',
    ]);
    expect(run.error).toBeUndefined();
    expect(run.ctx?.optionsResolved).toMatchObject({
      entropyThreshold: 9,
      entropyMinLength: 64,
    });
  });
});

describe('#71 GetDotenvConfig has exactly the loader keys', () => {
  it('matches the loader schema keys', () => {
    expectTypeOf<keyof GetDotenvConfig<ProcessEnv>>().toEqualTypeOf<
      keyof GetDotenvConfigRaw
    >();
  });

  it('rejects top-level root options and accepts rootOptionVisibility', () => {
    const cfg = defineGetDotenvConfig({
      rootOptionDefaults: { paths: './env' },
      rootOptionVisibility: { shell: false },
    });
    expect(cfg.rootOptionVisibility).toEqual({ shell: false });

    defineGetDotenvConfig({
      // @ts-expect-error top-level paths is not a config key (the loader drops it)
      paths: './env',
    });
    defineGetDotenvConfig({
      // @ts-expect-error top-level loadProcess is not a config key
      loadProcess: true,
    });
  });
});
