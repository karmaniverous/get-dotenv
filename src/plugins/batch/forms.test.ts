/**
 * #59 / #65: every batch form runs one code path.
 *
 * - #59: `batch --command` and `batch --list` honour `--capture` and pass the
 *   merged options bag to the children, like positionals do.
 * - #65: `batch cmd` is not batch's default subcommand, so `batch -l X` runs
 *   batch's own action and lists directories (spec 4.11 row 26).
 */
import { describe, expect, it } from 'vitest';

import { runCase } from '@/test/baseline/harness';

const P = ['node', 'probe.mjs'];

const run = (id: string, args: string[]) =>
  runCase({
    kind: 'cli',
    group: 'getdotenv',
    host: 'getdotenv',
    id,
    source: '#59',
    args,
  });

describe('batch forms (#59, #65)', () => {
  it('batch --command passes the options bag, capture included (#59 repro)', async () => {
    const r = await run('#59 command bag', [
      '--capture',
      'batch',
      '-g',
      'pkgA',
      '--command',
      'node probe.mjs',
    ]);
    expect(r.children).toHaveLength(1);
    expect(r.children?.[0]?.getDotenvCliOptions).toMatchObject({
      capture: true,
    });
  });

  it('batch cmd and batch positionals pass the same bag', async () => {
    const viaCmd = await run('#59 cmd bag', [
      '--capture',
      'batch',
      '-g',
      'pkgA',
      'cmd',
      ...P,
    ]);
    const viaPositional = await run('#59 positional bag', [
      '--capture',
      'batch',
      '-g',
      'pkgA',
      ...P,
    ]);
    expect(viaCmd.children?.[0]?.getDotenvCliOptions).toEqual(
      viaPositional.children?.[0]?.getDotenvCliOptions,
    );
    expect(viaCmd.children?.[0]?.getDotenvCliOptions).toMatchObject({
      capture: true,
    });
  });

  it('batch -l X lists directories, with X as extra globs (#65 repro, 4.11 row 26)', async () => {
    const r = await run('#65 list', ['batch', '-g', 'pkgA', '-l', 'pkgB']);
    expect(r.children).toEqual([]);
    expect(r.stdout).toContain('Listing working directories');
    expect(r.stdout).toContain('GLOBS: pkgA pkgB');
    expect(r.stdout).toMatch(/CWD: +<TMP>\/pkgA/);
    expect(r.stdout).toMatch(/CWD: +<TMP>\/pkgB/);
  });

  it('batch cmd X runs X even with -l', async () => {
    const r = await run('#65 cmd with list', [
      'batch',
      '-g',
      'pkgA',
      '-l',
      'cmd',
      ...P,
    ]);
    expect(r.children?.map((c) => c.cwd)).toEqual(['pkgA']);
  });

  it('positionals beat --command', async () => {
    const r = await run('#65 positionals beat command', [
      'batch',
      '-g',
      'pkgA',
      '-c',
      'node probe.mjs other',
      ...P,
      'mine',
    ]);
    expect(r.children?.map((c) => c.argv)).toEqual([['mine']]);
  });

  it('batch help no longer calls cmd the default subcommand', async () => {
    const r = await run('#65 help', ['batch', 'cmd', '-h']);
    expect(r.stdout).not.toContain('(default subcommand)');
  });
});
