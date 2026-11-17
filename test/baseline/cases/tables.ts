/**
 * Spec tables corpus: every row of the 4.4 and Decision 28 examples tables, in
 * the form 7.0.11 can run.
 *
 * Qualified options don't exist in 7.0.11, so each row records:
 * - the **normalized** column, when it parses (it is plain syntax), with any
 *   terminator removed (terminators don't exist in 7.0.11);
 * - for rows whose 8.0 outcome is an error, the **typed** column with every
 *   qualified option written as its plain form at the same position.
 *
 * Child commands are replaced by the probe: `echo hi` → `node probe.mjs hi`,
 * `npm test` → `node probe.mjs test`, `grep -e x` → `node probe.mjs -e x`,
 * `X` → `node probe.mjs`, and `smoz` run by `cmd` → `node probe.mjs`. The AWS
 * CLI is stubbed (`awsStub.ts`).
 */
import type { CaseSource, CliCase } from '../types';

const P = ['node', 'probe.mjs'];

const vc = (
  row: number,
  table: '4.4' | 'D28',
  args: string[],
  note?: string,
): CliCase => ({
  kind: 'cli',
  group: 'vc',
  host: 'vc',
  id: `${table === '4.4' ? '4.4' : 'D28'} row ${String(row).padStart(2, '0')}`,
  source: `${table} row ${String(row)}` as CaseSource,
  args,
  ...(note ? { note } : {}),
});

/** The 4.4 and Decision 28 table rows. */
export const tablesCorpus: CliCase[] = [
  vc(1, '4.4', ['--env=bali', 'smoz', 'openapi', '--verbose']),
  vc(
    2,
    '4.4',
    ['--env', 'bali', 'smoz', 'openapi', '--verbose'],
    'nr openapi script; same normalized form as row 1, recorded with --env <value>',
  ),
  vc(3, '4.4', ['--env=bali', 'aws', '--profile=foo', 'secrets', 'pull']),
  vc(4, '4.4', ['--env=bali', 'aws', 'secrets', 'pull', '-e', 'FOO']),
  vc(5, '4.4', ['--debug', 'aws', 's3', 'ls', '--debug']),
  vc(6, '4.4', ['--env=bali', 'cmd', ...P, 'test', '--', '--watch']),
  vc(7, '4.4', ['--env=bali', 'cmd', ...P, 'hi']),
  vc(8, '4.4', ['--env=bali', 'cmd', '--', ...P, 'test']),
  vc(9, '4.4', ['node', '-h'], 'typed form (8.0 writes cmd in)'),
  vc(10, '4.4', ['batch', '-l', ...P]),
  vc(11, '4.4', ['--env=bali', '-h']),
  vc(12, '4.4', ['--bogus', '-h'], 'typed form (8.0 writes cmd in)'),
  vc(
    13,
    '4.4',
    ['cmd', ...P, 'hi'],
    'normalized form (typed terminator dropped)',
  ),
  vc(
    14,
    '4.4',
    ['--trace', 'A', 'aws', '--profile', 'x'],
    'fails in 8.0; plain form at the typed position',
  ),
  vc(
    15,
    '4.4',
    ['-e', '--debug', 'aws'],
    'fails in 8.0; plain form at the typed position',
  ),
  {
    kind: 'cli',
    group: 'getdotenv',
    host: 'getdotenv',
    id: '4.4 row 16',
    source: '4.4 row 16',
    args: ['init', 'x', '--cli-name', '--debug', 'y'],
    note: 'fails in 8.0; plain form at the typed position',
    listFiles: true,
  },
  vc(
    17,
    '4.4',
    ['--debug', 'aws', 'secrets', 'pull', 'foo', '-e', 'A', 'B'],
    'normalized form without the terminator',
  ),
  vc(
    18,
    '4.4',
    ['aws', '--no-login-on-demand', '--login-on-demand'],
    'fails in 8.0; plain form at the typed position',
  ),
  vc(19, '4.4', ['--env=y', 'cmd', ...P, '-e', 'x']),
  vc(20, '4.4', ['--debug=x'], 'fails in 8.0; plain form'),
  vc(
    21,
    '4.4',
    ['--cmd', ...P, 'test'],
    'fails in 8.0 (qualified --vc-cmd); plain form',
  ),
  vc(22, '4.4', ['--env=dev', 'aws']),
  vc(23, '4.4', ['--redact-pattern=a', '--redact-pattern=b', 'aws']),
  vc(24, '4.4', ['cmd', ...P, 'openapi', '--smoz-env', 'bali']),
  vc(
    1,
    'D28',
    ['--trace', 'smoz', 'openapi', '--verbose'],
    'normalized form without the terminator',
  ),
  vc(
    2,
    'D28',
    ['--shell', 'cmd', ...P, 'hi'],
    'normalized form without the terminator',
  ),
  vc(
    3,
    'D28',
    ['aws', 's3', 'ls'],
    'aws has no optional option in 7.0.11; recorded without it',
  ),
  vc(4, 'D28', ['--trace', '--debug', 'cmd', ...P, 'hi']),
  vc(5, 'D28', ['--trace=API_URL', 'cmd', ...P, 'hi']),
  vc(
    6,
    'D28',
    ['--debug', '--shell', 'cmd', ...P, 'hi'],
    'normalized form without the terminator',
  ),
];
