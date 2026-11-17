// Child-process probe for the 7.0.11 behaviour baseline.
//
// The corpus runs `node probe.mjs <args>` wherever a case needs a child
// command. The probe appends one JSON line (argv, cwd, full env) to
// `$BASELINE_PROBE_DIR/probe.jsonl`; the harness redacts the env (keys kept,
// values hashed) before anything is stored. It then prints its arguments.
//
// Flags (anywhere in argv):
//   --stderr <text>  also write <text> to stderr
//   --exit <code>    exit with <code>
//   --print <K1,K2>  also print the values of these env keys (test keys only,
//                    never secrets) as JSON
import { appendFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const dir = process.env.BASELINE_PROBE_DIR;
if (dir) {
  appendFileSync(
    join(dir, 'probe.jsonl'),
    JSON.stringify({ argv: args, cwd: process.cwd(), env: process.env }) + '\n',
  );
}

const valueOf = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};

process.stdout.write(`probe: ${JSON.stringify(args)}\n`);
const print = valueOf('--print');
if (print !== undefined) {
  const picked = {};
  for (const key of print.split(','))
    picked[key] = process.env[key] === undefined ? null : process.env[key];
  process.stdout.write(`probe env: ${JSON.stringify(picked)}\n`);
}
const err = valueOf('--stderr');
if (err !== undefined) process.stderr.write(`${err}\n`);
const code = valueOf('--exit');
if (code !== undefined) process.exitCode = Number(code);
