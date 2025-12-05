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

  // Additional public API sanity checks
  // 1) index.d.ts (or index.d.mts) should expose DynamicFn/DynamicMap (directly or via re-export).
  const indexCandidates = ['index.d.ts', 'index.d.mts'];
  let indexTxt = '';
  let indexFound = '';
  for (const cand of indexCandidates) {
    try {
      indexTxt = await fs.readFile(path.join(DIST, cand), 'utf-8');
      indexFound = cand;
      if (indexTxt) break;
    } catch {
      /* try next */
    }
  }
  if (!indexTxt) {
    issues.push({
      file: indexCandidates.join(' | '),
      msg: 'missing (build before verify-types)',
    });
  } else {
    if (!/DynamicFn\b/.test(indexTxt)) {
      issues.push({
        file: indexFound || 'index.d.ts',
        msg: 'DynamicFn not found in public types (expected export or re-export)',
      });
    }
    if (!/DynamicMap\b/.test(indexTxt)) {
      issues.push({
        file: indexFound || 'index.d.ts',
        msg: 'DynamicMap not found in public types (expected export or re-export)',
      });
    }
  }

  // 2) env-overlay.d.ts (or .d.mts) should declare overlayEnv with programmaticVars in the args type (overload surface).
  //    Some bundlers may emit a re-export stub; in that case, chase the re-export
  //    one level and validate the target payload.
  const overlayCandidates = ['env-overlay.d.ts', 'env-overlay.d.mts'];
  let overlayTxt = '';
  let overlayFound = '';
  for (const cand of overlayCandidates) {
    try {
      overlayTxt = await fs.readFile(path.join(DIST, cand), 'utf-8');
      overlayFound = cand;
      if (overlayTxt) break;
    } catch {
      /* try next */
    }
  }
  // Helper: determine whether text contains the overlay declaration and the
  // programmaticVars parameter shape.
  const hasOverlayDecl = (txt) => /overlayEnv\s*(?:<[^>]*>)?\s*\(/.test(txt);
  const hasProgrammaticParam = (txt) => /programmaticVars\??:/.test(txt);
  // Helper: chase a single-level re-export, e.g.:
  //   export { overlayEnv } from "./overlay-XXXX.d.ts";
  // Returns the loaded target text (or empty string on failure).
  const chaseReexport = async (baseFile, txt) => {
    try {
      const m =
        /export\s*{\s*overlayEnv(?:\s+as\s+\w+)?\s*}\s*from\s*['"]([^'"]+)['"]/.exec(
          txt,
        );
      if (!m || !m[1]) return '';
      const dir = path.dirname(path.join(DIST, baseFile));
      const targetRaw = m[1];
      const tryPaths = [];
      // Try as-is (may already include .d.ts/.ts)
      tryPaths.push(path.resolve(dir, targetRaw));
      // Add common extensions if missing
      if (!/\.(d\.)?ts$/.test(targetRaw)) {
        tryPaths.push(path.resolve(dir, `${targetRaw}.d.ts`));
        tryPaths.push(path.resolve(dir, `${targetRaw}.ts`));
      }
      for (const p of tryPaths) {
        try {
          const t = await fs.readFile(p, 'utf-8');
          if (t && t.length > 0) return t;
        } catch {
          /* try next candidate */
        }
      }
      return '';
    } catch {
      return '';
    }
  };
  if (!overlayTxt) {
    issues.push({
      file: overlayCandidates.join(' | '),
      msg: 'missing (build before verify-types)',
    });
  } else {
    // Check direct content first; if not present, attempt to follow a single
    // re-export to the actual declaration and validate there.
    let overlayOk = hasOverlayDecl(overlayTxt);
    let overlayProg = hasProgrammaticParam(overlayTxt);
    if (!overlayOk || !overlayProg) {
      const chased = await chaseReexport(
        overlayFound || overlayCandidates[0],
        overlayTxt,
      );
      if (chased) {
        overlayOk = overlayOk || hasOverlayDecl(chased);
        overlayProg = overlayProg || hasProgrammaticParam(chased);
      }
    }
    if (!overlayOk) {
      issues.push({
        file: overlayFound || 'env-overlay.d.ts',
        msg: 'overlayEnv declaration not found in env overlay types (including chased re-export)',
      });
    }
    if (!overlayProg) {
      issues.push({
        file: overlayFound || 'env-overlay.d.ts',
        msg: 'programmaticVars parameter not detected in overlayEnv types (including chased re-export)',
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
