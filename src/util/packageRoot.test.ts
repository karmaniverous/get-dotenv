import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { readHostPackage, resolvePackageRoot } from './packageRoot';

const dirs: string[] = [];
const tmp = () => {
  const d = mkdtempSync(path.join(os.tmpdir(), 'gdv-pkgroot-'));
  dirs.push(d);
  return d;
};
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

/** A package dir with `pkg` as package.json text and a nested module URL. */
const pkgWith = (pkg: string) => {
  const root = tmp();
  writeFileSync(path.join(root, 'package.json'), pkg);
  mkdirSync(path.join(root, 'dist', 'chunks'), { recursive: true });
  const url = pathToFileURL(path.join(root, 'dist', 'chunks', 'cli.js')).href;
  return { root, url };
};

describe('resolvePackageRoot', () => {
  it('finds the nearest package.json above the module', async () => {
    const { root, url } = pkgWith('{}');
    expect(await resolvePackageRoot(url)).toBe(root);
  });
});

describe('readHostPackage', () => {
  it('reads the root, version and description', async () => {
    const { root, url } = pkgWith(
      JSON.stringify({ version: '9.9.9', description: 'Host.' }),
    );
    expect(await readHostPackage(url)).toEqual({
      root,
      version: '9.9.9',
      description: 'Host.',
    });
  });

  it('omits fields that are missing or not strings', async () => {
    const { root, url } = pkgWith(
      JSON.stringify({ version: 9, description: null }),
    );
    expect(await readHostPackage(url)).toEqual({ root });
  });

  it('is undefined without a URL or with an unreadable package.json', async () => {
    expect(await readHostPackage(undefined)).toBeUndefined();
    expect(await readHostPackage('')).toBeUndefined();
    const { url } = pkgWith('{ not json');
    expect(await readHostPackage(url)).toBeUndefined();
  });
});
