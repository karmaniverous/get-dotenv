/**
 * The compile plugin bundles the module's own code and leaves built-ins and
 * installed ESM packages to Node. Runs esbuild in-process and reads the
 * output.
 */
import { rmSync } from 'node:fs';

import { build, type BuildOptions } from 'esbuild';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  type EsbuildFixture,
  writeEsbuildFixture,
} from '@/test/support/esbuildFixture';

import {
  externalizeInstalledPackages,
  packageNameOf,
} from './externalizeInstalledPackages';

let fx: EsbuildFixture;

const compile = async (opts: BuildOptions): Promise<string> => {
  const result = await build({
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
    logLevel: 'silent',
    plugins: [externalizeInstalledPackages()],
    ...opts,
  });
  return result.outputFiles?.[0]?.text ?? '';
};

/** The specifiers of an output's top-level static imports. */
const importsOf = (output: string) =>
  [...output.matchAll(/^import .*?"([^"]+)";$/gm)].map((m) => m[1] ?? '');

const supportsModuleSync = Boolean(
  (process.features as { require_module?: boolean }).require_module,
);

let output: string;
beforeAll(async () => {
  fx = writeEsbuildFixture();
  output = await compile({ entryPoints: [fx.entry] });
});
afterAll(() => {
  rmSync(fx.root, { recursive: true, force: true });
});

describe('externalizeInstalledPackages', () => {
  it("imports an ESM package by the file Node's conditions select", () => {
    const pkg = importsOf(output).filter((s) => s.includes('fake-pkg'));
    const file = supportsModuleSync ? 'sync' : 'index';
    expect(pkg).toEqual([
      expect.stringMatching(
        new RegExp(`^file:///.*/node_modules/fake-pkg/${file}\\.js$`),
      ),
    ]);
    expect(output).not.toContain('marker = {');
  });

  it('imports a linked package (outside node_modules) by its real path', () => {
    const linked = importsOf(output).filter((s) => s.includes('linked'));
    expect(linked).toEqual([
      expect.stringMatching(/^file:\/\/\/.*\/linked\/index\.js$/),
    ]);
  });

  it('imports .mjs and nested "type": "module" packages in a CommonJS scope', () => {
    const imports = importsOf(output);
    expect(imports).toContainEqual(
      expect.stringMatching(/\/node_modules\/mjs-pkg\/index\.mjs$/),
    );
    expect(imports).toContainEqual(
      expect.stringMatching(/\/node_modules\/dual-pkg\/esm\/index\.js$/),
    );
  });

  it('bundles require() of an ESM package (an ESM bundle cannot require a URL)', async () => {
    const out = await compile({
      stdin: {
        contents: "module.exports = require('mjs-pkg');",
        resolveDir: fx.root,
      },
    });
    expect(out).toContain('mjs-value');
    expect(importsOf(out)).toEqual([]);
  });

  it('keeps a built-in as a node: import', () => {
    expect(importsOf(output)).toContain('node:fs');
  });

  it('bundles local files, path aliases, JSON and CommonJS packages', () => {
    for (const v of [
      'local-value',
      'alias-value',
      'js-alias-value',
      'rel-value',
      'json-value',
      'cjs-value',
      'cjs-default',
    ])
      expect(output).toContain(v);
    expect(importsOf(output).filter((s) => !s.startsWith('node:'))).toEqual(
      importsOf(output).filter((s) =>
        /fake-pkg|linked|mjs-pkg|dual-pkg/.test(s),
      ),
    );
  });

  it('bundles a config shipped inside node_modules, with its relative imports', async () => {
    const host = await compile({ entryPoints: [fx.hostConfig] });
    expect(host).toContain('host-helper');
    expect(importsOf(host)).toEqual([
      expect.stringMatching(/^file:\/\/\/.*\/node_modules\/fake-pkg\//),
    ]);
  });

  it('prefixes an unprefixed built-in subpath (esbuild cannot resolve readline/promises)', async () => {
    const out = await compile({
      stdin: {
        contents: "export { createInterface } from 'readline/promises';",
        resolveDir: fx.root,
      },
    });
    expect(out).toContain('"node:readline/promises"');
  });
});

describe('packageNameOf', () => {
  it.each([
    ['pkg', 'pkg'],
    ['pkg/sub/path', 'pkg'],
    ['@scope/pkg', '@scope/pkg'],
    ['@scope/pkg/sub', '@scope/pkg'],
    ['@scope', undefined],
    ['./local', undefined],
    ['../up', undefined],
    ['#internal', undefined],
    ['/abs/path', undefined],
    ['file:///x.js', undefined],
    ['C:\\x\\y.js', undefined],
  ])('%s -> %s', (spec, name) => {
    expect(packageNameOf(spec)).toBe(name);
  });
});
