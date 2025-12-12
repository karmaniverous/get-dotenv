#!/usr/bin/env node
import fs from 'fs-extra';
import { distCore, templateCore } from './_expected.js';

const errors = [];
const assert = (cond, msg) => {
  if (!cond) errors.push(msg);
};

const main = async () => {
  const pkgTxt = await fs.readFile('package.json', 'utf-8');
  const pkg = JSON.parse(pkgTxt);

  // Verify publish "files" includes templates and dist
  const files = Array.isArray(pkg.files) ? pkg.files : [];
  assert(
    files.includes('templates'),
    'package.json: "files" must include "templates"',
  );
  assert(files.includes('dist'), 'package.json: "files" must include "dist"');

  // Exports sanity check
  const requiredExports = [
    '.',
    './cliHost',
    './plugins',
    './plugins/aws',
    './plugins/batch',
    './plugins/init',
    './plugins/cmd',
    './config',
    './env/overlay',
  ];
  const exp = pkg.exports ?? {};
  for (const key of requiredExports) {
    assert(
      Object.prototype.hasOwnProperty.call(exp, key),
      `package.json: "exports" missing "${key}"`,
    );
  }
  // Optional: if dist exists, check main JS outputs exist
  const distExists = await fs.pathExists('dist');
  if (distExists) {
    for (const rel of distCore) {
      assert(
        await fs.pathExists(`dist/${rel}`),
        `dist/${rel} not found (build before verify or check rollup config)`,
      );
    }
  }

  // Template presence sanity check
  for (const p of templateCore) {
    assert(
      await fs.pathExists(p),
      `Template missing: ${p} (ensure files are committed)`,
    );
  }

  if (errors.length > 0) {
    console.error('verify-package: FAILED\n- ' + errors.join('\n- '));
    process.exit(1);
  } else {
    console.log('verify-package: OK');
  }
};

main().catch((err) => {
  console.error('verify-package: ERROR\n', err);
  process.exit(1);
});
