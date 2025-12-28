#!/usr/bin/env node
/**
 * Verify dist bundles keep Commander external (tree-shaken) and do not inline it.
 *
 * Checks representative ESM outputs for explicit import of
 * '@commander-js/extra-typings' and fails when the file is missing or does not
 * reference Commander externally (directly or via shared chunks).
 *
 * Intended coverage:
 *  - dist/cliHost.mjs
 *
 * Notes:
 * - Rollup externalizes dependencies; this check guards against regressions where
 *   Commander might be bundled or dead-import removed in a way that changes surface.
 * - This repo imports Commander from '@commander-js/extra-typings' at runtime.
 *   Treat that as the primary external reference.
 * - This is a heuristic: we assert the presence of external imports, not the absence
 *   of every possible inlining form. Good enough to catch common config mistakes.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const DIST = 'dist';
// Limit the check to the CLI host bundle, which must import Commander.
const targets = [{ file: 'cliHost.mjs', type: 'esm' }];

// Require @commander-js/extra-typings (primary external)
const hasCommanderImport = (txt) =>
  /from\s+['"]@commander-js\/extra-typings['"]/.test(txt) ||
  /import\s+['"]@commander-js\/extra-typings['"]/.test(txt);
const hasCommanderRequire = (txt) =>
  /require\(['"]@commander-js\/extra-typings['"]\)/.test(txt);

const isRelative = (spec) =>
  typeof spec === 'string' && (spec.startsWith('./') || spec.startsWith('../'));

// Extract static relative import/export specifiers (best-effort, regex-based).
const extractRelativeDeps = (txt) => {
  const specs = new Set();

  // import ... from './x'
  const reImportFrom = /\bimport\s+[^;]*?\s+from\s+['"]([^'"]+)['"]/g;
  // import './x'
  const reImportBare = /\bimport\s+['"]([^'"]+)['"]/g;
  // export ... from './x'
  const reExportFrom = /\bexport\s+[^;]*?\s+from\s+['"]([^'"]+)['"]/g;

  let m;
  while ((m = reImportFrom.exec(txt))) {
    if (isRelative(m[1])) specs.add(m[1]);
  }
  while ((m = reImportBare.exec(txt))) {
    if (isRelative(m[1])) specs.add(m[1]);
  }
  while ((m = reExportFrom.exec(txt))) {
    if (isRelative(m[1])) specs.add(m[1]);
  }

  return Array.from(specs);
};

const readUtf8 = async (abs) => {
  try {
    return await fs.readFile(abs, 'utf-8');
  } catch {
    return '';
  }
};

// Resolve a relative spec from a base file to on-disk candidate path(s).
const resolveRel = (baseFileAbs, spec) => {
  const baseDir = path.dirname(baseFileAbs);
  const abs = path.resolve(baseDir, spec);

  // Rollup ESM output typically includes an extension; if not, try ".mjs".
  if (path.extname(abs)) return [abs];
  return [abs, `${abs}.mjs`];
};

// Scan a file and its reachable relative deps for an external commander reference.
const graphHasCommander = async (entryAbs) => {
  const queue = [entryAbs];
  const seen = new Set();

  while (queue.length > 0) {
    const cur = queue.shift();
    if (!cur || seen.has(cur)) continue;
    seen.add(cur);

    const txt = await readUtf8(cur);
    if (!txt) continue;

    if (hasCommanderImport(txt) || hasCommanderRequire(txt)) {
      return { ok: true, filesScanned: seen.size };
    }

    const deps = extractRelativeDeps(txt);
    for (const spec of deps) {
      for (const cand of resolveRel(cur, spec)) {
        if (!seen.has(cand)) queue.push(cand);
      }
    }
  }

  return { ok: false, filesScanned: seen.size };
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
    const txt = await readUtf8(p);
    if (!txt) {
      results.push({ file: t.file, ok: false, reason: 'missing', scanned: 0 });
      continue;
    }

    // ESM builds may import commander from shared chunks; scan reachable relative deps.
    const scanned =
      t.type === 'esm'
        ? await graphHasCommander(path.resolve(p))
        : { ok: hasCommanderRequire(txt), filesScanned: 1 };

    results.push({
      file: t.file,
      ok: scanned.ok,
      reason: scanned.ok
        ? undefined
        : 'no external @commander-js/extra-typings reference (in file or reachable chunks)',
      scanned: scanned.filesScanned,
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
        `- ${r.file}: external commander (@commander-js/extra-typings) reference (scanned ${String(
          r.scanned ?? 1,
        )} file(s))`,
    )
    .join('\n');
  ok(lines);
};

main().catch((e) => {
  err(String(e?.stack ?? e));
});
