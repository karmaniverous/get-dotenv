/**
 * A throwaway project for compiling a TS module with esbuild. It holds every
 * kind of import the compile treats differently:
 *
 * - local files and a `tsconfig` path alias (bundled);
 * - `fake-pkg`, an installed ESM package whose `exports` differ by condition
 *   (`module-sync`, esbuild's `module`, `import`) and import the unprefixed
 *   `readline/promises`, plus a JSON subpath (bundled);
 * - `linked-pkg`, an ESM package linked into `node_modules` from outside it
 *   (a directory junction / symlink, as `npm link` and workspaces make);
 * - `cjs-pkg` (loaded with `require()`) and `cjs-default-pkg` (a tsc-style
 *   `__esModule` default export), both CommonJS (bundled);
 * - `host-pkg`, an installed package that ships its own TS config with a
 *   relative TS import (a host's packaged config);
 * - `mjs-pkg` (`.mjs` in a CommonJS scope) and `dual-pkg` (a CommonJS
 *   package whose `esm/` folder has its own unnamed `"type": "module"`
 *   `package.json`), both ES modules to Node;
 * - `@js/*`, a path alias to an ESM `.js` file of the project (bundled: it
 *   isn't a package of that name), and a relative import of an ESM `.js`
 *   file with no named `package.json` above it (bundled).
 *
 * `probe.mjs` re-exports what Node itself resolves for `fake-pkg` and
 * `linked-pkg` from the project root, to compare instances against.
 */
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** Paths in the fixture project. */
export interface EsbuildFixture {
  /** Project root (a temp directory; remove it when done). */
  root: string;
  /** Entry module: imports everything above and default-exports it. */
  entry: string;
  /** The packaged config shipped inside `node_modules/host-pkg`. */
  hostConfig: string;
  /** Re-exports Node's own resolution of `fake-pkg` and `linked-pkg`. */
  probe: string;
}

const json = (value: unknown) => JSON.stringify(value);
const marker = (from: string, readline: boolean) =>
  [
    ...(readline
      ? ["import { createInterface } from 'readline/promises';"]
      : []),
    `export const marker = { from: '${from}'${readline ? ', rl: typeof createInterface' : ''} };`,
  ].join('\n');

const files: Record<string, string> = {
  // CommonJS scope (no "type"), so esbuild honours a CommonJS package's
  // `__esModule` default export, as it does for a typical TS project. No
  // name either: no package.json above `esm-unnamed/rel.js` names it.
  'package.json': json({}),
  'esm-unnamed/package.json': json({ type: 'module' }),
  'esm-unnamed/rel.js': "export const rel = 'rel-value';",
  'tsconfig.json': json({
    compilerOptions: {
      baseUrl: '.',
      paths: { '@lib/*': ['./lib/*'], '@js/*': ['./jslib/*'] },
    },
  }),
  'local.ts': "export const local = 'local-value';",
  'lib/helper.ts': "export const helper = 'alias-value';",
  'jslib/package.json': json({ type: 'module' }),
  'jslib/esm.js': "export const jsAlias = 'js-alias-value';",
  'node_modules/mjs-pkg/package.json': json({
    name: 'mjs-pkg',
    main: 'index.mjs',
  }),
  'node_modules/mjs-pkg/index.mjs': "export const mjs = 'mjs-value';",
  'node_modules/dual-pkg/package.json': json({
    name: 'dual-pkg',
    exports: './esm/index.js',
  }),
  'node_modules/dual-pkg/esm/package.json': json({ type: 'module' }),
  'node_modules/dual-pkg/esm/index.js': "export const dual = 'dual-value';",
  'node_modules/fake-pkg/package.json': json({
    name: 'fake-pkg',
    type: 'module',
    exports: {
      '.': {
        'module-sync': './sync.js',
        module: './module.js',
        import: './index.js',
      },
      './data.json': './data.json',
    },
  }),
  'node_modules/fake-pkg/sync.js': marker('module-sync', true),
  'node_modules/fake-pkg/module.js': marker('module', false),
  'node_modules/fake-pkg/index.js': marker('import', true),
  'node_modules/fake-pkg/data.json': json({ json: 'json-value' }),
  'linked/package.json': json({
    name: 'linked-pkg',
    type: 'module',
    exports: './index.js',
  }),
  'linked/index.js': "export const linked = { id: 'linked' };",
  'node_modules/cjs-pkg/package.json': json({
    name: 'cjs-pkg',
    main: 'index.js',
  }),
  'node_modules/cjs-pkg/index.js': "module.exports = { cjs: 'cjs-value' };",
  'node_modules/cjs-default-pkg/package.json': json({
    name: 'cjs-default-pkg',
    main: 'index.js',
  }),
  'node_modules/cjs-default-pkg/index.js': [
    "Object.defineProperty(exports, '__esModule', { value: true });",
    "exports.default = function () { return 'cjs-default'; };",
  ].join('\n'),
  'node_modules/host-pkg/package.json': json({
    name: 'host-pkg',
    type: 'module',
  }),
  'node_modules/host-pkg/hostHelper.ts':
    "export const hostHelper: string = 'host-helper';",
  'node_modules/host-pkg/getdotenv.config.ts': [
    "import { marker } from 'fake-pkg';",
    "import { hostHelper } from './hostHelper';",
    'export default { marker, hostHelper };',
  ].join('\n'),
  'entry.ts': [
    "import { readFileSync } from 'node:fs';",
    "import { marker } from 'fake-pkg';",
    "import data from 'fake-pkg/data.json';",
    "import { linked } from 'linked-pkg';",
    "import cjsDefault from 'cjs-default-pkg';",
    "import { helper } from '@lib/helper';",
    "import { jsAlias } from '@js/esm.js';",
    "import { mjs } from 'mjs-pkg';",
    "import { dual } from 'dual-pkg';",
    "import { local } from './local';",
    "import { rel } from './esm-unnamed/rel.js';",
    'declare const require: (id: string) => { cjs: string };',
    "const { cjs } = require('cjs-pkg');",
    'export default {',
    '  marker, json: data.json, linked, cjsDefault: cjsDefault(),',
    '  helper, jsAlias, mjs, dual, local, rel, cjs, fs: typeof readFileSync,',
    '};',
  ].join('\n'),
  'probe.mjs': [
    "export { marker } from 'fake-pkg';",
    "export { linked } from 'linked-pkg';",
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
  // A junction on Windows (no privilege needed); a symlink elsewhere.
  symlinkSync(
    path.join(root, 'linked'),
    path.join(root, 'node_modules', 'linked-pkg'),
    'junction',
  );
  return {
    root,
    entry: path.join(root, 'entry.ts'),
    hostConfig: path.join(
      root,
      'node_modules',
      'host-pkg',
      'getdotenv.config.ts',
    ),
    probe: path.join(root, 'probe.mjs'),
  };
};
