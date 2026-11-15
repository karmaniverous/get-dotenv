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
];
