/**
 * Type regression tests for #96: `extendGetDotenvConfig` types its override's
 * `dynamic` functions from the *merged* schema, so they see base and
 * override variables alike.
 *
 * These assertions are checked by the type checker (`tsc --noEmit`, a gate).
 */
import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import { extendGetDotenvConfig } from './extendGetDotenvConfig';
import { defineGetDotenvConfig } from './GetDotenvOptions';

describe('#96 extendGetDotenvConfig typing', () => {
  it("the override's dynamic functions see base and override variables, with no Vars param", () => {
    const base = defineGetDotenvConfig({
      schema: z.object({ APP: z.string() }),
      vars: { APP: 'svc' },
    });

    const extended = extendGetDotenvConfig(base, {
      schema: z.object({ REGION: z.string() }),
      dynamic: {
        TAG: (vars) => {
          expectTypeOf(vars.APP).toEqualTypeOf<string>();
          expectTypeOf(vars.REGION).toEqualTypeOf<string>();
          return `${vars.APP}-${vars.REGION}`;
        },
      },
    });

    expect(extended).toBeDefined();
  });

  it('extendGetDotenvConfig(base) with no overrides returns an equivalent config', () => {
    const base = defineGetDotenvConfig({
      schema: z.object({ APP: z.string() }),
      vars: { APP: 'svc' },
    });
    const extended = extendGetDotenvConfig(base);
    expectTypeOf(extended.schema).toEqualTypeOf<typeof base.schema>();
  });

  it('a clashing override key overrides the base field type in the merged schema', () => {
    const base = defineGetDotenvConfig({
      schema: z.object({ PORT: z.string() }),
    });
    const extended = extendGetDotenvConfig(base, {
      schema: z.object({ PORT: z.string().min(1), REGION: z.string() }),
      dynamic: {
        // PORT's merged (override) field is still a string input; REGION is new.
        COMBINED: (vars) => `${vars.PORT}-${vars.REGION}`,
      },
    });
    expect(extended).toBeDefined();
  });
});
