#!/usr/bin/env node
/**
 * Verify npm pack --dry-run includes expected runtime artifacts and templates.
 *
 * Checks a representative set of dist outputs and template files are present
 * in the tarball file listing. Fails with a clear message if any are missing.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
const execFileAsync = promisify(execFile);

const normalize = (p) => p.split(path.sep).join('/');
const expected = [
  // Core dist runtime entries (ESM/CJS + CLI)
  'dist/index.mjs',
  'dist/cliHost.mjs',
  'dist/plugins.mjs',
  'dist/plugins-aws.mjs',
  'dist/plugins-batch.mjs',
  'dist/plugins-init.mjs',
  'dist/plugins-cmd.mjs',
  'dist/plugins-demo.mjs',
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

const tryNpmPackJson = async () => {
  const { stdout } = await execFileAsync('npm', [
    'pack',
    '--json',
    '--dry-run',
  ]);
  return JSON.parse(stdout);
};

const logNpmFailure = async (err) => {
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
};

const tryPacklist = async () => {
  let packlist;
  try {
    const mod = await import('npm-packlist');
    packlist = mod.default ?? mod;
  } catch (e) {
    console.error(
      'verify-tarball: ERROR\nFallback to npm-packlist failed to load.',
    );
    console.error(
      'Tip: add "npm-packlist" as a devDependency or ensure npm is on PATH.',
    );
    throw e;
  }
  // npm-packlist@10 expects the parsed package.json passed explicitly in some paths.
  // Read and parse package.json from cwd; provide a clear error when unavailable.
  let pkg;
  try {
    const pkgTxt = await fs.readFile(
      path.join(process.cwd(), 'package.json'),
      'utf-8',
    );
    pkg = JSON.parse(pkgTxt);
  } catch (e) {
    console.error(
      'verify-tarball: ERROR\nUnable to read package.json from current working directory.',
    );
    console.error('cwd:', process.cwd());
    console.error(String(e));
    throw e;
  }
  const files = await packlist({ path: process.cwd(), package: pkg });
  return files.map((p) => normalize(p));
};

// Files-field fallback: enumerate from package.json "files" entries
// Recursively walks listed files/dirs and returns a normalized list.
const tryFilesFromPackageFiles = async () => {
  let pkg;
  const cwd = process.cwd();
  const isNoise = (name) =>
    name === 'node_modules' ||
    name === '.git' ||
    name === '.tsbuild' ||
    name === '.rollup.cache' ||
    name === '.DS_Store';
  const relNormalize = (abs) => normalize(path.relative(cwd, abs));

  try {
    const txt = await fs.readFile(path.join(cwd, 'package.json'), 'utf-8');
    pkg = JSON.parse(txt);
  } catch (e) {
    console.error(
      'verify-tarball: ERROR\nUnable to load package.json for files-field fallback.',
    );
    console.error(String(e));
    throw e;
  }
  const filesField = Array.isArray(pkg?.files) ? pkg.files : [];
  if (filesField.length === 0) {
    throw new Error(
      'files-field fallback unavailable: package.json has no "files" array',
    );
  }
  const out = new Set();
  const walk = async (abs) => {
    try {
      const stat = await fs.stat(abs);
      if (stat.isDirectory()) {
        const entries = await fs.readdir(abs, { withFileTypes: true });
        for (const e of entries) {
          if (isNoise(e.name)) continue;
          await walk(path.join(abs, e.name));
        }
      } else if (stat.isFile()) {
        out.add(relNormalize(abs));
      }
    } catch {
      /* ignore missing paths */
    }
  };
  await Promise.all(filesField.map((p) => walk(path.join(cwd, p))));
  return Array.from(out);
};

const main = async () => {
  let used = 'npm';
  let names;
  try {
    // Primary: npm pack --json --dry-run
    const list = await tryNpmPackJson();
    // Normalize to a flat array of file entries (supports various npm JSON shapes).
    const filesArr = Array.isArray(list)
      ? list.flatMap((e) => (e && Array.isArray(e.files) ? e.files : []))
      : list && Array.isArray(list.files)
        ? list.files
        : [];
    names = new Set(
      filesArr
        .map((e) => pickPath(e))
        .filter(Boolean)
        .map((p) => normalize(p)),
    );
  } catch (err) {
    // Log npm failure details and prefer the files-field fallback next.
    await logNpmFailure(err);
    console.error(
      'verify-tarball: Falling back to package.json "files" entries…',
    );
    used = 'files-field';
    try {
      const files = await tryFilesFromPackageFiles();
      names = new Set(files.map((p) => normalize(p)));
    } catch (filesErr) {
      console.error(
        'verify-tarball: files-field fallback failed. Attempting npm-packlist…',
      );
      used = 'packlist';
      try {
        const files = await tryPacklist();
        names = new Set(files);
      } catch (packlistErr) {
        console.error(
          'verify-tarball: ERROR\nUnable to compute file list via files-field fallback.',
        );
        console.error('files-field error:', String(filesErr));
        console.error('npm-packlist error:', String(packlistErr));
        console.error('cwd:', process.cwd());
        console.error(
          'node:',
          `${process.version} (${process.platform}/${process.arch})`,
        );
        process.exit(1);
      }
    }
  }
  // At this point, `names` is a Set of normalized paths originating from:
  // - npm pack --json (preferred), or
  // - files-field fallback (package.json "files"), or
  // - npm-packlist fallback (simulated npm file inclusion).
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
    console.error(`source: ${used}`);
    console.error(`unique paths: ${names.size}`);
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
