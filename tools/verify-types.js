#!/usr/bin/env node
/**
 * Verify type identity in emitted plugin .d.ts files.
 *
 * Fails when any dist/plugins*.d.{ts,mts,cts} imports cliHost types from a non-public
 * path (e.g., a relative or internal path). Public imports must use:
 *   '@karmaniverous/get-dotenv/cliHost'
 *
 * Notes:
 * - Many d.ts bundles inline types; absence of any cliHost import is OK.
 * - We only guard against incorrect cliHost import paths when present.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const DIST = 'dist';
const isPluginTypes = (name) =>
  /^plugins.*\.d\.(ts|mts|cts)$/.test(name) && !name.endsWith('.map');

const cliHostOk = '@karmaniverous/get-dotenv/cliHost';

const badCliHostImport = (txt) => {
  // Match either `from '...cliHost...'` or `import('...cliHost...')`
  const reFrom = /from\s+['"]([^'"]*cliHost[^'"]*)['"]/g;
  const reDyn = /import\(\s*['"]([^'"]*cliHost[^'"]*)['"]\s*\)/g;
  const hits = [];
  let m;
  while ((m = reFrom.exec(txt))) hits.push(m[1]);
  while ((m = reDyn.exec(txt))) hits.push(m[1]);
  // Bad if any cliHost import is present and not the public subpath
  return hits.filter((p) => p !== cliHostOk);
};

const main = async () => {
  let entries;
  try {
    entries = await fs.readdir(DIST);
  } catch (e) {
    console.error(
      'verify-types: ERROR\nUnable to read dist/ (build before verify-types).',
    );
    console.error(String(e));
    process.exit(1);
  }
  const targets = entries.filter(isPluginTypes);
  if (targets.length === 0) {
    console.error(
      'verify-types: ERROR\nNo plugin type bundles found in dist/ (build first).',
    );
    process.exit(1);
  }
  const issues = [];
  for (const f of targets) {
    const p = path.join(DIST, f);
    let txt = '';
    try {
      txt = await fs.readFile(p, 'utf-8');
    } catch {
      issues.push({ file: f, msg: 'unable to read file' });
      continue;
    }
    const bad = badCliHostImport(txt);
    if (bad.length > 0) {
      issues.push({
        file: f,
        msg: `invalid cliHost import path(s): ${bad.join(', ')}`,
      });
    }
  }
  if (issues.length > 0) {
    console.error('verify-types: FAILED');
    for (const it of issues) {
      console.error(`- ${it.file}: ${it.msg}`);
    }
    process.exit(1);
  }
  console.log('verify-types: OK');
};

main().catch((e) => {
  console.error('verify-types: ERROR\n', e?.stack ?? String(e));
  process.exit(1);
});
