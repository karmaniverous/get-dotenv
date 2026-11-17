/**
 * #55: the editor's target-selection helpers are part of the package's public
 * surface, so plugins and tools can reuse `editDotenvFile`'s selection.
 */
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import type {
  BuildDotenvTargetFilenameOptions,
  DotenvFs,
  ResolveDotenvTargetOptions,
  ResolveDotenvTargetResult,
} from './index';
import * as pkg from './index';

describe('package entry: dotenv target helpers (#55)', () => {
  it('exports buildDotenvTargetFilename and resolveDotenvTarget', () => {
    expect(typeof pkg.buildDotenvTargetFilename).toBe('function');
    expect(typeof pkg.resolveDotenvTarget).toBe('function');
  });

  it('the exported helpers select like editDotenvFile', async () => {
    const opts: BuildDotenvTargetFilenameOptions = {
      scope: 'env',
      privacy: 'private',
      env: 'dev',
    };
    expect(pkg.buildDotenvTargetFilename(opts)).toBe('.env.dev.local');

    const dir = path.resolve('/repo');
    const template = path.resolve(dir, '.env.env.local.template');
    const fs: DotenvFs = {
      pathExists: (p) => Promise.resolve(p === template),
      readFile: () => Promise.resolve(''),
      writeFile: () => Promise.resolve(),
      copyFile: () => Promise.resolve(),
    };
    const resolveOpts: ResolveDotenvTargetOptions = {
      ...opts,
      paths: [dir],
      fs,
    };
    const out: ResolveDotenvTargetResult =
      await pkg.resolveDotenvTarget(resolveOpts);
    expect(out).toEqual({
      targetPath: path.resolve(dir, '.env.dev.local'),
      templatePath: template,
      filename: '.env.dev.local',
    });
  });
});
