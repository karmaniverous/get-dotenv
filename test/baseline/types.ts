/**
 * Types of the 7.0.11 behaviour baseline corpus.
 */
import type { HostName, Runner } from './hosts';

/** Where a case comes from: a spec table row, an issue, or help coverage. */
export type CaseSource =
  `4.4 row ${number}` | `D28 row ${number}` | `#${number}` | 'help';

/** Fields shared by every case. */
interface CaseBase {
  /** Unique, stable id (the baseline key). */
  id: string;
  /** Where the case comes from. */
  source: CaseSource;
  /** What the case shows, and how it differs from the source when it does. */
  note?: string;
  /**
   * Files to create in the case's temporary directory, on top of the default
   * fixture files; `null` removes a default file.
   */
  files?: Record<string, string | null>;
  /** Extra ambient environment for the case. */
  env?: Record<string, string>;
  /** Files whose content is recorded after the run. */
  readFiles?: string[];
  /** Record the directory tree after the run. */
  listFiles?: boolean;
}

/** A CLI invocation of a host. */
export interface CliCase extends CaseBase {
  kind: 'cli';
  /** Which baseline file the case belongs to. */
  group: 'getdotenv' | 'vc' | 'lib';
  /** A named host, or a factory for a custom host (in-process only). */
  host: HostName | (() => Runner);
  /** Arguments after the program name. */
  args: string[];
  /**
   * `inproc` (default) runs the host in the test process; `child` runs it as a
   * Node process (exit codes, real stdio, `process.exit`).
   */
  mode?: 'inproc' | 'child';
  /**
   * `full` (default) passes `['node', <alias>, ...args]` to the runner, as
   * the shipped entry does; `args` passes `args` alone.
   */
  argvForm?: 'full' | 'args';
  /** Number of times to call the same runner (default 1). */
  runs?: number;
}

/** A library-level case: any code, its result recorded. */
export interface LibCase extends CaseBase {
  kind: 'lib';
  /**
   * Run the case. The working directory is the case's temporary directory.
   *
   * @param dir - Absolute path of the case's temporary directory.
   * @returns A JSON-like result to record (or a promise of one).
   */
  run: (dir: string) => unknown;
}

/** Any case. */
export type BaselineCase = CliCase | LibCase;

/** A redacted env difference: keys kept, values hashed. */
export interface EnvDiff {
  added: Record<string, string>;
  changed: Record<string, string>;
  removed: string[];
}

/** A child process seen by the probe. */
export interface ProbeRecord {
  argv: string[];
  cwd: string;
  env: EnvDiff;
  getDotenvCliOptions: unknown;
}

/** A recorded AWS CLI call (stubbed). */
export interface AwsRecord {
  kind: 'result' | 'run';
  command: string | string[];
  shell: unknown;
  env?: EnvDiff;
  getDotenvCliOptions?: unknown;
}

/** The recorded outcome of one case. */
export interface CaseRecord {
  source: CaseSource;
  argv?: string[];
  mode?: 'inproc' | 'child';
  /** Exit code; a non-integer code (`NaN`) is recorded as a string. */
  exitCode: number | string | null;
  processExitCalled?: boolean;
  rejected?: string;
  result?: unknown;
  stdout: string;
  stderr: string;
  bag?: unknown;
  children?: ProbeRecord[];
  aws?: AwsRecord[];
  files?: Record<string, string | null>;
  tree?: string[];
}
