/**
 * The full qualified-name table of the S1 `vc` fixture host (4.3): the root,
 * `cmd` at the root and under `aws`, `aws secrets pull`, `cli.ns()` leaves, a
 * `--x`/`--no-x` pair, an `[optional]` option, plain `new Command()` mounts
 * (`batch cmd`, `smoz legacy`) and dynamic options (aws, batch). Terminators
 * never appear in help.
 */
import type { CommandUnknownOpts } from '@commander-js/extra-typings';
import { describe, expect, it, vi } from 'vitest';

import { createVcHost } from '@/test/baseline/hosts';
import { inFixture } from '@/test/support/fixtureCli';

import { DYN_DESC } from '../dynamicOptions';
import type { GetDotenvCli } from '../GetDotenvCli';
import { type QualifiedNameTable, qualifiedNameTableOf } from './table';

/** Expected entries, in build order: qualified name, owner, declared flags. */
const EXPECTED: Array<[string, string, string]> = [
  ['--vc-q1r1s', 'vc', 'terminator'],
  ['--vc-env', 'vc', '-e, --env <string>'],
  ['--vc-vars', 'vc', '-v, --vars <string>'],
  ['--vc-output-path', 'vc', '-o, --output-path <string>'],
  ['--vc-shell', 'vc', '-s, --shell [string]'],
  ['--vc-shell-off', 'vc', '-S, --shell-off'],
  ['--vc-load-process', 'vc', '-p, --load-process'],
  ['--vc-load-process-off', 'vc', '-P, --load-process-off'],
  ['--vc-exclude-all', 'vc', '-a, --exclude-all'],
  ['--vc-exclude-all-off', 'vc', '-A, --exclude-all-off'],
  ['--vc-exclude-dynamic', 'vc', '-z, --exclude-dynamic'],
  ['--vc-exclude-dynamic-off', 'vc', '-Z, --exclude-dynamic-off'],
  ['--vc-exclude-env', 'vc', '-n, --exclude-env'],
  ['--vc-exclude-env-off', 'vc', '-N, --exclude-env-off'],
  ['--vc-exclude-global', 'vc', '-g, --exclude-global'],
  ['--vc-exclude-global-off', 'vc', '-G, --exclude-global-off'],
  ['--vc-exclude-private', 'vc', '-r, --exclude-private'],
  ['--vc-exclude-private-off', 'vc', '-R, --exclude-private-off'],
  ['--vc-exclude-public', 'vc', '-u, --exclude-public'],
  ['--vc-exclude-public-off', 'vc', '-U, --exclude-public-off'],
  ['--vc-log', 'vc', '-l, --log'],
  ['--vc-log-off', 'vc', '-L, --log-off'],
  ['--vc-debug', 'vc', '--debug'],
  ['--vc-debug-off', 'vc', '--debug-off'],
  ['--vc-capture', 'vc', '--capture'],
  ['--vc-default-env', 'vc', '--default-env <string>'],
  ['--vc-default-env-key', 'vc', '--default-env-key <string>'],
  ['--vc-dotenv-token', 'vc', '--dotenv-token <string>'],
  ['--vc-dynamic-path', 'vc', '--dynamic-path <string>'],
  ['--vc-paths', 'vc', '--paths <string>'],
  ['--vc-paths-delimiter', 'vc', '--paths-delimiter <string>'],
  ['--vc-paths-delimiter-pattern', 'vc', '--paths-delimiter-pattern <string>'],
  ['--vc-private-token', 'vc', '--private-token <string>'],
  ['--vc-vars-delimiter', 'vc', '--vars-delimiter <string>'],
  ['--vc-vars-delimiter-pattern', 'vc', '--vars-delimiter-pattern <string>'],
  ['--vc-vars-assignor', 'vc', '--vars-assignor <string>'],
  ['--vc-vars-assignor-pattern', 'vc', '--vars-assignor-pattern <string>'],
  ['--vc-trace', 'vc', '--trace [keys...]'],
  ['--vc-strict', 'vc', '--strict'],
  ['--vc-entropy-warn', 'vc', '--entropy-warn'],
  ['--vc-entropy-warn-off', 'vc', '--entropy-warn-off'],
  ['--vc-entropy-threshold', 'vc', '--entropy-threshold <number>'],
  ['--vc-entropy-min-length', 'vc', '--entropy-min-length <number>'],
  ['--vc-entropy-whitelist', 'vc', '--entropy-whitelist <pattern...>'],
  ['--vc-redact-pattern', 'vc', '--redact-pattern <pattern...>'],
  ['--vc-redact', 'vc', '--redact'],
  ['--vc-redact-off', 'vc', '--redact-off'],
  ['--vc-cmd', 'vc', '-c, --cmd <command...>'],
  ['--vc-version', 'vc', '-V, --version'],
  ['--vc-k99ix', 'vc cmd', 'terminator'],
  ['--vc-a7lhd', 'vc batch', 'terminator'],
  ['--vc-batch-pkg-cwd', 'vc batch', '-p, --pkg-cwd'],
  ['--vc-batch-root-path', 'vc batch', '-r, --root-path <string>'],
  ['--vc-batch-globs', 'vc batch', '-g, --globs <string>'],
  ['--vc-batch-command', 'vc batch', '-c, --command <string>'],
  ['--vc-batch-list', 'vc batch', '-l, --list'],
  ['--vc-batch-ignore-errors', 'vc batch', '-e, --ignore-errors'],
  ['--vc-batch-parallel', 'vc batch', '-P, --parallel'],
  ['--vc-batch-concurrency', 'vc batch', '-C, --concurrency <n>'],
  ['--vc-vlbj4', 'vc batch cmd', 'terminator'],
  ['--vc-c1ryg', 'vc aws', 'terminator'],
  ['--vc-aws-login-on-demand', 'vc aws', '--login-on-demand'],
  ['--vc-aws-no-login-on-demand', 'vc aws', '--no-login-on-demand'],
  ['--vc-aws-profile', 'vc aws', '--profile <string>'],
  ['--vc-aws-region', 'vc aws', '--region <string>'],
  ['--vc-aws-default-region', 'vc aws', '--default-region <string>'],
  ['--vc-aws-strategy', 'vc aws', '--strategy <string>'],
  ['--vc-aws-profile-key', 'vc aws', '--profile-key <string>'],
  [
    '--vc-aws-profile-fallback-key',
    'vc aws',
    '--profile-fallback-key <string>',
  ],
  ['--vc-aws-region-key', 'vc aws', '--region-key <string>'],
  ['--vc-aws-cmd', 'vc aws', '-c, --cmd <command...>'],
  ['--vc-l97tr', 'vc aws cmd', 'terminator'],
  ['--vc-hw9bu', 'vc aws secrets', 'terminator'],
  ['--vc-f3jrb', 'vc aws secrets pull', 'terminator'],
  [
    '--vc-aws-secrets-pull-secret-name',
    'vc aws secrets pull',
    '-s, --secret-name <string>',
  ],
  [
    '--vc-aws-secrets-pull-exclude',
    'vc aws secrets pull',
    '-e, --exclude <keys...>',
  ],
  ['--vc-ruum4', 'vc smoz', 'terminator'],
  ['--vc-smoz-x', 'vc smoz', '--x'],
  ['--vc-smoz-no-x', 'vc smoz', '--no-x'],
  ['--vc-smoz-opt', 'vc smoz', '--opt [value]'],
  ['--vc-xk2cb', 'vc smoz openapi', 'terminator'],
  ['--vc-smoz-openapi-verbose', 'vc smoz openapi', '--verbose'],
  ['--vc-wn5ht', 'vc smoz legacy', 'terminator'],
  ['--vc-smoz-legacy-level', 'vc smoz legacy', '--level <n>'],
  ['--vc-excic', 'vc smoz legacy run', 'terminator'],
  ['--vc-smoz-legacy-run-fast', 'vc smoz legacy run', '--fast'],
];

