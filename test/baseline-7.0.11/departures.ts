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
    case: '#89 vars expanded twice',
    issueOrDecision: '#45',
    note: 'The case passes -P, which now takes effect: the bag has loadProcess false. The #89 output is unchanged.',
  },
];
