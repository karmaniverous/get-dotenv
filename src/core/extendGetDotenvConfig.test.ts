/**
 * Runtime tests for #96 `extendGetDotenvConfig`: one test per merge row in
 * its TSDoc table, plus non-mutation.
 */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { extendGetDotenvConfig } from './extendGetDotenvConfig';
import type { GetDotenvConfig, ProcessEnv } from './GetDotenvOptions';

describe('#96 extendGetDotenvConfig', () => {
  describe('schema', () => {
    it('extends the base Zod object schema with the override, override winning on a clash', () => {
      const base = { schema: z.object({ A: z.string(), B: z.string() }) };
      const overrides = {
        schema: z.object({ B: z.string().min(5), C: z.string() }),
      };
      const extended = extendGetDotenvConfig(base, overrides);

      // override wins on B (min length 5), A unchanged, C new.
      expect(
        extended.schema.safeParse({ A: 'x', B: 'ab', C: 'y' }).success,
      ).toBe(false);
      expect(
        extended.schema.safeParse({ A: 'x', B: 'longenough', C: 'y' }).success,
      ).toBe(true);
    });

    it('either side alone passes through unchanged', () => {
      const baseSchema = z.object({ A: z.string() });
      const onlyBase = extendGetDotenvConfig({ schema: baseSchema });
      expect(onlyBase.schema).toBe(baseSchema);

      const overrideSchema = z.object({ B: z.string() });
      const onlyOverride = extendGetDotenvConfig(
        {},
        { schema: overrideSchema },
      );
      expect(onlyOverride.schema).toBe(overrideSchema);
    });

    it('throws when both sides have a schema but one is not a Zod object schema', () => {
      const base = { schema: { safeParse: () => ({ success: true }) } };
      const overrides = { schema: z.object({ A: z.string() }) };
      expect(() =>
        extendGetDotenvConfig(
          base as unknown as GetDotenvConfig<ProcessEnv>,
          overrides,
        ),
      ).toThrow(/Zod object schemas/);
    });

    it('is absent from the result when neither side has one', () => {
      const extended = extendGetDotenvConfig({ vars: { A: '1' } }, {});
      expect(extended.schema).toBeUndefined();
    });
  });

  describe('dynamic', () => {
    it('spreads the two maps: an overridden key keeps its base position; new keys come after', () => {
      const base = {
        dynamic: {
          FIRST: () => '1',
          SECOND: (vars: ProcessEnv) => `base-${vars.FIRST ?? ''}`,
          THIRD: () => '3',
        },
      };
      const overrides = {
        dynamic: {
          // Overrides SECOND; a dependent key (FOURTH) depends on it.
          SECOND: (vars: ProcessEnv) => `override-${vars.FIRST ?? ''}`,
          FOURTH: (vars: ProcessEnv) =>
            `fourth-depends-on-${vars.SECOND ?? ''}`,
        },
      };
      const extended = extendGetDotenvConfig(base, overrides);

      // Key order: FIRST, SECOND (overridden, same position), THIRD, FOURTH (new, appended).
      expect(Object.keys(extended.dynamic ?? {})).toEqual([
        'FIRST',
        'SECOND',
        'THIRD',
        'FOURTH',
      ]);
      // The overridden value wins.
      expect(
        (extended.dynamic?.SECOND as (v: ProcessEnv) => string)({ FIRST: 'x' }),
      ).toBe('override-x');
      // A dependent key sees the overridden base key's value when evaluated
      // after it (position/order is what the host relies on at runtime).
      expect(
        (extended.dynamic?.FOURTH as (v: ProcessEnv) => string)({
          SECOND: 'override-x',
        }),
      ).toBe('fourth-depends-on-override-x');
    });

    it('is absent from the result when neither side has one', () => {
      const extended = extendGetDotenvConfig({ vars: { A: '1' } }, {});
      expect(extended.dynamic).toBeUndefined();
    });
  });

  describe('requiredKeys', () => {
    it('unions base and override, base order first, de-duplicated', () => {
      const base = { requiredKeys: ['A', 'B'] };
      const overrides = { requiredKeys: ['B', 'C'] };
      const extended = extendGetDotenvConfig(base, overrides);
      expect(extended.requiredKeys).toEqual(['A', 'B', 'C']);
    });

    it('is absent from the result when neither side has one', () => {
      const extended = extendGetDotenvConfig({ vars: { A: '1' } }, {});
      expect(extended.requiredKeys).toBeUndefined();
    });
  });

  describe('plain objects (plugins, rootOptionDefaults, vars, envVars)', () => {
    it('deep-merges, override winning on a clash', () => {
      const base = {
        vars: { A: '1', B: '2' },
        plugins: { aws: { region: 'us-east-1', nested: { x: 1 } } },
        rootOptionDefaults: { shell: '/bin/bash' as const, log: true },
      };
      const overrides = {
        vars: { B: '20', C: '3' },
        plugins: { aws: { nested: { y: 2 } }, deploy: { version: 'v1' } },
        rootOptionDefaults: { log: false },
      };
      const extended = extendGetDotenvConfig(base, overrides);

      expect(extended.vars).toEqual({ A: '1', B: '20', C: '3' });
      expect(extended.plugins).toEqual({
        aws: { region: 'us-east-1', nested: { x: 1, y: 2 } },
        deploy: { version: 'v1' },
      });
      expect(extended.rootOptionDefaults).toEqual({
        shell: '/bin/bash',
        log: false,
      });
    });
  });

  describe('other arrays and scalars', () => {
    it('override replaces (rootOptionVisibility array-ish / scalar fields)', () => {
      const base = { rootOptionVisibility: { shell: false } };
      const overrides = { rootOptionVisibility: { shell: true, log: false } };
      const extended = extendGetDotenvConfig(base, overrides);
      // rootOptionVisibility is itself a plain object (deep-merged), but a
      // nested array value (e.g., redactPatterns under rootOptionDefaults)
      // must replace wholesale rather than concatenate.
      expect(extended.rootOptionVisibility).toEqual({
        shell: true,
        log: false,
      });

      const baseArr = {
        rootOptionDefaults: { redactPatterns: ['SECRET'] },
      };
      const overrideArr = {
        rootOptionDefaults: { redactPatterns: ['TOKEN'] },
      };
      const extendedArr = extendGetDotenvConfig(baseArr, overrideArr);
      expect(extendedArr.rootOptionDefaults?.redactPatterns).toEqual(['TOKEN']);
    });
  });

  describe('non-mutation', () => {
    it('mutates neither base nor overrides', () => {
      const base = {
        schema: z.object({ A: z.string() }),
        dynamic: { D: () => '1' },
        requiredKeys: ['A'],
        vars: { A: '1' },
      };
      const overrides = {
        schema: z.object({ B: z.string() }),
        dynamic: { E: () => '2' },
        requiredKeys: ['B'],
        vars: { B: '2' },
      };
      const baseSnapshot: unknown = JSON.parse(
        JSON.stringify({ requiredKeys: base.requiredKeys, vars: base.vars }),
      );
      const overridesSnapshot: unknown = JSON.parse(
        JSON.stringify({
          requiredKeys: overrides.requiredKeys,
          vars: overrides.vars,
        }),
      );

      extendGetDotenvConfig(base, overrides);

      expect({ requiredKeys: base.requiredKeys, vars: base.vars }).toEqual(
        baseSnapshot,
      );
      expect({
        requiredKeys: overrides.requiredKeys,
        vars: overrides.vars,
      }).toEqual(overridesSnapshot);
      expect(Object.keys(base.dynamic)).toEqual(['D']);
      expect(Object.keys(overrides.dynamic)).toEqual(['E']);
    });
  });

  describe('extendGetDotenvConfig(base) with no overrides', () => {
    it('returns an equivalent (new, structurally identical) config', () => {
      const base = {
        schema: z.object({ A: z.string() }),
        vars: { A: '1' },
        dynamic: { D: () => '1' },
        requiredKeys: ['A'],
      };
      const extended = extendGetDotenvConfig(base);
      expect(extended).not.toBe(base);
      expect(extended.schema).toBe(base.schema);
      expect(extended.vars).toEqual(base.vars);
      expect(extended.requiredKeys).toEqual(base.requiredKeys);
      expect(Object.keys(extended.dynamic ?? {})).toEqual(
        Object.keys(base.dynamic),
      );
    });
  });
});
