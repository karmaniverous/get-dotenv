import { describe, expect, it } from 'vitest';

import {
  getDotenvConfigSchemaRaw,
  getDotenvConfigSchemaResolved,
} from './getDotenvConfig';

describe('schema/getDotenvConfig', () => {
  it('accepts valid RAW shapes (vars and envVars)', () => {
    const raw = {
      vars: { FOO: 'bar' },
      envVars: { dev: { DEV: '1' } },
      scripts: { build: 'npm run build' },
    };
    const res = getDotenvConfigSchemaRaw.safeParse(raw);
    expect(res.success).toBe(true);
  });

  it('resolves without top-level operational keys', () => {
    const raw = {
      vars: { A: '1' },
      envVars: { dev: { B: '2' } },
    };
    const resolved = getDotenvConfigSchemaResolved.parse(raw);
    expect(resolved.vars?.A).toBe('1');
    expect(resolved.envVars?.dev?.B).toBe('2');
  });

  it('errors on invalid shapes with helpful messages', () => {
    const bad = { envVars: { dev: { OK: 1 } } } as unknown; // non-string value
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
