/**
 * `normalizeArgv` (spec 4.4): every row of the 4.4 examples table and of the
 * Decision 28 table, every 4.4 error with its exact message, and the
 * Decision 26/30/31/34 rules, against the S1 `vc` fixture tree and the
 * shipped `getdotenv` tree.
 */
import { Option } from '@commander-js/extra-typings';
import { describe, expect, it } from 'vitest';

import type { GetDotenvCli } from '@/src/cliHost';
import { getdotenvProgram, vcProgram } from '@/test/support/qualifiedHosts';

import { NormalizeArgvError } from './errors';
import { normalizeArgv, normalizeQualified } from './normalize';

/** `'a b c'` → `['a', 'b', 'c']` (no quoting needed in these rows). */
const words = (s: string): string[] => (s === '' ? [] : s.split(' '));

/** The error normalization throws for `argv`. */
const errorOf = (program: GetDotenvCli, argv: string[]): Error => {
  try {
    normalizeArgv(program, argv);
  } catch (e) {
    return e as Error;
  }
  throw new Error(`no error for ${argv.join(' ')}`);
};

/** 4.4 examples table: typed (after `vc`) → normalized (after `vc`). */
const EXAMPLES: Array<[string, string]> = [
  ['smoz openapi --verbose --vc-env bali', '--env=bali smoz openapi --verbose'],
  [
    'aws secrets --vc-env bali --vc-aws-profile foo pull',
    '--env=bali aws --profile=foo secrets pull',
  ],
  [
    'aws secrets pull -e FOO --vc-env bali',
    '--env=bali aws secrets pull -e FOO',
  ],
  ['aws s3 ls --debug --vc-debug', '--debug aws s3 ls --debug'],
  [
    'cmd npm test -- --watch --vc-env bali',
    '--env=bali cmd npm test -- --watch',
  ],
  ['echo hi --vc-env bali', '--env=bali cmd echo hi'],
  ['-- npm test --vc-env bali', '--env=bali cmd -- npm test'],
  ['node -h', 'cmd node -h'],
  ['batch -l X', 'batch -l X'],
  ['-h --vc-env bali', '--env=bali -h'],
  ['--bogus -h', 'cmd --bogus -h'],
  ['echo --vc-q1r1s hi', 'cmd echo hi'],
  [
    'aws secrets pull foo -e A --vc-debug B',
    '--debug aws secrets pull foo -e A --vc-f3jrb B',
  ],
  ['cmd grep -e x --vc-env y', '--env=y cmd grep -e x'],
  ['--vc-env bali aws --vc-env dev', '--env=dev aws'],
  [
    '--vc-redact-pattern=a aws --vc-redact-pattern=b',
    '--redact-pattern=a --redact-pattern=b aws',
  ],
  ['cmd smoz openapi --smoz-env bali', 'cmd smoz openapi --smoz-env bali'],
];

/** 4.4 examples table: the rows that fail, with their exact messages. */
const EXAMPLE_ERRORS: Array<[string, string]> = [
  [
    '--trace A aws --vc-aws-profile x',
    "'--vc-aws-profile' applies to 'vc aws', which is not being invoked.",
  ],
  [
    '-e --vc-debug aws',
    "missing value for -e (the next token, '--vc-debug', is a qualified option)",
  ],
  [
    'aws --no-login-on-demand --vc-aws-login-on-demand',
    "'--login-on-demand' given twice (as --no-login-on-demand and --vc-aws-login-on-demand)",
  ],
  ['--vc-debug=x', "'--vc-debug' takes no value"],
  ['--vc-cmd npm test', 'missing value for --vc-cmd'],
];

/** Decision 28 table (the `aws` optional-option row is tested below). */
const D28: Array<[string, string]> = [
  [
    'smoz openapi --verbose --vc-trace',
    '--trace --vc-q1r1s smoz openapi --verbose',
  ],
  ['echo hi --vc-shell', '--shell --vc-q1r1s cmd echo hi'],
  ['--vc-trace --debug echo hi', '--trace --debug cmd echo hi'],
  ['echo hi --vc-trace=API_URL', '--trace=API_URL cmd echo hi'],
  ['--shell --vc-debug echo hi', '--debug --shell --vc-q1r1s cmd echo hi'],
];

