#!/usr/bin/env node
/**
 * Verify npm pack --dry-run includes expected runtime artifacts and templates.
 *
 * Checks a representative set of dist outputs and template files are present
 * in the tarball file listing. Fails with a clear message if any are missing.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import process from 'node:process';
const execFileAsync = promisify(execFile);

const normalize = (p) => p.split(path.sep).join('/');
const expected = [
  // Core dist runtime entries (ESM/CJS + CLI)
  'dist/index.mjs',
  'dist/index.cjs',
  'dist/cliHost.mjs',
  'dist/plugins-aws.mjs',
  'dist/plugins-batch.mjs',
  'dist/plugins-init.mjs',
  'dist/config.mjs',
  'dist/env-overlay.mjs',
  'dist/getdotenv.cli.mjs',
  // Templates: config (public/local across formats) and CLI skeleton
  'templates/config/json/public/getdotenv.config.json',
  'templates/config/json/local/getdotenv.config.local.json',
  'templates/config/yaml/public/getdotenv.config.yaml',
  'templates/config/yaml/local/getdotenv.config.local.yaml',
  'templates/config/js/getdotenv.config.js',
  'templates/config/ts/getdotenv.config.ts',
  'templates/cli/ts/index.ts',
  'templates/cli/ts/plugins/hello.ts',
];

const pickPath = (entry) => {
  if (!entry) return undefined;
  // npm pack --json can return an array of {path,...} or {filename,...} or strings (older).
  if (typeof entry === 'string') return entry;
  return entry.path ?? entry.filename ?? entry.name ?? undefined;
};

const main = async () => {
  let out;
  try {
    const { stdout } = await execFileAsync('npm', [
      'pack',
      '--json',
      '--dry-run',
    ]);
    out = stdout;
  } catch (err) {
    // Rich diagnostics when the npm pack invocation itself fails.
    const code = err && typeof err.code !== 'undefined' ? String(err.code) : '';
    const signal =
      err && typeof err.signal !== 'undefined' ? String(err.signal) : '';
    const msg = err && err.message ? String(err.message) : '';
    const stderr = err && typeof err.stderr === 'string' ? err.stderr : '';
    const stdout = err && typeof err.stdout === 'string' ? err.stdout : '';
    console.error(
      'verify-tarball: ERROR while running "npm pack --json --dry-run"',
    );
    console.error(`cwd: ${process.cwd()}`);
    console.error(
      `node: ${process.version} (${process.platform}/${process.arch})`,
    );
    try {
      const { stdout: npmv } = await execFileAsync('npm', ['--version']);
      console.error(`npm: ${npmv.trim()}`);
    } catch {
      console.error('npm: <unavailable>');
    }
    if (code || signal) console.error(`code: ${code} signal: ${signal}`);
    if (msg) console.error(`message: ${msg}`);
    if (stderr && stderr.trim()) console.error('[stderr]\n' + stderr.trim());
    if (stdout && stdout.trim()) console.error('[stdout]\n' + stdout.trim());
    // Best-effort fallback sample without --json to help diagnose older npm shapes.
    try {
      const { stdout: fallback } = await execFileAsync('npm', [
        'pack',
        '--dry-run',
      ]);
      const head = fallback.split(/\r?\n/).slice(0, 80).join('\n');
      console.error('[fallback npm pack --dry-run output (head)]\n' + head);
    } catch {
      /* ignore */
    }
    process.exit(1);
  }
  let list;
  try {
    list = JSON.parse(out);
  } catch {
    console.error(
      'verify-tarball: ERROR\nUnable to parse npm pack --json output',
    );
    process.exit(1);
  }

  // npm pack --json commonly returns an array of objects, each with a `files` array.
  // Older shapes may return a single object with a `files` array, or even a flat array.
  // Normalize to a flat array of file entries (plain JS, no TS casts).
  const filesArr = Array.isArray(list)
    ? list.flatMap((e) => (e && Array.isArray(e.files) ? e.files : []))
    : list && Array.isArray(list.files)
      ? list.files
      : [];

  const names = new Set(
    filesArr
      .map((e) => pickPath(e))
      .filter(Boolean)
      .map((p) => normalize(p)),
  );
  const missing = expected.filter((p) => !names.has(p));
  if (missing.length > 0) {
    // Emit detailed diagnostics to help pinpoint why entries are missing.
    const sampleFound = Array.from(names).slice(0, 40);
    console.error('verify-tarball: FAILED');
    console.error('cwd: ' + process.cwd());
    console.error(
      'node: ' + process.version + ` (${process.platform}/${process.arch})`,
    );
    try {
      const { stdout: npmv } = await execFileAsync('npm', ['--version']);
      console.error('npm: ' + npmv.trim());
    } catch {
      /* ignore */
    }
    console.error(
      `pack files: ${filesArr.length}  unique paths: ${names.size}`,
    );
    if (sampleFound.length > 0) {
      console.error('found (sample):\n- ' + sampleFound.join('\n- '));
    } else {
      console.error('found: <none>');
    }
    console.error(
      'missing (' + missing.length + '):\n- ' + missing.join('\n- '),
    );
    process.exit(1);
  }

  console.log('verify-tarball: OK');
};
main().catch((err) => {
  console.error('verify-tarball: ERROR\n', err?.stderr ?? err);
  process.exit(1);
});
