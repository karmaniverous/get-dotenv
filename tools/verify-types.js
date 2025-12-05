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
  //    Bundlers may emit re-export stubs (named or star). Follow up to two levels.
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

  // Helper: detect overlay declaration and programmaticVars parameter
  const hasOverlayDecl = (txt) => /overlayEnv\s*(?:<[^>]*>)?\s*\(/.test(txt);
  const hasProgrammaticParam = (txt) => /programmaticVars\??:/.test(txt);

  // Read helper
  const readFileUtf8 = async (abs) => {
    try {
      return await fs.readFile(abs, 'utf-8');
    } catch {
      return '';
    }
  };

  // Resolve a module specifier relative to base file directory and try common extensions.
  const resolveTargets = async (baseFile, spec) => {
    const dir = path.dirname(path.join(DIST, baseFile));
    const candidates = [];
    const push = (p) => candidates.push(path.resolve(dir, p));
    // Always try as provided first
    push(spec);
    // Derive additional candidates by replacing or adding extensions
    try {
      const ext = path.extname(spec).toLowerCase();
      const withoutExt =
        ext.length > 0 ? spec.slice(0, spec.length - ext.length) : spec;
      if (ext === '') {
        // No extension: try ".d.ts" and ".ts"
        push(`${spec}.d.ts`);
        push(`${spec}.ts`);
      } else if (ext === '.js' || ext === '.mjs' || ext === '.cjs') {
        // JS re-export stubs: chase TS sources and declaration bundles
        push(`${withoutExt}.d.ts`);
        push(`${withoutExt}.ts`);
      } else if (!/\.d\.ts$/.test(spec) && ext !== '.ts') {
        // Unknown extensions: add best-effort TS candidates
        push(`${withoutExt}.d.ts`);
        push(`${withoutExt}.ts`);
      }
    } catch {
      // Best-effort only; fall through with whatever we gathered
    }

    const texts = [];
    for (const p of candidates) {
      const t = await readFileUtf8(p);
      if (t) texts.push({ path: p, txt: t });
    }
    return texts;
  };

  // Extract re-export targets (both named and star forms)
  const extractReexportSpecs = (txt) => {
    const specs = new Set();
    // export { overlayEnv } from '...'
    const reNamed =
      /export\s*{\s*[^}]*\boverlayEnv\b[^}]*}\s*from\s*['"]([^'"]+)['"]/g;
    // export * from '...'
    const reStar = /export\s*\*\s*from\s*['"]([^'"]+)['"]/g;
    let m;
    while ((m = reNamed.exec(txt))) {
      if (m[1]) specs.add(m[1]);
    }
    while ((m = reStar.exec(txt))) {
      if (m[1]) specs.add(m[1]);
    }
    return Array.from(specs);
  };

  // Chase up to two levels to find overlay declaration and programmatic param
  const chaseOverlay = async (baseFile, startTxt, maxDepth = 2) => {
    let overlayOk = hasOverlayDecl(startTxt);
    let overlayProg = hasProgrammaticParam(startTxt);
    if (overlayOk && overlayProg) return { overlayOk, overlayProg };

    const queue = [];
    const seen = new Set();

    const specs = extractReexportSpecs(startTxt);
    specs.forEach((s) => queue.push({ base: baseFile, spec: s, depth: 1 }));

    while (queue.length > 0) {
      const { base, spec, depth } = queue.shift();
      if (depth > maxDepth) continue;
      const key = `${base}::${spec}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const targets = await resolveTargets(base, spec);
      for (const t of targets) {
        const txt = t.txt;
        overlayOk = overlayOk || hasOverlayDecl(txt);
        overlayProg = overlayProg || hasProgrammaticParam(txt);
        if (overlayOk && overlayProg) {
          return { overlayOk, overlayProg };
        }
        // enqueue nested re-exports
        const nestedSpecs = extractReexportSpecs(txt);
        nestedSpecs.forEach((ns) =>
          queue.push({
            base: path.relative(DIST, t.path),
            spec: ns,
            depth: depth + 1,
          }),
        );
      }
    }
    return { overlayOk, overlayProg };
  };

  if (!overlayTxt) {
    issues.push({
      file: overlayCandidates.join(' | '),
      msg: 'missing (build before verify-types)',
    });
  } else {
    // Direct check, then chase re-exports (named or star) up to two levels.
    const directOk = hasOverlayDecl(overlayTxt);
    const directProg = hasProgrammaticParam(overlayTxt);
    const chased =
      !directOk || !directProg
        ? await chaseOverlay(
            overlayFound || overlayCandidates[0],
            overlayTxt,
            2,
          )
        : { overlayOk: directOk, overlayProg: directProg };
    const overlayOk = directOk || chased.overlayOk;
    const overlayProg = directProg || chased.overlayProg;

    if (!overlayOk) {
      issues.push({
        file: overlayFound || 'env-overlay.d.ts',
        msg: 'overlayEnv declaration not found in env overlay types (including chased re-exports)',
      });
    }
    if (!overlayProg) {
      issues.push({
        file: overlayFound || 'env-overlay.d.ts',
        msg: 'programmaticVars parameter not detected in overlayEnv types (including chased re-exports)',
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
