/**
 * Type regression tests for #71: the public types match the code.
 *
 * These assertions are checked by the type checker (`tsc --noEmit`, a gate):
 * on a tree where the types diverge from the schemas, this file fails to
 * compile. The runtime expectations are incidental.
 */
import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

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

describe('#96 schema-driven typing', () => {
  it('infers dynamic function params from schema.input, with no Vars param', () => {
    const schema = z.object({
      APP_SETTING: z.string(),
      ENV_SETTING: z.string().optional(),
    });

    const cfg = defineGetDotenvConfig({
      schema,
      dynamic: {
        // No `DynamicFn<Vars>` annotation: `vars` is inferred from `schema`.
        DERIVED: (vars) => {
          expectTypeOf(vars.APP_SETTING).toEqualTypeOf<string>();
          expectTypeOf(vars.ENV_SETTING).toEqualTypeOf<string | undefined>();
          return vars.APP_SETTING;
        },
      },
    });

    expectTypeOf(cfg.schema).toEqualTypeOf<typeof schema>();
    expect(cfg.schema).toBe(schema);
  });

  it('rejects a schema whose input is not string-valued (ProcessEnv-compatible)', () => {
    // z.coerce.number()'s *input* is `unknown`, not `string | undefined`.
    const badSchema = z.object({ PORT: z.coerce.number() });

    // @ts-expect-error schema input must be string-valued (ProcessEnv-compatible)
    defineGetDotenvConfig({ schema: badSchema });
    expect(badSchema).toBeInstanceOf(z.ZodObject);
  });

  it('the legacy defineGetDotenvConfig<Vars, Env>() form still compiles', () => {
    type LegacyVars = { LEGACY_KEY?: string };
    type LegacyEnv = 'dev' | 'prod';

    const cfg = defineGetDotenvConfig<LegacyVars, LegacyEnv>({
      vars: { LEGACY_KEY: 'x' },
      envVars: { dev: {}, prod: { LEGACY_KEY: 'y' } },
      dynamic: {
        FROM_VARS: (vars) => {
          expectTypeOf(vars).toEqualTypeOf<LegacyVars>();
          return vars.LEGACY_KEY;
        },
      },
    });

    expect(cfg.vars).toEqual({ LEGACY_KEY: 'x' });
  });

  it('the legacy form still accepts a non-Zod validator (duck-typed safeParse)', () => {
    const legacyValidator = {
      safeParse: (v: unknown) => ({ success: true as const, data: v }),
    };
    const cfg = defineGetDotenvConfig<ProcessEnv>({
      schema: legacyValidator,
      vars: { ANY: 'x' },
    });
    expect(cfg.schema).toBe(legacyValidator);
  });
});
