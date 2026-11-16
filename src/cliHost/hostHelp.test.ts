/**
 * Host help (spec 4.6, Decision 27), rendered through the runners of the S1
 * `vc` fixture host and the shipped `getdotenv` CLI.
 *
 * The file snapshots (`__snapshots__/help/`) pin the whole text of each help
 * path; the rule tests below pin each rule on its own lines.
 */
import { Command, Option } from '@commander-js/extra-typings';
import { describe, expect, it } from 'vitest';

import { createCli, type CreateCliOptions } from '@/src/cli';
import {
  composeVcFixture,
  createGetdotenvHost,
  createVcHost,
} from '@/test/baseline/hosts';
import { HELP_CONFIG, helpText } from '@/test/support/helpText';

import { definePlugin } from './definePlugin';
import type { GetDotenvCli } from './GetDotenvCli';
import { terminatorName } from './qualified';

/** The vc fixture host with extra `createCli` options and composition. */
const vcWith =
  (
    options: Partial<CreateCliOptions> = {},
    extra: (p: GetDotenvCli) => GetDotenvCli = (p) => p,
  ) =>
  () =>
    createCli({
      importMetaUrl: import.meta.url,
      alias: 'vc',
      ...options,
      compose: (p) => extra(composeVcFixture(p)),
    });

const vc = (args: string[]) => helpText(createVcHost, args);
const getdotenv = (args: string[]) => helpText(createGetdotenvHost, args);

/** One rendered option line (the line holding `flags`), unwrapped. */
const lineOf = (help: string, flags: string): string | undefined => {
  const lines = help.split('\n');
  const i = lines.findIndex((l) => l.startsWith(`  ${flags} `));
  if (i < 0) return undefined;
  const rest = lines.slice(i + 1);
  const end = rest.findIndex((l) => !/^ {6,}\S/.test(l));
  const wrapped = rest.slice(0, end < 0 ? rest.length : end);
  return [lines[i] ?? '', ...wrapped].join(' ').replace(/\s+/g, ' ').trim();
};

/** The headings of a help text's sections. */
const headings = (help: string): string[] =>
  help.split('\n').filter((l) => /^\S.*:$/.test(l));

const SNAPSHOTS: Array<[string, () => Promise<string>]> = [
  ['vc root', () => vc(['-h'])],
  ['vc aws', () => vc(['aws', '-h'])],
  ['vc aws secrets pull', () => vc(['aws', 'secrets', 'pull', '-h'])],
  ['vc batch cmd', () => vc(['batch', 'cmd', '-h'])],
  ['vc smoz openapi', () => vc(['smoz', 'openapi', '-h'])],
  ['getdotenv root', () => getdotenv(['-h'])],
  ['getdotenv aws', () => getdotenv(['aws', '-h'])],
  ['getdotenv aws whoami', () => getdotenv(['aws', 'whoami', '-h'])],
  ['getdotenv batch cmd', () => getdotenv(['batch', 'cmd', '-h'])],
];

describe('host help snapshots', () => {
  for (const [name, render] of SNAPSHOTS)
    it(name, async () => {
      await expect(await render()).toMatchFileSnapshot(
        `./__snapshots__/help/${name.replace(/ /g, '-')}.txt`,
      );
    });
});

