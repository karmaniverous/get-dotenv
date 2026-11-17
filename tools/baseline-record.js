// Record the 7.0.11 behaviour baseline for this platform.
//
// Runs the baseline corpus twice (vitest, BASELINE_RECORD_DIR), fails if the
// two runs differ (unstable normalization), then writes the result, formatted
// with Prettier, to test/baseline-7.0.11/<platform>/.
//
// Only for recording the baseline of untouched 7.0.11 code (dev plan S1) or a
// new platform. Never re-record to make the baseline test pass: list the
// change in test/baseline-7.0.11/departures.ts with its issue or decision.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import prettier from 'prettier';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scratch = path.join(root, '.tsbuild', 'baseline-record');
const target = path.join(root, 'test', 'baseline-7.0.11', process.platform);
const vitest = path.join(root, 'node_modules', 'vitest', 'vitest.mjs');

const record = (run) => {
  const dir = path.join(scratch, `run${String(run)}`);
  fs.rmSync(dir, { recursive: true, force: true });
  const r = spawnSync(
    process.execPath,
    [vitest, 'run', 'test/baseline/baseline.test.ts'],
    {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, BASELINE_RECORD_DIR: dir },
    },
  );
  if (r.status !== 0) {
    console.error(`baseline-record: run ${String(run)} failed`);
    process.exit(1);
  }
  return dir;
};

const first = record(1);
const second = record(2);

const files = fs.readdirSync(first).filter((f) => f.endsWith('.json'));
let unstable = false;
for (const f of files) {
  const a = JSON.parse(fs.readFileSync(path.join(first, f), 'utf8'));
  const b = JSON.parse(fs.readFileSync(path.join(second, f), 'utf8'));
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (JSON.stringify(a[id]) !== JSON.stringify(b[id])) {
      console.error(`baseline-record: unstable case '${id}' (${f})`);
      unstable = true;
    }
  }
}
if (unstable) process.exit(1);

fs.mkdirSync(target, { recursive: true });
for (const f of files) {
  const text = fs.readFileSync(path.join(first, f), 'utf8');
  const formatted = await prettier.format(text, { parser: 'json' });
  fs.writeFileSync(path.join(target, f), formatted);
}
console.log(
  `baseline-record: two runs matched; wrote ${files.join(', ')} to ${path.relative(root, target)}`,
);