/** Run the vc fixture host once and return its root and table. */
const buildVc = () =>
  inFixture({}, async () => {
    let program: GetDotenvCli | undefined;
    const run = createVcHost((p) => {
      program = p;
    });
    const out = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    try {
      await run(['smoz', 'openapi']);
    } finally {
      out.mockRestore();
    }
    if (!program) throw new Error('compose did not run');
    const table = qualifiedNameTableOf(program) as QualifiedNameTable;
    return { program, table };
  });

const walk = (cmd: CommandUnknownOpts): CommandUnknownOpts[] => [
  cmd,
  ...cmd.commands.flatMap((c) => walk(c)),
];

describe('vc fixture qualified-name table', () => {
  it('holds exactly the expected entries', async () => {
    const { table } = await buildVc();
    expect(table.alias).toBe('vc');
    const actual = [...table.entries.values()].map((e) => [
      e.name,
      ['vc', ...e.path].join(' '),
      e.kind === 'terminator' ? 'terminator' : e.option.flags,
    ]);
    expect(actual).toEqual(EXPECTED);
    expect(table.entries.size).toBe(86);
  });

  it('includes dynamic options registered during plugin setup', async () => {
    const { table } = await buildVc();
    for (const name of ['--vc-aws-profile', '--vc-batch-root-path']) {
      const option = table.entries.get(name)?.option;
      expect(option && DYN_DESC.has(option)).toBe(true);
    }
  });

  it('keeps terminators out of every help output', async () => {
    const { program, table } = await buildVc();
    const names = [...table.terminators.values()];
    for (const cmd of walk(program)) {
      const help = cmd.helpInformation();
      for (const n of names) expect(help).not.toContain(n);
    }
    const aws = program.commands.find((c) => c.name() === 'aws');
    const awsHelp = aws?.helpInformation() ?? '';
    expect(awsHelp).toMatch(/\n {2}cmd \[command\.\.\.\] /);
    expect(awsHelp).toMatch(/\n {2}secrets {2,}Fixture/);
    expect(program.helpInformation()).toMatch(/\n {2}cmd \[command\.\.\.\] /);
  });
});