describe('qualified-name annotation', () => {
  it('annotates every own option line with (anywhere: --name)', async () => {
    expect(lineOf(await vc(['-h']), '-e, --env <string>')).toBe(
      '-e, --env <string> target environment (dotenv-expanded) (anywhere: --vc-env)',
    );
    expect(lineOf(await vc(['aws', '-h']), '--profile <string>')).toBe(
      '--profile <string> AWS profile name (anywhere: --vc-aws-profile)',
    );
    expect(
      lineOf(
        await vc(['aws', 'secrets', 'pull', '-h']),
        '-s, --secret-name <string>',
      ),
    ).toBe(
      '-s, --secret-name <string> secret name (anywhere: --vc-aws-secrets-pull-secret-name)',
    );
    expect(lineOf(await getdotenv(['aws', '-h']), '--region <string>')).toBe(
      '--region <string> AWS region (anywhere: --getdotenv-aws-region)',
    );
  });

  it('survives dynamic descriptions (added at render time)', async () => {
    // --shell's description is rewritten from the resolved defaults.
    expect(lineOf(await vc(['-h']), '-s, --shell [string]')).toBe(
      '-s, --shell [string] command execution shell, no argument for default OS shell or provide shell string (default /bin/sh) (anywhere: --vc-shell)',
    );
    expect(
      lineOf(await getdotenv(['batch', '-h']), '-r, --root-path <string>'),
    ).toMatch(/ \(default: ".\/"\) \(anywhere: --getdotenv-batch-root-path\)$/);
  });

  it('leaves --help without a qualified name', async () => {
    for (const help of [
      await vc(['-h']),
      await vc(['aws', '-h']),
      await getdotenv(['batch', 'cmd', '-h']),
    ])
      expect(lineOf(help, '-h, --help')).toBe(
        '-h, --help display help for command',
      );
  });
});

describe('inherited option sections (Decision 27)', () => {
  it('lists each ancestor, root first, by qualified name', async () => {
    const help = await vc(['aws', 'secrets', 'pull', '-h']);
    expect(headings(help)).toEqual([
      'Options:',
      'vc options (anywhere):',
      'vc aws options (anywhere):',
    ]);
    expect(lineOf(help, '--vc-env <string>')).toBe(
      '--vc-env <string> target environment (dotenv-expanded)',
    );
    expect(lineOf(help, '--vc-aws-profile <string>')).toBe(
      '--vc-aws-profile <string> AWS profile name',
    );
    expect(lineOf(help, '--vc-cmd <command...>')).toBeDefined();
    expect(lineOf(help, '--vc-version')).toBeDefined();
    expect(help).not.toContain('--vc-help');
  });

  it('root help has no inherited section', async () => {
    expect(headings(await vc(['-h']))).toEqual([
      'Options:',
      'Plugin options — cmd:',
      'Commands:',
    ]);
    expect(headings(await getdotenv(['-h']))).toEqual([
      'Options:',
      'Plugin options — cmd:',
      'Commands:',
    ]);
  });

  it('a subcommand of the root lists the root', async () => {
    expect(headings(await getdotenv(['aws', '-h']))).toEqual([
      'Options:',
      'getdotenv options (anywhere):',
      'Commands:',
    ]);
  });
});

describe('option sections', () => {
  it('orders Options, App options, plugin groups by name, then other help groups', async () => {
    const host = vcWith({}, (p) => {
      p.tagAppOptions((root) => root.option('--app-flag', 'an app option'));
      for (const ns of ['zeta', 'alpha']) {
        const option = new Option(`--${ns}-flag`, `a ${ns} option`);
        p.addOption(option);
        p.setOptionGroup(option, `plugin:${ns}`);
      }
      p.addOption(
        new Option('--extra-flag', 'an extra option').helpGroup(
          'Extra options:',
        ),
      );
      return p;
    });
    const help = await helpText(host, ['-h']);
    expect(headings(help)).toEqual([
      'Options:',
      'App options:',
      'Plugin options — alpha:',
      'Plugin options — cmd:',
      'Plugin options — zeta:',
      'Extra options:',
      'Commands:',
    ]);
    expect(lineOf(help, '--app-flag')).toBe(
      '--app-flag an app option (anywhere: --vc-app-flag)',
    );
  });
});

describe('help settings on every command', () => {
  it('plain new Command() mounts render host help (batch cmd, smoz legacy run)', async () => {
    const batchCmd = await vc(['batch', 'cmd', '-h']);
    expect(headings(batchCmd)).toEqual([
      'Options:',
      'vc options (anywhere):',
      'vc batch options (anywhere):',
    ]);
    const run = await vc(['smoz', 'legacy', 'run', '-h']);
    expect(lineOf(run, '--fast')).toBe(
      '--fast go fast (anywhere: --vc-smoz-legacy-run-fast)',
    );
    expect(lineOf(run, '--vc-smoz-legacy-level <n>')).toBe(
      '--vc-smoz-legacy-level <n> level',
    );
    expect(headings(await getdotenv(['batch', 'cmd', '-h']))).toEqual([
      'Options:',
      'getdotenv options (anywhere):',
      'getdotenv batch options (anywhere):',
    ]);
  });
});