describe('normalizeArgv: 4.4 examples (vc)', () => {
  it.each(EXAMPLES)('vc %s → vc %s', async (typed, normalized) => {
    const vc = await vcProgram();
    expect(normalizeArgv(vc, words(typed))).toEqual(words(normalized));
  });

  it('nr openapi --vc-env bali (script "nr vc smoz openapi --verbose") is the first row', async () => {
    const vc = await vcProgram();
    const script = words('smoz openapi --verbose');
    expect(normalizeArgv(vc, [...script, '--vc-env', 'bali'])).toEqual(
      words('--env=bali smoz openapi --verbose'),
    );
  });

  it.each(EXAMPLE_ERRORS)('vc %s fails: %s', async (typed, message) => {
    const vc = await vcProgram();
    const err = errorOf(vc, words(typed));
    expect(err).toBeInstanceOf(NormalizeArgvError);
    expect(err.message).toBe(message);
  });
});

describe('normalizeArgv: 4.4 examples (shipped getdotenv)', () => {
  it('getdotenv init x --cli-name --getdotenv-debug y fails across the gap', async () => {
    const g = await getdotenvProgram();
    expect(
      errorOf(g, words('init x --cli-name --getdotenv-debug y')).message,
    ).toBe(
      "missing value for --cli-name (the next token, '--getdotenv-debug', is a qualified option)",
    );
  });

  it.each([
    ['node -h', 'cmd node -h'],
    ['echo hi --getdotenv-env bali', '--env=bali cmd echo hi'],
    ['-h --getdotenv-env bali', '--env=bali -h'],
    ['aws --getdotenv-aws-profile p whoami', 'aws --profile=p whoami'],
    ['echo hi --getdotenv-trace', '--trace --getdotenv-qepva cmd echo hi'],
  ])('getdotenv %s → getdotenv %s', async (typed, normalized) => {
    const g = await getdotenvProgram();
    expect(normalizeArgv(g, words(typed))).toEqual(words(normalized));
  });
});

describe('normalizeArgv: Decision 28 terminators', () => {
  it.each(D28)('vc %s → vc %s', async (typed, normalized) => {
    const vc = await vcProgram();
    expect(normalizeArgv(vc, words(typed))).toEqual(words(normalized));
  });

  it('vc aws --vc-aws-<optional> s3 ls → vc aws --<optional> --vc-c1ryg s3 ls', async () => {
    const vc = await vcProgram((p) => {
      p.commands
        .find((c) => c.name() === 'aws')
        ?.addOption(new Option('--hint [value]', 'an optional aws option'));
    });
    expect(normalizeArgv(vc, words('aws --vc-aws-hint s3 ls'))).toEqual(
      words('aws --hint --vc-c1ryg s3 ls'),
    );
    // No terminator when the next token can't be a value, or at the end.
    expect(normalizeArgv(vc, words('aws --vc-aws-hint --x'))).toEqual(
      words('aws --hint --x'),
    );
    expect(normalizeArgv(vc, words('aws --vc-aws-hint'))).toEqual(
      words('aws --hint'),
    );
  });

  it('a negative number after a bare optional gets the terminator', async () => {
    const vc = await vcProgram();
    expect(normalizeArgv(vc, words('--vc-trace -5'))).toEqual(
      words('--trace --vc-q1r1s cmd -5'),
    );
  });

  it('a required option never gets a terminator', async () => {
    const vc = await vcProgram();
    expect(normalizeArgv(vc, words('echo --vc-env=bali'))).toEqual(
      words('--env=bali cmd echo'),
    );
  });

  it('a gap that ended no value gets no terminator', async () => {
    const vc = await vcProgram();
    expect(normalizeArgv(vc, words('--shell bash --vc-debug echo'))).toEqual(
      words('--debug --shell bash cmd echo'),
    );
    // A gap that ended a run, at the end: nothing follows, no terminator.
    expect(normalizeArgv(vc, words('--trace A --vc-debug'))).toEqual(
      words('--debug --trace A'),
    );
  });

  it('a gap ending a plain variadic run before a value gets the terminator', async () => {
    const vc = await vcProgram();
    expect(normalizeArgv(vc, words('--trace A --vc-debug B'))).toEqual(
      words('--debug --trace A --vc-q1r1s cmd B'),
    );
  });

  it('a default written in after an open value gets the parent terminator first', async () => {
    const vc = await vcProgram();
    // -c is variadic: without the terminator, `cmd` would be its value.
    expect(normalizeArgv(vc, words('-c npm test --watch'))).toEqual(
      words('-c npm test --vc-q1r1s cmd --watch'),
    );
    // --trace took no value (the next token is `--`).
    expect(normalizeArgv(vc, words('--trace -- x'))).toEqual(
      words('--trace --vc-q1r1s cmd -- x'),
    );
  });
});

