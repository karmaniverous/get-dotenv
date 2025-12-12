import { describe, expect, it } from 'vitest';

import {
  getDotenvConfigSchemaRaw,
  getDotenvConfigSchemaResolved,
} from './getDotenvConfig';

describe('schema/getDotenvConfig', () => {
  it('accepts valid RAW shapes (string paths or array)', () => {
    const raw1 = {
      dotenvToken: '.env',
      paths: './ ./apps/app',
      vars: { FOO: 'bar' },
      envVars: { dev: { DEV: '1' } },
    };
    const res1 = getDotenvConfigSchemaRaw.safeParse(raw1);
    expect(res1.success).toBe(true);

    const raw2 = {
      paths: ['./', './packages/app'],
      vars: { FOO: 'bar' },
    };
    const res2 = getDotenvConfigSchemaRaw.safeParse(raw2);
    expect(res2.success).toBe(true);
  });

  it('normalizes paths to arrays in Resolved', () => {
    const raw = { paths: './' };
    const resolved = getDotenvConfigSchemaResolved.parse(raw);
    expect(resolved.paths).toEqual(['./']);
  });

  it('errors on invalid shapes with helpful messages', () => {
    const bad = { envVars: { dev: { OK: 1 } } } as unknown;
    const parsed = getDotenvConfigSchemaRaw.safeParse(bad);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      // Expect a message referencing the incorrect type
      const msgs = parsed.error.issues.map((i) => i.path.join('.'));
      expect(msgs.some((s) => s.includes('envVars'))).toBe(true);
    }
  });

  it('allows dynamic key in schema (loader rejects for JSON/YAML later)', () => {
    const raw = { dynamic: { KEY: 'VALUE' } };
    const parsed = getDotenvConfigSchemaRaw.safeParse(raw);
    expect(parsed.success).toBe(true);
    const resolved = getDotenvConfigSchemaResolved.parse(
      parsed.success ? parsed.data : {},
    );
    // dynamic passes through unchanged at schema level
    expect(resolved.dynamic).toBeDefined();
  });

  it('accepts rootOptionDefaults (Partial<RootOptionsShape>)', () => {
    const raw = {
      rootOptionDefaults: {
        shell: '/bin/zsh',
        log: true,
      },
    };
    const parsed = getDotenvConfigSchemaRaw.safeParse(raw);
    expect(parsed.success).toBe(true);
    const resolved = getDotenvConfigSchemaResolved.parse(
      parsed.success ? parsed.data : {},
    );
    expect(resolved.rootOptionDefaults?.shell).toBe('/bin/zsh');
    expect(resolved.rootOptionDefaults?.log).toBe(true);
  });
});
