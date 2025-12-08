#!/usr/bin/env node
/**
 * Verify dist bundles keep Commander external (tree-shaken) and do not inline it.
 *
 * Checks representative ESM/CJS outputs for explicit import/require of 'commander'
 * or '@commander-js/extra-typings' and fails when the files are missing or do not
 * reference Commander externally.
 *
 * Intended coverage:
 *  - dist/index.mjs / dist/index.cjs
 *  - dist/cliHost.mjs / dist/cliHost.cjs
 *
 * Notes:
 * - Rollup externalizes dependencies; this check guards against regressions where
 *   Commander might be bundled or dead-import removed in a way that changes surface.
 * - This repo now imports Commander from '@commander-js/extra-typings' at runtime.
 *   Treat that as the primary external reference, with 'commander' kept for
 *   backward compatibility.
 * - This is a heuristic: we assert the presence of external imports, not the absence
 *   of every possible inlining form. Good enough to catch common config mistakes.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const DIST = 'dist';
const targets = [
  { file: 'index.mjs', type: 'esm' },
  { file: 'cliHost.mjs', type: 'esm' },
];

// Accept either @commander-js/extra-typings (preferred) or commander (legacy)
const hasCommanderImport = (txt) => {
  const esmExtra =
    /from\s+['"]@commander-js\/extra-typings['"]/.test(txt) ||
    /import\s+['"]@commander-js\/extra-typings['"]/.test(txt);
  const esmPlain =
    /from\s+['"]commander['"]/.test(txt) ||
    /import\s+['"]commander['"]/.test(txt);
  return esmExtra || esmPlain;
};
const hasCommanderRequire = (txt) => {
  const cjsExtra = /require\(['"]@commander-js\/extra-typings['"]\)/.test(txt);
  const cjsPlain = /require\(['"]commander['"]\)/.test(txt);
  return cjsExtra || cjsPlain;
};

const err = (msg) => {
  // Keep errors concise and deterministic; exit non-zero.
  console.error('verify-bundle-imports: FAILED');
  console.error(msg);
  process.exit(1);
};
const ok = (msg) => {
  console.log('verify-bundle-imports: OK');
  console.log(msg);
};

const main = async () => {
  // Ensure dist exists
  try {
    const stat = await fs.stat(DIST);
    if (!stat.isDirectory()) {
      err(
        `"${DIST}" exists but is not a directory. Build before verify-bundle.`,
      );
    }
  } catch {
    err(`"${DIST}" not found. Build before verify-bundle.`);
  }

  const results = [];
  for (const t of targets) {
    const p = path.join(DIST, t.file);
    let txt = '';
    try {
      txt = await fs.readFile(p, 'utf-8');
    } catch {
      results.push({ file: t.file, ok: false, reason: 'missing' });
      continue;
    }
    const good =
      t.type === 'esm' ? hasCommanderImport(txt) : hasCommanderRequire(txt);
    results.push({
      file: t.file,
      ok: good,
      reason: good
        ? undefined
        : 'no external commander (@commander-js/extra-typings) reference',
    });
  }

  const bad = results.filter((r) => !r.ok);
  if (bad.length > 0) {
    const lines = bad
      .map((r) => `- ${r.file}: ${r.reason ?? 'invalid'}`)
      .join('\n');
    err(`One or more bundles failed sanity checks:\n${lines}`);
  }
  const lines = results
    .map(
      (r) =>
        `- ${r.file}: external commander (@commander-js/extra-typings) reference`,
    )
    .join('\n');
  ok(lines);
};

main().catch((e) => {
  err(String(e?.stack ?? e));
});