describe('normalizeArgv: step 1 (extraction)', () => {
  it('claims qualified tokens after -- and inside pass-through arguments', async () => {
    const vc = await vcProgram();
    expect(normalizeArgv(vc, words('cmd node -e x -- y --vc-env p'))).toEqual(
      words('--env=p cmd node -e x -- y'),
    );
    expect(errorOf(vc, words('cmd node -- y --vc-aws-profile p')).message).toBe(
      "'--vc-aws-profile' applies to 'vc aws', which is not being invoked.",
    );
  });

  it('drops typed terminators anywhere, leaving no gap', async () => {
    const vc = await vcProgram();
    // No gap: -e still takes aws.
    expect(normalizeArgv(vc, words('-e --vc-q1r1s aws'))).toEqual(
      words('-e aws'),
    );
    expect(normalizeArgv(vc, words('aws --vc-c1ryg -- x --vc-f3jrb'))).toEqual(
      words('aws -- x'),
    );
  });

  it("an unknown '--<alias>-' token fails, with or without =value", async () => {
    const vc = await vcProgram();
    expect(errorOf(vc, words('--vc-envv bali')).message).toBe(
      "Unknown option '--vc-envv' (the '--vc-' prefix is reserved for vc)",
    );
    expect(errorOf(vc, words('cmd x --vc-nope=1')).message).toBe(
      "Unknown option '--vc-nope' (the '--vc-' prefix is reserved for vc)",
    );
  });

  it("outer vc rejects a nested CLI's unclaimed --vc-test-env token (4.4 step 1)", async () => {
    const vc = await vcProgram();
    expect(
      errorOf(vc, words('cmd vc-test echo --vc-test-env dev')).message,
    ).toBe(
      "Unknown option '--vc-test-env' (the '--vc-' prefix is reserved for vc)",
    );
  });

  it('a terminator given =value takes no value', async () => {
    const vc = await vcProgram();
    expect(errorOf(vc, ['--vc-q1r1s=x']).message).toBe(
      "'--vc-q1r1s' takes no value",
    );
  });

  it('tokens of other aliases and plain tokens are left alone', async () => {
    const vc = await vcProgram();
    expect(
      normalizeArgv(vc, words('cmd smoz --smoz-env x --vcx --vc')),
    ).toEqual(words('cmd smoz --smoz-env x --vcx --vc'));
  });
});

describe('normalizeArgv: step 2 (values)', () => {
  it('a required single value: next token or =value; never a -- token', async () => {
    const vc = await vcProgram();
    expect(normalizeArgv(vc, words('--vc-env -x aws'))).toEqual(
      words('--env=-x aws'),
    );
    expect(normalizeArgv(vc, words('aws --vc-env=--x'))).toEqual(
      words('--env=--x aws'),
    );
    expect(normalizeArgv(vc, words('aws --vc-env='))).toEqual(
      words('--env= aws'),
    );
    expect(errorOf(vc, words('--vc-env --vc-debug')).message).toBe(
      'missing value for --vc-env',
    );
    expect(errorOf(vc, words('aws --vc-env')).message).toBe(
      'missing value for --vc-env',
    );
  });

  it('a required variadic takes =value only, one value per token', async () => {
    const vc = await vcProgram();
    expect(
      normalizeArgv(vc, [
        'aws',
        'secrets',
        'pull',
        '--vc-aws-secrets-pull-exclude=A',
        '--vc-aws-secrets-pull-exclude=B C',
      ]),
    ).toEqual(['aws', 'secrets', 'pull', '--exclude=A', '--exclude=B C']);
    expect(
      errorOf(vc, words('aws secrets pull --vc-aws-secrets-pull-exclude A'))
        .message,
    ).toBe('missing value for --vc-aws-secrets-pull-exclude');
    expect(normalizeArgv(vc, ['--vc-cmd=npm test'])).toEqual([
      '--cmd=npm test',
    ]);
  });

  it('booleans are emitted bare; =value fails', async () => {
    const vc = await vcProgram();
    expect(normalizeArgv(vc, words('aws --vc-aws-no-login-on-demand'))).toEqual(
      words('aws --no-login-on-demand'),
    );
    expect(errorOf(vc, words('aws --vc-aws-login-on-demand=1')).message).toBe(
      "'--vc-aws-login-on-demand' takes no value",
    );
  });
});