describe('root option visibility in every help path', () => {
  const hidden = vcWith({ rootOptionVisibility: { capture: false } });
  const paths = [
    ['-h'],
    ['aws', '-h'],
    ['aws', 'secrets', 'pull', '-h'],
    ['batch', 'cmd', '-h'],
    ['smoz', 'openapi', '-h'],
  ];

  it('a hidden root option appears in no help, own or inherited', async () => {
    for (const args of paths) {
      const help = await helpText(hidden, args);
      expect({ args, capture: help.includes('capture') }).toEqual({
        args,
        capture: false,
      });
    }
  });

  it('config visibility hides inherited entries too', async () => {
    const files = {
      'getdotenv.config.json': JSON.stringify({
        ...HELP_CONFIG,
        rootOptionVisibility: { trace: false },
      }),
    };
    for (const args of paths) {
      const help = await helpText(createVcHost, args, files);
      expect({ args, trace: help.includes('trace') }).toEqual({
        args,
        trace: false,
      });
    }
  });
});

/** A fixture plugin with hidden options, and a plain mount with only one. */
const hiddenFixturePlugin = () =>
  definePlugin({
    ns: 'hid',
    setup(cli) {
      cli
        .description('Fixture: hidden options')
        .addOption(new Option('--secret-flag', 'hidden flag').hideHelp())
        .option('--shown', 'shown flag');
      cli
        .ns('leaf')
        .description('Fixture: leaf')
        .action(() => undefined);
      cli.addCommand(
        new Command('quiet')
          .description('Fixture: only hidden options')
          .addOption(new Option('--q', 'hidden').hideHelp())
          .action(() => undefined),
      );
      return undefined;
    },
  });

describe('hidden options', () => {
  const host = vcWith({}, (p) => p.use(hiddenFixturePlugin()));

  it('are skipped in own help and inherited sections', async () => {
    const own = await helpText(host, ['hid', '-h']);
    expect(own).not.toContain('secret-flag');
    expect(lineOf(own, '--shown')).toBe(
      '--shown shown flag (anywhere: --vc-hid-shown)',
    );
    const leaf = await helpText(host, ['hid', 'leaf', '-h']);
    expect(leaf).not.toContain('secret-flag');
    expect(lineOf(leaf, '--vc-hid-shown')).toBe('--vc-hid-shown shown flag');
  });

  it('a subcommand whose options are all hidden is listed without [options]', async () => {
    const own = await helpText(host, ['hid', '-h']);
    expect(own).toMatch(/\n {2}quiet {2,}Fixture: only hidden options\n/);
    expect(own).toMatch(/\n {2}leaf {2,}Fixture: leaf\n/);
  });

  it('terminators appear in no help output', async () => {
    const paths = [[], ['aws'], ['batch'], ['batch', 'cmd']];
    const all = (alias: string, extra: string[][]) =>
      [...paths, ...extra].map((p) => terminatorName(alias, p));
    const vcNames = all('vc', [
      ['aws', 'secrets'],
      ['aws', 'secrets', 'pull'],
    ]);
    const gdNames = all('getdotenv', [['aws', 'whoami']]);
    for (const p of paths) {
      const vcHelp = await vc([...p, '-h']);
      const gdHelp = await getdotenv([...p, '-h']);
      for (const n of vcNames) expect(vcHelp).not.toContain(n);
      for (const n of gdNames) expect(gdHelp).not.toContain(n);
    }
    const pull = await vc(['aws', 'secrets', 'pull', '-h']);
    for (const n of vcNames) expect(pull).not.toContain(n);
  });
});
