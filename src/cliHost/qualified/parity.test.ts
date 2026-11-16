/**
 * Parity fixture (spec 4.4, task 7): the walk's view of an argv matches
 * Commander's actual parse.
 *
 * For each plain argv in the corpus (hand-picked cases for every rule, plus
 * seeded random argv over the fixture's tokens):
 *
 * 1. Normalize it once to learn the walk's path, then again with a probe
 *    qualified option (`--vc-…-zz-probe`) for every command on the path that
 *    takes options. Normalization inserts each probe at its owner's
 *    insertion point.
 * 2. Parse the probed, normalized argv with Commander, on a clone of the
 *    `vc` tree whose commands record what they parse.
 * 3. Commander must parse the same commands (owner path), give each probe to
 *    its owner and nothing else (insertion points), give each command the
 *    plain options the walk assigned to it, leave the last command the
 *    arguments the walk predicts (positional start), and render help for
 *    the same command.
 *
 * And, for an argv with no help token, Commander gives the same result for
 * the typed argv and for the normalized one (writing in a default
 * subcommand changes nothing else).
 */
import {
  Command,
  CommanderError,
  type CommandUnknownOpts,
  Option,
} from '@commander-js/extra-typings';
import { describe, expect, it } from 'vitest';

import type { GetDotenvCli } from '@/src/cliHost';
import { vcProgram } from '@/test/support/qualifiedHosts';

import { defaultSwitchOf, isHelpFlag } from './commander';
import { commandPathOf, qualifiedName } from './names';
import { normalizeQualified } from './normalize';
import { isTerminatorOption } from './register';

/** Each command's probe flag (unique, so no parent shares it). */
const PROBES = new WeakMap<CommandUnknownOpts, string>();

/** What Commander did. */
interface Parsed {
  path: string[];
  opts: Record<string, string[]>;
  args: string[];
  help: string | undefined;
  missingArgument: boolean;
}

/** Commander internals the recorder hooks. */
interface Recordable {
  _parseCommand(operands: string[], unknown: string[]): unknown;
  _defaultCommandName: string | null;
  _enablePositionalOptions: boolean;
  _passThroughOptions: boolean;
  _combineFlagAndOptionalValue: boolean;
  _actionHandler: unknown;
  _addImplicitHelpCommand: boolean | undefined;
}
const rec = (c: CommandUnknownOpts) => c as unknown as Recordable;

/** Clone the tree's parse shape into plain Commands. */
const cloneTree = (
  src: CommandUnknownOpts,
  out: Parsed,
  parsed: Command[],
): Command => {
  const c = new Command(src.name());
  for (const a of src.aliases()) c.alias(a);
  for (const o of src.options) {
    const option = new Option(o.flags);
    c.addOption(option);
    const sub = defaultSwitchOf(o);
    if (sub)
      c.on(`option:${option.name()}`, () => {
        rec(c)._defaultCommandName = sub;
      });
  }
  const s = rec(src);
  if (s._enablePositionalOptions) c.enablePositionalOptions();
  rec(c)._combineFlagAndOptionalValue = s._combineFlagAndOptionalValue;
  if (s._actionHandler)
    c.action(() => {
      /* recorded by _parseCommand */
    });
  if (s._addImplicitHelpCommand !== undefined)
    c.helpCommand(s._addImplicitHelpCommand);
  c.allowUnknownOption().allowExcessArguments().exitOverride();
  c.configureOutput({ writeOut: () => undefined, writeErr: () => undefined });
  c.on('beforeHelp', () => {
    out.help = c.name();
  });
  const parse = rec(c)._parseCommand.bind(c);
  rec(c)._parseCommand = (operands, unknown) => {
    parsed.push(c);
    return parse(operands, unknown);
  };
  for (const child of src.commands) {
    const cc = cloneTree(child, out, parsed);
    c.addCommand(cc, {
      isDefault: s._defaultCommandName === child.name(),
    });
    if (rec(child)._passThroughOptions) cc.passThroughOptions();
  }
  return c;
};

