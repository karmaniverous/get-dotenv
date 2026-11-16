/**
 * Resolution order of the dotenv editor's target (#54, #39).
 *
 * Tiers, highest first, each searched across every path in search order:
 * existing target, env-specific template, shared env template.
 */
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { editDotenvFile } from './editDotenvFile';
import { resolveDotenvTarget } from './resolveDotenvTarget';
import type { DotenvFs } from './types';

const P1 = path.resolve('/repo/p1');
const P2 = path.resolve('/repo/p2');

/** In-memory fs port over a map of absolute path to contents. */
const memFs = (
  files: Record<string, string>,
): DotenvFs & {
  files: Record<string, string>;
} => ({
  files,
  pathExists: (p) => Promise.resolve(p in files),
  readFile: (p) => {
    const v = files[p];
    return v === undefined
      ? Promise.reject(new Error(`ENOENT ${p}`))
      : Promise.resolve(v);
  },
  writeFile: (p, contents) => {
    files[p] = contents;
    return Promise.resolve();
  },
  copyFile: (src, dest) => {
    const v = files[src];
    if (v === undefined) return Promise.reject(new Error(`ENOENT ${src}`));
    files[dest] = v;
    return Promise.resolve();
  },
});

const TARGET = '.env.dev.local';
const ENV_TEMPLATE = '.env.dev.local.template';
const SHARED_TEMPLATE = '.env.env.local.template';

type Kind = 'target' | 'env template' | 'shared template';
const FILE: Record<Kind, string> = {
  target: TARGET,
  'env template': ENV_TEMPLATE,
  'shared template': SHARED_TEMPLATE,
};

/**
 * Each row: the files present per path, and the expected winner. Paths are
 * `[p1, p2]` with the default reverse search order, so p2 is searched first.
 */
const rows: Array<{
  name: string;
  p1: Kind[];
  p2: Kind[];
  expected: { kind: Kind; dir: 'p1' | 'p2' } | 'none';
}> = [
  {
    name: 'existing target in the later-searched path beats both templates in the earlier one (#54)',
    p1: ['target'],
    p2: ['env template', 'shared template'],
    expected: { kind: 'target', dir: 'p1' },
  },
  {
    name: 'existing targets in both paths: first in search order',
    p1: ['target'],
    p2: ['target'],
    expected: { kind: 'target', dir: 'p2' },
  },
  {
    name: 'env template in the later-searched path beats the shared template in the earlier one',
    p1: ['env template'],
    p2: ['shared template'],
    expected: { kind: 'env template', dir: 'p1' },
  },
  {
    name: 'env templates in both paths: first in search order',
    p1: ['env template', 'shared template'],
    p2: ['env template'],
    expected: { kind: 'env template', dir: 'p2' },
  },
  {
    name: 'shared template only, in the later-searched path',
    p1: ['shared template'],
    p2: [],
    expected: { kind: 'shared template', dir: 'p1' },
  },
  {
    name: 'shared templates in both paths: first in search order',
    p1: ['shared template'],
    p2: ['shared template'],
    expected: { kind: 'shared template', dir: 'p2' },
  },
  {
    name: 'nothing anywhere: throws',
    p1: [],
    p2: [],
    expected: 'none',
  },
];

const dirOf = { p1: P1, p2: P2 };

describe('resolveDotenvTarget resolution order (#54, #39)', () => {
  for (const row of rows) {
    it(row.name, async () => {
      const files: Record<string, string> = {};
      for (const k of row.p1) files[path.resolve(P1, FILE[k])] = `${k}\n`;
      for (const k of row.p2) files[path.resolve(P2, FILE[k])] = `${k}\n`;
      const outcome = await resolveDotenvTarget({
        fs: memFs(files),
        paths: [P1, P2],
        scope: 'env',
        privacy: 'private',
        env: 'dev',
      }).then(
        (out) => ({
          targetPath: out.targetPath,
          templatePath: out.templatePath,
        }),
        (e: unknown) =>
          e instanceof Error ? e.message.split(' Checked:')[0] : 'not an Error',
      );
      const want =
        row.expected === 'none'
          ? 'Unable to locate dotenv target ".env.dev.local" under provided paths, and no template was found.'
          : {
              targetPath: path.resolve(dirOf[row.expected.dir], TARGET),
              templatePath:
                row.expected.kind === 'target'
                  ? undefined
                  : path.resolve(
                      dirOf[row.expected.dir],
                      FILE[row.expected.kind],
                    ),
            };
      expect(outcome).toEqual(want);
    });
  }

  it('forward search order flips which path wins within a tier, never the tier order', async () => {
    const templates = {
      [path.resolve(P1, ENV_TEMPLATE)]: 'x\n',
      [path.resolve(P2, ENV_TEMPLATE)]: 'x\n',
      [path.resolve(P1, SHARED_TEMPLATE)]: 'x\n',
    };
    const forward = await resolveDotenvTarget({
      fs: memFs({ ...templates, [path.resolve(P2, TARGET)]: 'x\n' }),
      paths: [P1, P2],
      searchOrder: 'forward',
      scope: 'env',
      privacy: 'private',
      env: 'dev',
    });
    expect(forward).toEqual({
      targetPath: path.resolve(P2, TARGET),
      filename: TARGET,
    });

    const forwardTemplate = await resolveDotenvTarget({
      fs: memFs(templates),
      paths: [P1, P2],
      searchOrder: 'forward',
      scope: 'env',
      privacy: 'private',
      env: 'dev',
    });
    expect(forwardTemplate.templatePath).toBe(path.resolve(P1, ENV_TEMPLATE));
  });

  it('global scope: an existing target in any path beats a template in any path (#54 repro)', async () => {
    const a = path.resolve('/repo/a');
    const b = path.resolve('/repo/b');
    const port = memFs({
      [path.resolve(a, '.env.local.template')]: 'X=template\n',
      [path.resolve(b, '.env.local')]: 'Y=1\n',
    });
    // paths ['b', 'a'], reverse search: a is searched first.
    const out = await editDotenvFile(
      { X: '1' },
      { fs: port, paths: [b, a], scope: 'global', privacy: 'private' },
    );
    expect(out).toEqual({
      path: path.resolve(b, '.env.local'),
      createdFromTemplate: false,
      changed: true,
    });
    expect(port.files[path.resolve(b, '.env.local')]).toBe('Y=1\nX=1\n');
    expect(port.files[path.resolve(a, '.env.local')]).toBeUndefined();
  });

  it('a token equal to the env name lists its template once', async () => {
    await expect(
      resolveDotenvTarget({
        fs: memFs({}),
        paths: [P1],
        scope: 'env',
        privacy: 'public',
        env: 'env',
      }),
    ).rejects.toThrow(
      new Error(
        `Unable to locate dotenv target ".env.env" under provided paths, and no template was found. Checked: ${path.resolve(P1, '.env.env')}, ${path.resolve(P1, '.env.env.template')}`,
      ),
    );
  });
});
