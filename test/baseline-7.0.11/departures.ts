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
];
