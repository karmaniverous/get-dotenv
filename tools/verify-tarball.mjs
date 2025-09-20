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
    console.error('verify-tarball: ERROR\n', err?.stderr ?? err);
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

  const filesArr = Array.isArray(list)
    ? list
    : Array.isArray(list?.files)
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
    console.error(
      'verify-tarball: FAILED\nMissing from npm pack --dry-run listing:\n- ' +
        missing.join('\n- '),
    );
    process.exit(1);
  }

  console.log('verify-tarball: OK');
};

main().catch((err) => {
  console.error('verify-tarball: ERROR\n', err?.stderr ?? err);
  process.exit(1);
});