describe('normalizeArgv: step 3 (the walk)', () => {
  it('-- at the root still dispatches to a subcommand, which takes no options', async () => {
    const vc = await vcProgram();
    expect(normalizeArgv(vc, words('-- aws x'))).toEqual(words('-- aws x'));
    expect(errorOf(vc, words('-- aws --vc-aws-profile p')).message).toBe(
      "'--vc-aws-profile' applies to 'vc aws', which takes no options at this point.",
    );
  });

  it('-- at a leaf ends the walk; later tokens are operands', async () => {
    const vc = await vcProgram();
    expect(
      normalizeArgv(vc, words('smoz openapi -- --verbose --vc-smoz-x')),
    ).toEqual(words('smoz --x openapi -- --verbose'));
  });

  it('a default reached at the end of argv takes no options there', async () => {
    const vc = await vcProgram();
    const n = normalizeQualified(vc, words('-e dev'));
    expect(n.walk.path.map((e) => [e.command.name(), e.kind])).toEqual([
      ['vc', 'root'],
      ['cmd', 'implicit'],
    ]);
    expect(n.walk.path[1]?.takesOptions).toBe(false);
  });

  it('a negative number is unknown on a command with subcommands, an operand on a leaf', async () => {
    const vc = await vcProgram();
    // Root has subcommands: -5 is an unknown option, entering cmd.
    expect(normalizeArgv(vc, words('-5 --vc-env x'))).toEqual(
      words('--env=x cmd -5'),
    );
    // A leaf: -5 is an operand, and -e after it still parses.
    expect(
      normalizeArgv(vc, words('aws secrets pull -5 -e A --vc-debug B')),
    ).toEqual(words('--debug aws secrets pull -5 -e A --vc-f3jrb B'));
    // As a variadic value it continues the run.
    expect(
      normalizeArgv(vc, words('aws secrets pull -e A -5 --vc-debug B')),
    ).toEqual(words('--debug aws secrets pull -e A -5 --vc-f3jrb B'));
  });

  it('--bool=x is an unknown option, entering the default', async () => {
    const vc = await vcProgram();
    expect(normalizeArgv(vc, words('--debug=x --vc-env e'))).toEqual(
      words('--env=e cmd --debug=x'),
    );
  });

  it('a plain mount without positional options keeps parsing its own options after its subcommand', async () => {
    const vc = await vcProgram();
    const n = normalizeQualified(
      vc,
      words('smoz legacy run --level 3 --vc-smoz-legacy-run-fast'),
    );
    expect(n.argv).toEqual(words('smoz legacy run --fast --level 3'));
    const legacy = n.walk.assigned.find((a) => a.flag === '--level');
    expect(legacy?.command.name()).toBe('legacy');
  });

  it('skips option values: required, optional, variadic, = form and combined shorts', async () => {
    const vc = await vcProgram();
    // -e takes `aws` (required): aws is not invoked.
    expect(errorOf(vc, words('-e aws --vc-aws-profile p')).message).toBe(
      "'--vc-aws-profile' applies to 'vc aws', which is not being invoked.",
    );
    // --shell takes `aws` (optional with a value).
    expect(errorOf(vc, words('--shell aws --vc-aws-profile p')).message).toBe(
      "'--vc-aws-profile' applies to 'vc aws', which is not being invoked.",
    );
    // --env=x is one token; -eaws is -e with value aws.
    expect(normalizeArgv(vc, words('--env=x aws --vc-aws-profile p'))).toEqual(
      words('--env=x aws --profile=p'),
    );
    expect(errorOf(vc, words('-eaws --vc-aws-profile p')).message).toBe(
      "'--vc-aws-profile' applies to 'vc aws', which is not being invoked.",
    );
    // -l is a boolean on batch; -lP… continues the group.
    expect(normalizeArgv(vc, words('batch -lp . --vc-batch-globs=x'))).toEqual(
      words('batch --globs=x -lp .'),
    );
  });

  it("Commander's implicit help command ends the walk", async () => {
    const vc = await vcProgram();
    const n = normalizeQualified(vc, words('smoz legacy help run'));
    expect(n.walk.help?.name()).toBe('run');
    expect(
      errorOf(vc, words('smoz legacy help run --vc-smoz-legacy-run-fast'))
        .message,
    ).toBe(
      "'--vc-smoz-legacy-run-fast' applies to 'vc smoz legacy run', which is not being invoked.",
    );
  });

  it('help: top-level only when the root keeps the -h token', async () => {
    const vc = await vcProgram();
    const help = (s: string) =>
      normalizeQualified(vc, words(s)).walk.help?.name();
    expect(help('-h')).toBe('vc');
    expect(help('-e dev --help')).toBe('vc');
    expect(help('aws -h')).toBe('aws');
    expect(help('aws --bogus -h')).toBe('aws');
    expect(help('--bogus -h')).toBe('cmd');
    expect(help('node -h')).toBeUndefined();
    expect(help('-- -h')).toBeUndefined();
    expect(help('-e -h')).toBeUndefined();
  });

  it('the cmd alias makes its mount the default for the rest of the parse', async () => {
    const vc = await vcProgram();
    // At aws: -c consumes echo, then --bogus enters aws cmd (written in).
    expect(normalizeArgv(vc, words('aws -c echo --bogus'))).toEqual(
      words('aws -c echo --vc-c1ryg cmd --bogus'),
    );
    // Given qualified, the switch applies too.
    const n = normalizeQualified(vc, ['aws', '--vc-aws-cmd=echo']);
    expect(n.argv).toEqual(['aws', '--cmd=echo']);
    expect(n.walk.path.map((e) => e.command.name())).toEqual([
      'vc',
      'aws',
      'cmd',
    ]);
  });

  it('a missing required value at the end leaves the error to Commander', async () => {
    const vc = await vcProgram();
    const n = normalizeQualified(vc, words('--vc-debug aws --profile'));
    expect(n.walk.incomplete).toBe(true);
    expect(n.argv).toEqual(words('--debug aws --profile'));
  });
});

