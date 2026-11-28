/**
 * A throwaway project for compiling a TS module with esbuild: local files, a
 * `tsconfig` path alias, an installed ESM package whose `exports` differ by
 * condition (and which imports the unprefixed `readline/promises`), and an
 * installed CommonJS package.
 */
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** Paths in the fixture project. */
export interface EsbuildFixture {
  /** Project root (a temp directory; remove it when done). */
  root: string;
  /** Entry module: imports everything below and default-exports it. */
  entry: string;
  /** The ESM package's file for Node's `import` condition. */
  pkgImportFile: string;
}

const files: Record<string, string> = {
  'package.json': '{ "type": "module" }',
  'tsconfig.json': JSON.stringify({
    compilerOptions: { baseUrl: '.', paths: { '@lib/*': ['./lib/*'] } },
  }),
  'local.ts': "export const local = 'local-value';",
  'lib/helper.ts': "export const helper = 'alias-value';",
  'node_modules/fake-pkg/package.json': JSON.stringify({
    name: 'fake-pkg',
    type: 'module',
    exports: { '.': { module: './module.js', import: './index.js' } },
  }),
  'node_modules/fake-pkg/index.js': [
    "import { createInterface } from 'readline/promises';",
    "export const marker = { from: 'import', rl: typeof createInterface };",
  ].join('\n'),
  'node_modules/fake-pkg/module.js':
    "export const marker = { from: 'module' };",
  'node_modules/cjs-pkg/package.json': JSON.stringify({
    name: 'cjs-pkg',
    main: 'index.js',
  }),
  'node_modules/cjs-pkg/index.js': "module.exports = { cjs: 'cjs-value' };",
  'entry.ts': [
    "import { readFileSync } from 'node:fs';",
    "import { marker } from 'fake-pkg';",
    "import { helper } from '@lib/helper';",
    "import { local } from './local';",
    'declare const require: (id: string) => { cjs: string };',
    "const { cjs } = require('cjs-pkg');",
    'export default { marker, helper, local, cjs, fs: typeof readFileSync };',
  ].join('\n'),
};

/**
 * Write the fixture project to a new temp directory.
 *
 * @returns Its paths.
 */
export const writeEsbuildFixture = (): EsbuildFixture => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'gdv-esbuild-'));
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(root, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  return {
    root,
    entry: path.join(root, 'entry.ts'),
    pkgImportFile: path.join(root, 'node_modules', 'fake-pkg', 'index.js'),
  };
};