/** Parse argv on a fresh clone of the tree. */
const commanderParse = async (
  root: CommandUnknownOpts,
  argv: string[],
): Promise<Parsed> => {
  const out: Parsed = {
    path: [],
    opts: {},
    args: [],
    help: undefined,
    missingArgument: false,
  };
  const parsed: Command[] = [];
  const clone = cloneTree(root, out, parsed);
  try {
    await clone.parseAsync(argv, { from: 'user' });
  } catch (e) {
    if (!(e instanceof CommanderError)) throw e;
    if (e.code === 'commander.optionMissingArgument')
      out.missingArgument = true;
    // help({ error: true }) (a parent with no subcommand) is not a request.
    if (e.code === 'commander.help' && e.exitCode !== 0) out.help = undefined;
  }
  for (const c of parsed) {
    out.path.push(c.name());
    out.opts[c.name()] = Object.keys(c.opts()).filter(
      (k) => c.getOptionValueSource(k) === 'cli',
    );
  }
  out.args = parsed.at(-1)?.args.slice() ?? [];
  return out;
};

/** The tree with a probe option on every command. */
const probedVc = (): Promise<GetDotenvCli> =>
  vcProgram((p) => {
    let i = 0;
    const add = (c: CommandUnknownOpts) => {
      const flag = `--zz-p${String(i++)}`;
      PROBES.set(c, flag);
      c.addOption(new Option(flag, 'parity probe').hideHelp());
      c.commands.forEach(add);
    };
    add(p);
  });

/** Hand-picked: one or more argv per walk rule. */
const CASES: string[] = [
  '',
  'aws',
  'aws secrets pull',
  'aws secrets pull foo -e A B',
  'aws secrets pull -e A -5 B',
  'aws secrets pull -5 -e A',
  'aws -c echo hi',
  'aws -c echo --bogus',
  'aws cmd node -h',
  'aws -- secrets pull',
  'aws --profile p secrets',
  '-- npm test',
  '-- aws secrets pull',
  '-- -h',
  '--trace -- x',
  '--trace A aws',
  '--trace -5 aws',
  '-5',
  '-1.5e3 aws',
  '--debug=x',
  '--debug=x aws',
  '-e dev',
  '-e aws',
  '-eaws smoz',
  '--env=dev smoz openapi --verbose',
  '--shell aws',
  '--shell --debug aws',
  '-c npm test --watch',
  '-c npm test',
  'echo hi',
  'node -h',
  '--bogus -h',
  '-h',
  '-e dev -h',
  'smoz -h',
  'smoz openapi -h',
  'smoz --x openapi',
  'smoz openapi --x',
  'smoz --opt openapi',
  'smoz --opt=v openapi',
  'smoz legacy run --level 3',
  'smoz legacy --level 3 run --fast',
  'smoz legacy run --fast x',
  'smoz legacy help run',
  'smoz legacy help',
  'smoz legacy',
  'smoz openapi x --verbose',
  'smoz openapi --bogus --verbose',
  'smoz openapi -- --verbose',
  'batch -l X',
  'batch -l',
  'batch --list --globs a b',
  'batch -c echo',
  'batch cmd echo',
  'batch -- x',
  'cmd -- x',
  'cmd --bogus -h',
  'cmd node -e x',
  'aws --no-login-on-demand session',
  'aws --region=r -- x',
  'help',
  'help aws',
];

/** Seeded PRNG (mulberry32). */
const prng = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const POOL = [
  'cmd',
  'batch',
  'aws',
  'secrets',
  'pull',
  'smoz',
  'openapi',
  'legacy',
  'run',
  'help',
  'echo',
  'foo',
  '-e',
  '--env',
  '--env=x',
  '-edev',
  '--debug',
  '--debug=x',
  '--trace',
  '--trace=A',
  '--shell',
  '--strict',
  '-l',
  '--list',
  '-lp',
  '--globs',
  '-c',
  '--cmd',
  '--profile',
  '--profile=p',
  '--login-on-demand',
  '--no-login-on-demand',
  '--x',
  '--no-x',
  '--opt',
  '--opt=v',
  '--level',
  '--fast',
  '--verbose',
  '-5',
  '-1.5',
  '--',
  '--bogus',
  '-z',
  '-h',
  '--help',
  '-vA=1',
];

const RANDOM_COUNT = 400;
const random = (): string[] => {
  const next = prng(20261116);
  return Array.from({ length: RANDOM_COUNT }, () => {
    const n = Math.floor(next() * 8);
    return Array.from(
      { length: n },
      () => POOL[Math.floor(next() * POOL.length)] as string,
    ).join(' ');
  });
};

const CORPUS = [...CASES, ...random()];
const words = (s: string): string[] => (s === '' ? [] : s.split(' '));

