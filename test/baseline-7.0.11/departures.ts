/**
 * Listed departures from the 7.0.11 behaviour baseline.
 *
 * The baseline test fails on any case whose output differs from the stored
 * 7.0.11 output, unless the case is listed here. Every entry names the issue
 * (`#NN`) or spec decision (`DNN`) that changes the behaviour. The baseline
 * itself is never re-recorded to make a test pass.
 *
 * Two kinds of entry:
 * - {@link departures}: one case, whose whole record is no longer compared.
 * - {@link fieldDepartures}: one field of the options bag, changed from one
 *   value to another in every case that records it. Everything else in those
 *   cases is still compared exactly. Only for a value that appears in many
 *   cases and has a single cause.
 */

/** One accepted departure from the 7.0.11 baseline. */
export interface Departure {
  /** Case id, exactly as in the corpus and the baseline files. */
  case: string;
  /** The issue (`#NN`) or spec decision (`DNN`) that causes the change. */
  issueOrDecision: `#${number}` | `D${number}`;
  /** What changes, in a sentence. */
  note: string;
}

/**
 * One accepted change to a single options-bag field, across every case.
 *
 * The comparer looks for `bagPath` in every options bag a record holds: the
 * merged bag (`bag`) and the `getDotenvCliOptions` each child and AWS call
 * received. Wherever the stored value is `from`, the current value must be
 * `to`; any other current value fails. A stored value other than `from` is
 * compared as is. An entry that matches no stored value in any case fails.
 */
export interface FieldDeparture {
  /** Property path inside an options bag, e.g. `['scripts', 'git-status', 'cmd']`. */
  bagPath: readonly string[];
  /** The stored 7.0.11 value. */
  from: unknown;
  /** The value that replaces it. */
  to: unknown;
  /** The issue (`#NN`, optionally `(follow-up)`) or spec decision (`DNN`). */
  issueOrDecision: `#${number}` | `#${number} (follow-up)` | `D${number}`;
  /** What changes, and why, in a sentence. */
  note: string;
}

/** Field departures, in step order. */
export const fieldDepartures: FieldDeparture[] = [
  // S6b: follow-ups after S7
  {
    bagPath: ['scripts', 'git-status', 'cmd'],
    from: 'git branch --show-current && git status -s -u',
    to: 'git status -s -u -b',
    issueOrDecision: '#51 (follow-up)',
    note: "The built-in git-status script is one command with no shell operators: shell: true is powershell.exe on win32 since #51, and PowerShell 5.1 has no '&&'. '-b' prints the branch line.",
  },
];