describe('normalizeArgv: steps 5 and 6 (owners and duplicates)', () => {
  it('plain and qualified forms of one option fail, short or long', async () => {
    const vc = await vcProgram();
    expect(errorOf(vc, words('--env x --vc-env y')).message).toBe(
      "'--env' given twice (as --env and --vc-env)",
    );
    expect(errorOf(vc, words('-e x --vc-env y')).message).toBe(
      "'--env' given twice (as -e and --vc-env)",
    );
    expect(errorOf(vc, words('--env=x --vc-env y')).message).toBe(
      "'--env' given twice (as --env and --vc-env)",
    );
    expect(errorOf(vc, words('smoz --x --vc-smoz-no-x')).message).toBe(
      "'--x' given twice (as --x and --vc-smoz-no-x)",
    );
  });

  it('a plain form of the same name on another command does not count', async () => {
    const vc = await vcProgram((p) => {
      p.commands
        .find((c) => c.name() === 'smoz')
        ?.commands.find((c) => c.name() === 'openapi')
        ?.addOption(new Option('--env <name>', 'an openapi env'));
    });
    expect(normalizeArgv(vc, words('smoz openapi --env a --vc-env b'))).toEqual(
      words('--env=b smoz openapi --env a'),
    );
  });

  it('a plain form assigned to another command does not count', async () => {
    const vc = await vcProgram();
    expect(
      normalizeArgv(vc, words('aws secrets pull -e A --vc-env y')),
    ).toEqual(words('--env=y aws secrets pull -e A'));
  });

  it('repeated qualified options: last value wins, variadics accumulate (D26)', async () => {
    const vc = await vcProgram();
    expect(
      normalizeArgv(vc, words('--vc-env a --vc-debug --vc-env b aws')),
    ).toEqual(words('--env=b --debug aws'));
    // A --no- pair is one option: the last given wins.
    expect(
      normalizeArgv(
        vc,
        words('aws --vc-aws-login-on-demand --vc-aws-no-login-on-demand'),
      ),
    ).toEqual(words('aws --no-login-on-demand'));
    expect(normalizeArgv(vc, words('--vc-trace=A --vc-trace=B aws'))).toEqual(
      words('--trace=A --trace=B aws'),
    );
  });

  it('options with the same owner keep their relative order', async () => {
    const vc = await vcProgram();
    expect(
      normalizeArgv(vc, words('aws --vc-aws-region r --vc-aws-profile p')),
    ).toEqual(words('aws --region=r --profile=p'));
  });
});

describe('normalizeArgv: the table', () => {
  it('builds the table on first use and reuses it', async () => {
    const vc = await vcProgram();
    const a = normalizeQualified(vc, []);
    const b = normalizeQualified(vc, []);
    expect(a.table).toBe(b.table);
    expect(a.argv).toEqual([]);
  });
});
