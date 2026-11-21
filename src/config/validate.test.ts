/**
 * Tests for #96: `validateEnvAgainstSources` validates every config layer's
 * schema (not just the first found), and unions `requiredKeys` across
 * layers that use it.
 */
import fs from 'fs-extra';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { resolveGetDotenvConfigSources, toFileUrl } from './loader';
import { validateEnvAgainstSources } from './validate';

describe('#96 validateEnvAgainstSources', () => {
  it('validates every layer that has a schema, reporting all issues', () => {
    const sources = {
      packaged: { schema: z.object({ PACKAGED_KEY: z.string() }) },
      project: {
        public: { schema: z.object({ PUBLIC_KEY: z.string() }) },
      },
    };
    const issues = validateEnvAgainstSources({}, sources);
    // One issue per missing key, from each layer's own schema.
    expect(issues.some((m) => m.includes('PACKAGED_KEY'))).toBe(true);
    expect(issues.some((m) => m.includes('PUBLIC_KEY'))).toBe(true);
    expect(issues.length).toBeGreaterThanOrEqual(2);
  });

  it('a project schema no longer shadows the packaged layer (the behaviour change)', () => {
    const sources = {
      packaged: { schema: z.object({ PACKAGED_KEY: z.string() }) },
      project: {
        public: { schema: z.object({ PUBLIC_KEY: z.string() }) },
      },
    };
    // Supplying only the project key still reports the packaged layer's issue.
    const issues = validateEnvAgainstSources({ PUBLIC_KEY: 'x' }, sources);
    expect(issues.some((m) => m.includes('PACKAGED_KEY'))).toBe(true);
    expect(issues.some((m) => m.includes('PUBLIC_KEY'))).toBe(false);
  });

  it('unions requiredKeys across layers that use requiredKeys (base order first, de-duplicated)', () => {
    const sources = {
      packaged: { requiredKeys: ['A', 'B'] },
      project: {
        public: { requiredKeys: ['B', 'C'] },
        local: { requiredKeys: ['D'] },
      },
    };
    const issues = validateEnvAgainstSources({}, sources);
    expect(issues).toEqual([
      '[requiredKeys] missing: A',
      '[requiredKeys] missing: B',
      '[requiredKeys] missing: C',
      '[requiredKeys] missing: D',
    ]);
  });

  it('single-layer behaviour is unchanged: a schema on the only layer supersedes its own requiredKeys', () => {
    const sources = {
      project: {
        public: {
          schema: z.object({ APP: z.string() }),
          requiredKeys: ['NOT_CHECKED'],
        },
      },
    };
    const issues = validateEnvAgainstSources({}, sources);
    expect(issues.some((m) => m.includes('APP'))).toBe(true);
    expect(issues.some((m) => m.includes('NOT_CHECKED'))).toBe(false);
  });

  it('single-layer behaviour is unchanged: requiredKeys alone on the only layer is checked', () => {
    const sources = {
      project: { public: { requiredKeys: ['ONLY_KEY'] } },
    };
    expect(validateEnvAgainstSources({}, sources)).toEqual([
      '[requiredKeys] missing: ONLY_KEY',
    ]);
    expect(validateEnvAgainstSources({ ONLY_KEY: '1' }, sources)).toEqual([]);
  });

  it('a fully valid env across every layer reports nothing', () => {
    const sources = {
      packaged: { schema: z.object({ A: z.string() }) },
      project: {
        public: { schema: z.object({ B: z.string() }) },
        local: { requiredKeys: ['C'] },
      },
    };
    expect(
      validateEnvAgainstSources({ A: 'a', B: 'b', C: 'c' }, sources),
    ).toEqual([]);
  });
});

describe('#96 validateEnvAgainstSources, end-to-end through the loader', () => {
  const TROOT = path.resolve('.tsbuild', 'getdotenv-validate-e2e-tests');
  const PP = path.resolve(TROOT, 'packaged');
  const PR = path.resolve(TROOT, 'project');

  it('loads real packaged + project JS/TS configs and validates both schemas', async () => {
    await fs.ensureDir(PP);
    await fs.writeFile(
      path.join(PP, 'package.json'),
      JSON.stringify({ name: 'pkg' }),
      'utf-8',
    );
    await fs.writeFile(
      path.join(PP, 'getdotenv.config.ts'),
      `
        import { z } from 'zod';
        export default {
          schema: z.object({ PACKAGED_REQUIRED: z.string() }),
        };
      `,
      'utf-8',
    );

    await fs.ensureDir(PR);
    await fs.writeFile(
      path.join(PR, 'package.json'),
      JSON.stringify({ name: 'proj' }),
      'utf-8',
    );
    await fs.writeFile(
      path.join(PR, 'getdotenv.config.ts'),
      `
        import { z } from 'zod';
        export default {
          schema: z.object({ PROJECT_REQUIRED: z.string() }),
        };
      `,
      'utf-8',
    );

    const packagedFileUrl = toFileUrl(path.join(PP, 'index.mjs'));
    const cwdOrig = process.cwd();
    process.chdir(PR);
    try {
      const sources = await resolveGetDotenvConfigSources(packagedFileUrl);

      // Neither key present: both layers report an issue.
      const bothMissing = validateEnvAgainstSources({}, sources);
      expect(bothMissing.some((m) => m.includes('PACKAGED_REQUIRED'))).toBe(
        true,
      );
      expect(bothMissing.some((m) => m.includes('PROJECT_REQUIRED'))).toBe(
        true,
      );

      // Only the project key present: the packaged layer's schema still
      // reports its own issue (it is no longer shadowed by the project's).
      const onlyProject = validateEnvAgainstSources(
        { PROJECT_REQUIRED: 'x' },
        sources,
      );
      expect(onlyProject.some((m) => m.includes('PACKAGED_REQUIRED'))).toBe(
        true,
      );
      expect(onlyProject.some((m) => m.includes('PROJECT_REQUIRED'))).toBe(
        false,
      );

      // Both present: no issues.
      expect(
        validateEnvAgainstSources(
          { PACKAGED_REQUIRED: 'x', PROJECT_REQUIRED: 'y' },
          sources,
        ),
      ).toEqual([]);
    } finally {
      process.chdir(cwdOrig);
      await fs.remove(TROOT);
    }
  });
});
