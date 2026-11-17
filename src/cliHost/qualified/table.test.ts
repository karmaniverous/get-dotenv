/**
 * The qualified-name table (spec 4.2, 4.3; Decisions 17, 20, 24, 28): naming,
 * the build-time errors, terminator registration and `opts()`.
 */
import { Command, Option } from '@commander-js/extra-typings';
import { describe, expect, it } from 'vitest';

import { batchPlugin } from '@/src/plugins/batch';
import { runFixtureCli } from '@/test/support/fixtureCli';

import { definePlugin } from '../definePlugin';
import { GetDotenvCli } from '../GetDotenvCli';
import { qualifiableLong, qualifiedName } from './names';
import {
  createTerminator,
  isTerminatorOption,
  registerTerminator,
} from './register';
import { buildQualifiedNameTable, qualifiedNameTableOf } from './table';
import { terminatorName } from './terminator';

/** A plugin at `ns` whose setup declares the given long options. */
const optionsPlugin = (ns: string, ...flags: string[]) =>
  definePlugin({
    ns,
    setup(cli) {
      for (const f of flags) cli.option(f);
    },
  });

/** Terminator options registered on `cmd`. */
const terminatorsOf = (cmd: { options: readonly Option[] } | undefined) =>
  (cmd?.options ?? []).filter((o) => isTerminatorOption(o)).map((o) => o.long);

const parse = (cli: GetDotenvCli, ...args: string[]) =>
  cli.parseAsync(['node', 'vc', ...args]);

describe('qualified names (4.2)', () => {
  it('prefixes alias and path; a negated option keeps no- after them', () => {
    expect(qualifiedName('vc', [], '--env')).toBe('--vc-env');
    expect(qualifiedName('vc', ['aws'], '--no-login-on-demand')).toBe(
      '--vc-aws-no-login-on-demand',
    );
    expect(
      qualifiedName('vc', ['aws', 'secrets', 'pull'], '--secret-name'),
    ).toBe('--vc-aws-secrets-pull-secret-name');
  });

  it('qualifies every long option but --help; short-only options have none', () => {
    expect(qualifiableLong(new Option('-h, --help'))).toBeUndefined();
    expect(qualifiableLong(new Option('-x'))).toBeUndefined();
    expect(qualifiableLong(new Option('-V, --version'))).toBe('--version');
  });

  it('a built table has no entry for a short-only option', () => {
    const cli = new Command('vc');
    cli.option('-x').option('--long-one');
    const table = buildQualifiedNameTable(cli);
    const names = [...table.entries.values()]
      .filter((e) => e.kind === 'option')
      .map((e) => e.name);
    expect(names).toEqual(['--vc-long-one']);
  });

  it('two terminators on one command both stay out of opts()', () => {
    const cmd = new Command('vc');
    cmd.option('--keep');
    registerTerminator(cmd, createTerminator('--vc-aaaaa'));
    registerTerminator(cmd, createTerminator('--vc-bbbbb'));
    cmd.parse(['--keep', '--vc-aaaaa', '--vc-bbbbb'], { from: 'user' });
    expect(cmd.opts()).toEqual({ keep: true });
  });
});

describe('table build errors (4.3, Decision 24)', () => {
  it('throws on a collision, naming both owners', async () => {
    const cli = new GetDotenvCli('vc')
      .use(optionsPlugin('aws', '--foo-bar'))
      .use(optionsPlugin('aws-foo', '--bar'));
    await expect(parse(cli)).rejects.toThrow(
      "Qualified option name collision: '--vc-aws-foo-bar' is claimed by --foo-bar on 'vc aws' and by --bar on 'vc aws-foo'. Rename one of the options.",
    );
  });

  it('reserves terminators: an option qualifying to one collides', async () => {
    const cli = new GetDotenvCli('vc');
    cli.option('--q1r1s');
    await expect(parse(cli)).rejects.toThrow(
      "Qualified option name collision: '--vc-q1r1s' is claimed by the terminator of 'vc' and by --q1r1s on 'vc'. Rename one of the options.",
    );
  });

  it('rejects a plain root option with the <alias>- prefix', async () => {
    const cli = new GetDotenvCli('vc');
    cli.option('--vc-foo');
    await expect(parse(cli)).rejects.toThrow(
      "Option '--vc-foo' on 'vc' starts with '--vc-', a prefix reserved for vc's qualified options. Rename the option.",
    );
    // Every check runs before any terminator is registered.
    expect(terminatorsOf(cli)).toEqual([]);
  });

  it('rejects a plain subcommand option with the <alias>- prefix', async () => {
    const cli = new GetDotenvCli('vc').use(optionsPlugin('aws', '--vc-bar'));
    await expect(parse(cli)).rejects.toThrow(
      "Option '--vc-bar' on 'vc aws' starts with '--vc-', a prefix reserved for vc's qualified options. Rename the option.",
    );
  });

  it('allows a prefix that only starts with the alias', async () => {
    const cli = new GetDotenvCli('vc');
    cli.option('--vcx');
    await expect(parse(cli)).resolves.toBe(cli);
  });
});