/** Departures, in step order. Empty at S1. */
export const departures: Departure[] = [
  // S4: namespaces
  {
    case: '#44 ns override',
    issueOrDecision: '#44',
    note: "Sibling overrides 'deploy-api' and 'deploy-web' both install (no 'Duplicate command name: deploy'), and the child override mounts as 'who2', not 'whoami'.",
  },
  // S5: option resolution and defaults
  {
    case: '#45 off flags',
    issueOrDecision: '#45',
    note: '-P, -L and -A take effect: the bag (and the child getDotenvCliOptions) has loadProcess, log and all five exclusions false.',
  },
  {
    case: '#45 entropy-warn-off',
    issueOrDecision: '#45',
    note: '--entropy-warn-off turns off the true warnEntropy default: the bag has warnEntropy false.',
  },
  {
    case: '#45 redact-off',
    issueOrDecision: '#45',
    note: '--redact-off overrides config rootOptionDefaults.redact: the bag has redact false and no raw redactOff key.',
  },
  {
    case: '#68 excludeAll default',
    issueOrDecision: '#68',
    note: 'Config rootOptionDefaults.excludeAll takes effect: the bag has all five exclusions true and the child sees no APP.',
  },
  {
    case: '#91 parent shell false',
    issueOrDecision: '#91',
    note: "A parent bag shell: false beats the child's string default: stringDefault is false, not '/bin/zsh'.",
  },
  {
    case: '#77 createCli defaults beat config',
    issueOrDecision: '#77',
    note: "Config rootOptionDefaults.paths './b' beats createCli's './a': the bag has paths './b' and FOO is fromB.",
  },
  {
    case: '#83 rootOptionDefaults dynamic',
    issueOrDecision: '#83',
    note: 'JSON rootOptionDefaults.dynamic fails the config schema: exit 1 with "rootOptionDefaults.dynamic: ... is not allowed in rootOptionDefaults"; nothing runs.',
  },
  {
    case: '#83 rootOptionDefaults dynamic -z',
    issueOrDecision: '#83',
    note: 'As "#83 rootOptionDefaults dynamic": the config is rejected before -z matters.',
  },
  {
    case: '#64 compositions',
    issueOrDecision: '#64',
    note: 'One composition per run: the config dynamic evaluates once (one DYN-EVAL, not two); the lazy pre-pass no longer runs on a host with root hooks.',
  },
  {
    case: '#64 compositions -z',
    issueOrDecision: '#64',
    note: '-z covers the only composition: no DYN-EVAL (the lazy pass that ignored -z is gone).',
  },
  {
    case: '#64 compositions alias',
    issueOrDecision: '#64',
    note: 'The -c alias runs against the root composition: one DYN-EVAL, not three.',
  },
  // S6: env composition and expansion
  {
    case: '#78 expansion',
    issueOrDecision: '#78',
    note: "'\\$A $A' gives '$A x'; 'x$&y' is spliced in unchanged; 'a$$b' expands like any value ('a$' plus the unset $b); '$SELF' with SELF=$SELF gives undefined instead of a RangeError.",
  },
  {
    case: '#86 trailing dollar',
    issueOrDecision: '#86',
    note: "A $ that starts no reference stays literal and the other references expand: 'x cost $', 'x $!', 'x 100$'.",
  },
  {
    case: '#63 vars against process.env',
    issueOrDecision: '#63',
    note: "Config vars expand against process.env like the file cascade: the child sees CFGHOME 'xambient-value', not 'x'.",
  },
  {
    case: '#89 vars expanded twice',
    issueOrDecision: '#89',
    note: "-v is expanded once, in the vars layer, which sees process.env (#63): P is '$5' (not unset), Q is '\\$6' (not '$6'), and the bag keeps the -v string as given. The -P in the case also takes effect (#45, S5): the bag has loadProcess false.",
  },
  {
    case: '#73 vars split',
    issueOrDecision: '#73',
    note: "-v 'A=b=c' is split at the first assignor only: the child sees A 'b=c', not 'b'.",
  },
  {
    case: '#47 undefined into process.env',
    issueOrDecision: '#47',
    note: 'Host loadProcess deletes an unset key instead of writing "undefined": the child has no EMPTY.',
  },
  {
    case: '#48 getDotenv loads process.env',
    issueOrDecision: '#48',
    note: 'getDotenv() no longer loads process.env by default: FOO is not set after the call.',
  },
  {
    case: '#61 validation twice',
    issueOrDecision: '#61',
    note: 'Env validation runs once per run: stderr has one "[requiredKeys] missing: MISSING_KEY" line, not two.',
  },
  {
    case: '#82 empty env',
    issueOrDecision: '#82',
    note: "getDotenv({ env: '', defaultEnv: 'dev' }) reads .env.dev and .env.dev.local (XLOCAL 'dev', STAGE 'dev'), not .env..local.",
  },
  // S7: command execution
  {
    case: '#74 capture drops stderr',
    issueOrDecision: '#74',
    note: "Under capture the child's stderr is re-emitted: stderr is '1111'.",
  },
  {
    case: '#49 alias script',
    issueOrDecision: '#49',
    note: "The alias runs through the cmd action with the merged bag, so config scripts resolve: 'hello' runs its config script and the child gets argv ['42'] (was: the unresolved 'hello' failed in the shell).",
  },
  {
    case: '4.4 row 05',
    issueOrDecision: '#49',
    note: "The alias runs only through the cmd action (#49), so the alias hook's '[getdotenv:alias]' debug lines are gone from stderr.",
  },
  {
    case: '4.4 row 17',
    issueOrDecision: '#49',
    note: "The alias runs only through the cmd action (#49), so the alias hook's '[getdotenv:alias]' debug lines are gone from stderr.",
  },
  {
    case: 'D28 row 04',
    issueOrDecision: '#49',
    note: "The alias runs only through the cmd action (#49), so the alias hook's '[getdotenv:alias]' debug lines are gone from stderr.",
  },
  {
    case: '#50 alias conflict',
    issueOrDecision: '#70',
    note: "The variadic alias takes every token ('node probe.mjs', 'cmd', 'node', 'probe.mjs'), so no subcommand is in subcommand position: the alias runs and the child gets argv ['cmd','node','probe.mjs'].",
  },
  {
    case: 'help getdotenv batch',
    issueOrDecision: '#65',
    note: "batch cmd is no longer batch's default subcommand: its description loses '(default subcommand)'.",
  },
  {
    case: 'help getdotenv batch cmd',
    issueOrDecision: '#65',
    note: "batch cmd is no longer batch's default subcommand: its description loses '(default subcommand)'.",
  },
  {
    case: 'help vc batch',
    issueOrDecision: '#65',
    note: "batch cmd is no longer batch's default subcommand: its description loses '(default subcommand)'.",
  },
  {
    case: 'help vc batch cmd',
    issueOrDecision: '#65',
    note: "batch cmd is no longer batch's default subcommand: its description loses '(default subcommand)'.",
  },
  {
    case: '4.4 row 10',
    issueOrDecision: '#65',
    note: "batch -l runs batch's own action: it lists directories (positionals join the globs: '* node probe.mjs') and runs nothing.",
  },
  {
    case: '#65 batch -l runs positionals',
    issueOrDecision: '#65',
    note: "batch -g pkgA -l node probe.mjs lists directories (globs 'pkgA node probe.mjs') and runs nothing.",
  },
  {
    case: 'help getdotenv aws whoami',
    issueOrDecision: '#57',
    note: "The demo 'really' subcommand is gone: whoami's help has no Commands section and its usage has no [command].",
  },
  {
    case: 'help getdotenv aws whoami really',
    issueOrDecision: '#57',
    note: "The demo 'really' subcommand is gone: 'aws whoami really -h' shows whoami's own help.",
  },
  {
    case: '#57 whoami really',
    issueOrDecision: '#57',
    note: "The demo 'really' subcommand is gone: whoami rejects it (\"error: too many arguments for 'whoami'. Expected 0 arguments but got 1: really.\"), exit 1, no secret identity on stdout.",
  },
  {
    case: 'help getdotenv init',
    issueOrDecision: '#58',
    note: 'init no longer offers the no-op --dynamic flag.',
  },
  {
    case: '#58 init gitignore',
    issueOrDecision: '#58',
    note: "The existing .gitignore isn't rewritten: its CRLF endings and blank line stay, and the needed lines were already there, so it is unchanged.",
  },
  {
    case: '#58 init dynamic',
    issueOrDecision: '#58',
    note: '--dynamic is no longer an option: init fails with "error: unknown option \'--dynamic\'" (exit 1) and scaffolds nothing.',
  },
  {
    case: '#59 batch --command capture',
    issueOrDecision: '#59',
    note: "batch --command passes the merged options bag: each child's getDotenvCliOptions is the full bag (with capture: true), not {}.",
  },
  {
    case: '#70 alias value names a subcommand',
    issueOrDecision: '#70',
    note: "A subcommand name inside the alias value is not subcommand detection: the alias runs and the child gets argv ['init'].",
  },
  {
    case: '#70 optionAlias expand false',
    issueOrDecision: '#70',
    note: "optionAlias.expand false is honoured: the child gets the literal '$BASELINE_AMBIENT'.",
  },
  {
    case: '#50 cmd exit',
    issueOrDecision: '#50',
    note: "cmd propagates the child's failure: exit 1 on win32 (powershell.exe -Command reports any failure as 1), 4 on linux.",
  },
  {
    case: '#50 default exit',
    issueOrDecision: '#50',
    note: "The default command propagates the child's failure: exit 1 on win32 (powershell.exe -Command reports any failure as 1), 4 on linux.",
  },
  {
    case: '#50 batch exit',
    issueOrDecision: '#50',
    note: "Sequential batch stops at the first failure: only pkgA runs, stderr reports '<TMP>/pkgA failed (exit code N); stopping.', and the exit code is the failure's (1 on win32 via powershell.exe, 3 on linux).",
  },
  {
    case: '#50 batch no command',
    issueOrDecision: '#50',
    note: 'A batch usage error exits non-zero: exit 1.',
  },
  {
    case: '#51 batch argv quoting',
    issueOrDecision: '#51',
    note: "Tokens are quoted for the resolved shell: on win32 (powershell.exe) the child now runs with argv ['a b','x$y','q\"r'] instead of failing on cmd.exe-style quoting. Unchanged on linux.",
  },
  {
    case: '#51 script shell true',
    issueOrDecision: '#51',
    note: "shell: true is the OS default shell: on win32 the script runs under powershell.exe (debug line shell 'powershell.exe'; no cmd.exe PROMPT in the child env), on linux under /bin/bash. The alias hook's '[getdotenv:alias]' debug lines are gone (#49).",
  },
  {
    case: '#75 alias spawn failure',
    issueOrDecision: '#75',
    note: "Where the command can't spawn (linux: ENOENT), stderr is 'Error: Command failed with ENOENT: ...' and the exit code is 127, not process.exit(NaN)'s out-of-range error. Unchanged on win32, where cmd.exe reports the missing command (exit 1).",
  },
  {
    case: '#75 cmd spawn failure',
    issueOrDecision: '#75',
    note: "Where the command can't spawn (linux: ENOENT), stderr is 'Error: Command failed with ENOENT: ...'. Unchanged on win32, where cmd.exe reports the missing command.",
  },
  {
    case: 'D28 row 02',
    issueOrDecision: '#75',
    note: "--shell cmd names a shell linux doesn't have: the spawn failure now reports 'Error: Command failed with ENOENT: node probe.mjs hi' on stderr. Unchanged on win32.",
  },
  {
    case: 'D28 row 06',
    issueOrDecision: '#75',
    note: "--shell cmd names a shell linux doesn't have: the spawn failure now reports 'Error: Command failed with ENOENT: node probe.mjs hi' on stderr (and the debug exit line shows 127, not NaN). Unchanged on win32.",
  },
  {
    case: '#79 spaces collapsed',
    issueOrDecision: '#79',
    note: "The shell gets the command string untouched: the child's argv is '[x   y]' (three spaces kept).",
  },
  {
    case: '#79 backslash space',
    issueOrDecision: '#79',
    note: "The shell gets the command string untouched: the child's argv is '[a\\ b]' (the shell keeps a backslash inside double quotes).",
  },
  {
    case: '#88 case-only key difference',
    issueOrDecision: '#88',
    note: "The child env is not re-extended with process.env: on win32 the child's key is the dotenv casing Gdv_Case (value 'dotenv'), not the ambient GDV_CASE.",
  },
  {
    case: '#90 toString',
    issueOrDecision: '#90',
    note: "'toString' is not a script: it runs as typed, and the 'not recognized' error reaches stderr under capture (#74). The case now runs with the shell off (-S): with #90 fixed it really runs, and PowerShell's command-not-found lookup takes up to a minute on CI Windows runners.",
  },
  {
    case: '#90 constructor',
    issueOrDecision: '#90',
    note: "'constructor' is not a script: it runs as typed (shell off), and the 'not recognized' error reaches stderr under capture (#74).",
  },
  // S6b: follow-ups after S7
  {
    case: '#78 expansion',
    issueOrDecision: '#94',
    note: "Supersedes the #78 entry: a referenced value is substituted verbatim, never expanded again, so '$PW' with PW='a$$b' gives 'a$$b' and '$SELF' with SELF='$SELF' gives '$SELF'. '\\$A $A' still gives '$A x' and 'x$&y' is still spliced in unchanged (#78).",
  },
  // S8: diagnostics and AWS
  {
    case: '#46 redact-pattern',
    issueOrDecision: '#46',
    note: "--redact-pattern is read: the bag has redactPatterns ['SECRET'] instead of the unread Commander key redactPattern. (The variadic --trace still takes 'cmd node probe.mjs' as keys, so nothing runs and nothing is traced.)",
  },
  {
    case: '4.4 row 23',
    issueOrDecision: '#46',
    note: "--redact-pattern is read: the bag has redactPatterns ['a', 'b'] instead of the unread Commander key redactPattern.",
  },
  {
    case: '#46 log redact',
    issueOrDecision: '#46',
    note: "-l --redact on the host path is redacted: SECRET prints as '[redacted]', not 'plainsecret'.",
  },
  {
    case: '#46 entropy numbers',
    issueOrDecision: '#46',
    note: '--entropy-threshold 9 and --entropy-min-length 64 parse as numbers: the bag has 9 and 64, not the strings "9" and "64".',
  },
  {
    case: '#56 dotenv region overrides session',
    issueOrDecision: '#56',
    note: 'The session goes over the dotenv overlay in the forwarded env: AWS_REGION and AWS_DEFAULT_REGION are eu-west-3 (--region), not the dotenv us-east-1.',
  },
  {
    case: '#56 profile flag on aws child',
    issueOrDecision: '#56',
    note: "One resolution, with the aws flags: only the 9 flag-profile probes run (the second round, 9 dotenv-profile probes from afterResolve, is gone), and the child sees AWS_PROFILE and ctx.plugins.aws profile 'flag-profile', not 'dotenv-profile'.",
  },
  {
    case: '#69 aws forward bag',
    issueOrDecision: '#69',
    note: "The aws forward passes getDotenvCliOptions: the forwarded env gains it (the merged bag, whose git-status script is the 8.0 one, per the bag's field departure).",
  },
  {
    case: 'D28 row 03',
    issueOrDecision: '#69',
    note: "The aws forward passes getDotenvCliOptions: the forwarded env gains it (the merged bag, whose git-status script is the 8.0 one, per the bag's field departure).",
  },
  // S9: host identity
  ...[
    'help getdotenv',
    '#76 root help',
    '#81 help runs dynamic',
    '#60 visibility shell capture trace',
    '#60 visibility env debug',
    'help vc',
    '4.4 row 09',
    '4.4 row 11',
    '4.4 row 12',
  ].map((c): Departure => ({
    case: c,
    issueOrDecision: '#52',
    note: "Root help shows the host package's description: the corpus hosts are modules of the get-dotenv package, so it is get-dotenv's package.json description, not the hard-coded 'Base CLI.'. Nothing else in the help changes.",
  })),
  {
    case: '#87 second run',
    issueOrDecision: '#87',
    note: "The second run() works: brand() registers -V, --version once, so there is no 'Cannot add option' rejection and both runs record a child (git-status per the bag's field departure).",
  },
  // S10: editor
  {
    case: '#54 editor target',
    issueOrDecision: '#54',
    note: 'An existing target in any path beats a template in any path: b/.env.local is edited (Y=1, then X=1) and a/.env.local is not created from a/.env.local.template.',
  },
  {
    case: '#55 exports',
    issueOrDecision: '#55',
    note: 'buildDotenvTargetFilename and resolveDotenvTarget are exported from the package entry (both true).',
  },
  {
    case: '#66 no final newline',
    issueOrDecision: '#66',
    note: "A key appended to a file with no final newline goes on its own line: 'A=1' + B gives 'A=1\\nB=2' (still no final newline), not 'A=1B=2'.",
  },
  {
    case: '#67 sync adds nothing',
    issueOrDecision: '#67',
    note: "sync upserts (Decision 22): 'A=1\\nC=3\\n' with { A: '9', B: '2' } gives 'A=9\\nB=2\\n' (A updated, C removed, B appended), not 'A=9\\n'.",
  },
  {
    case: '#72 editor writers',
    issueOrDecision: '#72',
    note: `Values are written so dotenv reads them back exactly: B="x #y" (quoted for the #); C='a"b' (double quotes can't hold the ", so single quotes); P='C:\\new\\dir' (double quotes would expand the \\n, so single quotes).`,
  },
  {
    case: '#72 output path writer',
    issueOrDecision: '#72',
    note: `-o writes each value so dotenv reads it back exactly: H="x #y"; W=" lead"; M in single quotes (they hold the line break and the "); B=C:\\new\\dir bare (already exact).`,
  },
  // S12: normalization and parseAsync
  {
    case: '#62 invalid config -h',
    issueOrDecision: '#62',
    note: 'The error boundary covers top-level help: the config error prints one line on stderr with exit code 1; run() no longer rejects.',
  },
  {
    case: '#53 args-only argv',
    issueOrDecision: '#53',
    note: "An explicit runner argv is user arguments only: run(['-v', 'APP=hello', 'cmd', ...]) keeps -v APP=hello, so the child prints hello instead of losing the first two entries.",
  },
];
