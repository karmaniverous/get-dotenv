/**
 * The compile plugin bundles the project's own files and leaves built-ins and
 * installed packages to Node. Runs esbuild in-process and reads the output.
 */
import { rmSync } from 'node:fs';

import { build } from 'esbuild';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  type EsbuildFixture,
  writeEsbuildFixture,
} from '@/test/support/esbuildFixture';

import { externalizeInstalledPackages } from './externalizeInstalledPackages';

let fx: EsbuildFixture;
let output: string;

beforeAll(async () => {
  fx = writeEsbuildFixture();
  const result = await build({
    entryPoints: [fx.entry],
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
    logLevel: 'silent',
    conditions: [],
    plugins: [externalizeInstalledPackages()],
  });
  output = result.outputFiles[0]?.text ?? '';
});
afterAll(() => {
  rmSync(fx.root, { recursive: true, force: true });
});

/** The specifiers of the output's top-level static imports. */
const importedSpecifiers = () =>
  [...output.matchAll(/^import .*?"([^"]+)";$/gm)].map((m) => m[1]);

describe('externalizeInstalledPackages', () => {
  it('imports an installed package by its resolved file URL', () => {
    const pkg = importedSpecifiers().filter((s) => s?.includes('fake-pkg'));
    expect(pkg).toHaveLength(1);
    expect(pkg[0]).toMatch(/^file:\/\/.*\/node_modules\/fake-pkg\/index\.js$/);
    expect(output).not.toContain("from: 'import'");
  });

  it('keeps a built-in as a node: import', () => {
    expect(importedSpecifiers()).toContain('node:fs');
  });

  it('bundles relative imports and tsconfig path aliases', () => {
    expect(output).toContain('local-value');
    expect(output).toContain('alias-value');
  });

  it('bundles require() calls (an ESM bundle cannot require a URL)', () => {
    expect(output).toContain('cjs-value');
    expect(importedSpecifiers().some((s) => s?.includes('cjs-pkg'))).toBe(
      false,
    );
  });

  it('prefixes an unprefixed built-in subpath (esbuild cannot resolve readline/promises)', async () => {
    const result = await build({
      stdin: {
        contents: "export { createInterface } from 'readline/promises';",
        resolveDir: fx.root,
      },
      bundle: true,
      platform: 'node',
      format: 'esm',
      write: false,
      logLevel: 'silent',
      plugins: [externalizeInstalledPackages()],
    });
    expect(result.outputFiles[0]?.text).toContain('"node:readline/promises"');
  });
});
