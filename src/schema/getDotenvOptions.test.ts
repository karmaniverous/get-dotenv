import { describe, expect, it } from 'vitest';

import { getDotenvOptionsSchemaRaw } from './getDotenvOptions';

describe('schema/getDotenvOptions', () => {
  it('accepts a valid options object', () => {
    const input = {
      dotenvToken: '.env',
      paths: ['./', './packages/app'],
      loadProcess: true,
      vars: { FOO: 'bar', BAR: undefined },
    };
    const res = getDotenvOptionsSchemaRaw.safeParse(input);
    expect(res.success).toBe(true);
    if (!res.success) {
      // Unexpected failure: surface diagnostics to aid debugging
      throw new Error(JSON.stringify(res.error.issues));
    }
    expect(res.data.paths).toEqual(['./', './packages/app']);
    expect(res.data.vars?.FOO).toBe('bar');
    expect(res.data.vars?.BAR).toBeUndefined();
  });

  it('produces informative errors on invalid shapes', () => {
    const bad = {
      paths: './', // should be string[]
      excludePublic: 'yes', // should be boolean
    } as unknown;

    const res = getDotenvOptionsSchemaRaw.safeParse(bad);
    expect(res.success).toBe(false);

    const issues = res.success
      ? []
      : res.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        }));
    // Expect errors to reference the offending keys
    expect(issues.some((i) => i.path === 'paths')).toBe(true);
    expect(issues.some((i) => i.path === 'excludePublic')).toBe(true);
  });

  it('allows minimal empty object (all fields optional in RAW)', () => {
    const res = getDotenvOptionsSchemaRaw.safeParse({});
    expect(res.success).toBe(true);
  });
});
