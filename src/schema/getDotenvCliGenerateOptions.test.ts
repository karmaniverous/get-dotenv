import { describe, expect, it } from 'vitest';

import { getDotenvCliGenerateOptionsSchemaRaw } from './getDotenvCliGenerateOptions';

describe('schema/getDotenvCliGenerateOptions', () => {
  it('accepts valid generator options (all optional in RAW)', () => {
    const input = {
      alias: 'getdotenv',
      description: 'Base CLI.',
      importMetaUrl: 'file:///path/to/mod.mjs',
      // Hooks and logger intentionally wide in RAW
      preHook: () => undefined,
      postHook: () => undefined,
      logger: console,
      // Inherits CLI option shapes
      dotenvToken: '.env',
      shell: true,
      paths: './',
    };
    const res = getDotenvCliGenerateOptionsSchemaRaw.safeParse(input);
    expect(res.success).toBe(true);
  });

  it('produces informative errors on invalid shapes', () => {
    const bad = {
      alias: 123, // must be string
    } as unknown;
    const res = getDotenvCliGenerateOptionsSchemaRaw.safeParse(bad);
    expect(res.success).toBe(false);
    if (!res.success) {
      const issues = res.error.issues.map((i) => i.path.join('.'));
      expect(issues).toContain('alias');
    }
  });
});
