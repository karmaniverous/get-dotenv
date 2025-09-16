import fs from 'fs-extra';
import path from 'path';
import { describe, expect, it } from 'vitest';

import { getDotenvCliOptionsSchemaRaw } from './getDotenvCliOptions';

describe('schema/getDotenvCliOptions', () => {
  it('accepts valid CLI-facing options (stringly inputs allowed)', () => {
    const input = {
      dotenvToken: '.env',
      debug: true,
      paths: './ ./packages/app',
      pathsDelimiter: ' ',
      vars: 'FOO=bar BAZ=qux',
      varsAssignor: '=',
      varsDelimiter: ' ',
      shell: true,
      scripts: {
        build: { cmd: 'npm run build', shell: '/bin/bash' },
        echo: 'echo ok',
      },
    };
    const res = getDotenvCliOptionsSchemaRaw.safeParse(input);
    expect(res.success).toBe(true);
  });

  it('validates the packaged root defaults config (getdotenv.config.json)', async () => {
    const cfgPath = path.resolve('getdotenv.config.json');
    const exists = await fs.pathExists(cfgPath);
    expect(exists).toBe(true);
    const raw = JSON.parse(await fs.readFile(cfgPath, 'utf-8')) as unknown;

    const parsed = getDotenvCliOptionsSchemaRaw.safeParse(raw);
    if (!parsed.success) {
      // Surface helpful diagnostics in case of failure.
      // This should pass; failure would indicate a packaging error.
      const msgs = parsed.error.issues.map(
        (i) => `${i.path.join('.')}: ${i.message}`,
      );
      throw new Error(
        `packaged getdotenv.config.json failed schema validation:\n${msgs.join(
          '\n',
        )}`,
      );
    }
    expect(parsed.success).toBe(true);
  });

  it('produces informative errors on invalid shapes', () => {
    const bad = {
      shell: 123, // must be boolean or string
      debug: 'yes', // must be boolean
      pathsDelimiter: 5, // must be string
    } as unknown;
    const res = getDotenvCliOptionsSchemaRaw.safeParse(bad);
    expect(res.success).toBe(false);

    if (!res.success) {
      const issues = res.error.issues.map((i) => i.path.join('.'));
      expect(issues).toContain('shell');
      expect(issues).toContain('debug');
      expect(issues).toContain('pathsDelimiter');
    }
  });
});
