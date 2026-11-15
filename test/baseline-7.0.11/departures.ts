/**
 * Listed departures from the 7.0.11 behaviour baseline.
 *
 * The baseline test fails on any case whose output differs from the stored
 * 7.0.11 output, unless the case is listed here. Every entry names the issue
 * (`#NN`) or spec decision (`DNN`) that changes the behaviour. The baseline
 * itself is never re-recorded to make a test pass.
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
    case: '#56 profile flag on aws child',
    issueOrDecision: '#57',
    note: "The case drives the removed demo 'aws whoami really': whoami now rejects 'really' (exit 1). The aws session probes with --profile flag-profile are unchanged.",
  },
  {
    case: '#84 aws child help resolves session',
    issueOrDecision: '#57',
    note: "The case asks for help on the removed demo 'aws whoami really': it now shows whoami's own help.",
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
    note: "'toString' is not a script: it runs as typed through the shell, whose 'not recognized' error reaches stderr under capture (#74).",
  },
  {
    case: '#90 constructor',
    issueOrDecision: '#90',
    note: "'constructor' is not a script: it runs as typed (shell off), and the 'not recognized' error reaches stderr under capture (#74).",
  },
];