describe('terminators (Decision 28)', () => {
  it('registers one hidden terminator per command, plain mounts included', async () => {
    const cli = new GetDotenvCli('vc').use(
      definePlugin({
        ns: 'smoz',
        setup(c) {
          c.addCommand(new Command('legacy').option('--level <n>'));
        },
      }),
    );
    await parse(cli);
    const smoz = cli.commands[0];
    const legacy = smoz?.commands[0];
    expect(terminatorsOf(cli)).toEqual(['--vc-q1r1s']);
    expect(terminatorsOf(smoz)).toEqual([terminatorName('vc', ['smoz'])]);
    expect(terminatorsOf(legacy)).toEqual([
      terminatorName('vc', ['smoz', 'legacy']),
    ]);
    const table = qualifiedNameTableOf(cli);
    expect(legacy && table?.terminators.get(legacy)).toBe(
      terminatorName('vc', ['smoz', 'legacy']),
    );
    expect(table?.entries.get('--vc-smoz-legacy-level')?.command).toBe(legacy);
    for (const o of cli.options.filter((x) => isTerminatorOption(x)))
      expect(o.hidden).toBe(true);
  });

  it('builds once: a second parseAsync reuses the table and registers nothing', async () => {
    const cli = new GetDotenvCli('vc').use(optionsPlugin('aws', '--profile'));
    await parse(cli);
    const table = qualifiedNameTableOf(cli);
    expect(table).toBeDefined();
    await parse(cli, 'aws');
    expect(qualifiedNameTableOf(cli)).toBe(table);
    expect(terminatorsOf(cli)).toEqual(['--vc-q1r1s']);
  });

  it('a rebuilt table reuses the registered terminators', () => {
    const cli = new GetDotenvCli('vc');
    cli.addCommand(new Command('legacy').option('--level <n>'));
    const first = buildQualifiedNameTable(cli);
    const second = buildQualifiedNameTable(cli);
    expect(terminatorsOf(cli)).toEqual(['--vc-q1r1s']);
    expect(terminatorsOf(cli.commands[0])).toHaveLength(1);
    expect(second.entries.get('--vc-q1r1s')?.option).toBe(
      first.entries.get('--vc-q1r1s')?.option,
    );
    // A terminator is never qualified (no '--vc-vc-q1r1s').
    expect(second.entries.has('--vc-vc-q1r1s')).toBe(false);
  });

  it("names terminators from the root's name when the table is built", async () => {
    const cli = new GetDotenvCli('getdotenv');
    cli.option('--debug');
    await cli.brand({ name: 'vc' });
    await parse(cli);
    expect(terminatorsOf(cli)).toEqual(['--vc-q1r1s']);
    const table = qualifiedNameTableOf(cli);
    expect(table?.alias).toBe('vc');
    expect(table?.entries.has('--vc-debug')).toBe(true);
    expect(table?.entries.has('--getdotenv-debug')).toBe(false);
  });

  it('never shows in opts(), on a GetDotenvCli or a plain new Command()', async () => {
    const run = new Command('run').option('--fast').action(() => undefined);
    const cli = new GetDotenvCli('vc');
    cli.addCommand(run);
    await parse(cli, '--vc-q1r1s', 'run', '--fast', '--vc-bilpd');
    expect(terminatorName('vc', ['run'])).toBe('--vc-bilpd');
    expect(cli.opts()).not.toHaveProperty('vcQ1r1s');
    expect(cli.getOptionValue('vcQ1r1s')).toBeUndefined();
    expect(run.opts()).toEqual({ fast: true });
    expect(run.getOptionValue('vcBilpd')).toBeUndefined();
    expect(run.optsWithGlobals()).toEqual({ fast: true });
  });

  it('never shows in opts() of batch cmd', async () => {
    const cli = new GetDotenvCli('vc').use(batchPlugin());
    await parse(cli);
    const batchCmd = cli.commands
      .find((c) => c.name() === 'batch')
      ?.commands.find((c) => c.name() === 'cmd');
    expect(batchCmd?.constructor).toBe(Command);
    const key = new Option(
      terminatorName('vc', ['batch', 'cmd']),
    ).attributeName();
    batchCmd?.setOptionValue(key, true);
    expect(batchCmd?.opts()).not.toHaveProperty(key);
  });

  it('never reaches the options bag', async () => {
    const flag = terminatorName('fixture', []);
    const run = await runFixtureCli([flag, 'probe']);
    expect(run.error).toBeUndefined();
    expect(run.bag).toBeDefined();
    expect(run.bag).not.toHaveProperty(new Option(flag).attributeName());
  });
});