/** The walk's prediction, keyed like {@link Parsed}. */
const predicted = (
  n: ReturnType<typeof normalizeQualified>,
  items: string[],
) => {
  const opts: Record<string, string[]> = {};
  for (const e of n.walk.path) opts[e.command.name()] = [];
  for (const a of n.walk.assigned)
    (opts[a.command.name()] ??= []).push(a.option.attributeName());
  for (const c of n.claims)
    (opts[c.entry.command.name()] ??= []).push(c.entry.option.attributeName());
  return {
    path: n.walk.path.map((e) => e.command.name()),
    opts,
    args: n.walk.args.map((i) => items[i]),
    help: n.walk.help?.name(),
  };
};

/** Drop terminator attributes (Commander records them; the bag never). */
const strip = (root: CommandUnknownOpts, r: Record<string, string[]>) => {
  const keys = new Set<string>();
  const collect = (c: CommandUnknownOpts) => {
    for (const o of c.options)
      if (isTerminatorOption(o)) keys.add(o.attributeName());
    c.commands.forEach(collect);
  };
  collect(root);
  return Object.fromEntries(
    Object.entries(r).map(([k, v]) => [k, v.filter((x) => !keys.has(x))]),
  );
};

const sorted = (r: Record<string, string[]>) =>
  Object.fromEntries(
    Object.entries(r).map(([k, v]) => [k, [...new Set(v)].sort()]),
  );

describe('parity fixture: the walk matches Commander', () => {
  it(`corpus size: ${String(CORPUS.length)} argv (${String(CASES.length)} hand-picked + ${String(RANDOM_COUNT)} seeded)`, () => {
    expect(CORPUS.length).toBe(CASES.length + RANDOM_COUNT);
  });

  it.each(CORPUS.map((c) => [c]))('vc %s', async (typed) => {
    const vc = await probedVc();
    const alias = vc.name();
    const argv = words(typed);
    const first = normalizeQualified(vc, argv);

    // Probes for every command on the path that takes options.
    const probes = first.walk.incomplete
      ? []
      : first.walk.path
          .filter((e) => e.takesOptions)
          .map((e) =>
            qualifiedName(
              alias,
              commandPathOf(e.command),
              PROBES.get(e.command) ?? '',
            ),
          );
    const n = normalizeQualified(vc, [...argv, ...probes]);
    expect(n.walk.path.map((e) => e.command.name())).toEqual(
      first.walk.path.map((e) => e.command.name()),
    );

    const parsed = await commanderParse(vc, n.argv);

    // The walk's args index its items: the typed tokens, then the probes'
    // gaps (the corpus has no qualified tokens of its own).
    const want = predicted(n, [...argv, ...probes]);
    // A missing value stops Commander mid-parse; a help request stops it
    // before options and arguments are final. Compare what both define.
    const settled = !n.walk.incomplete && want.help === undefined;
    const view = (p: {
      opts: Record<string, string[]>;
      args: (string | undefined)[];
    }) => (settled ? { opts: sorted(p.opts), args: p.args } : undefined);
    expect({
      missing: parsed.missingArgument,
      path: n.walk.incomplete ? undefined : parsed.path,
      help: parsed.help,
      view: view({ opts: strip(vc, parsed.opts), args: parsed.args }),
    }).toEqual({
      missing: n.walk.incomplete,
      path: n.walk.incomplete ? undefined : want.path,
      help: n.walk.incomplete ? parsed.help : want.help,
      view: view(want),
    });
  });

  it.each(
    CORPUS.filter((c) => !words(c).some((t) => t === '-h' || t === '--help'))
      .filter((c) => !words(c).includes('help'))
      .map((c) => [c]),
  )('vc %s: typed and normalized parse alike', async (typed) => {
    const vc = await probedVc();
    const argv = words(typed);
    const n = normalizeQualified(vc, argv);
    const a = await commanderParse(vc, argv);
    const b = await commanderParse(vc, n.argv);
    expect(b.path).toEqual(a.path);
    expect(b.missingArgument).toBe(a.missingArgument);
    expect({ opts: sorted(strip(vc, b.opts)), args: b.args }).toEqual({
      opts: sorted(a.opts),
      args: a.args,
    });
  });

  it('isHelpFlag reads the help option', async () => {
    const vc = await probedVc();
    expect(isHelpFlag(vc, '-h')).toBe(true);
    expect(isHelpFlag(vc, '--help')).toBe(true);
    expect(isHelpFlag(vc, '-H')).toBe(false);
  });
});
