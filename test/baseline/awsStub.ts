/**
 * AWS CLI stub for in-process baseline cases.
 *
 * The baseline test mocks `src/cliHost/exec` the way the aws plugin's own
 * tests do, routing every `runCommand`/`runCommandResult` call through
 * {@link interceptAws}. Calls whose command is the AWS CLI (`aws …`) are
 * recorded and answered here, so nothing ever reaches AWS or the network:
 * probes (`aws configure get|export-credentials`, `aws sso login`) report
 * failure, forwards report success. Every other command runs for real.
 */

/** One recorded AWS CLI call. */
export interface AwsCall {
  /** `result` for buffered probes, `run` for forwards and `sso login`. */
  kind: 'result' | 'run';
  /** The command as the plugin passed it. */
  command: string | string[];
  /** The shell setting as the plugin passed it. */
  shell: unknown;
  /** The env passed to the child (raw; redacted by the harness). */
  env?: NodeJS.ProcessEnv;
}

const calls: AwsCall[] = [];

const isAws = (command: string | readonly string[]) => {
  const first =
    typeof command === 'string' ? command.trim().split(/\s+/)[0] : command[0];
  return first === 'aws';
};

/**
 * Intercept an exec call.
 *
 * @param kind - Which exec function was called.
 * @param command - Command string or argv.
 * @param shell - Shell setting.
 * @param env - Child env, when given.
 * @returns The stubbed result for an AWS CLI call, or `undefined` to run the
 *   command for real.
 */
export const interceptAws = (
  kind: AwsCall['kind'],
  command: string | readonly string[],
  shell: unknown,
  env: NodeJS.ProcessEnv | undefined,
): { exitCode: number; stdout: string; stderr: string } | undefined => {
  if (!isAws(command)) return undefined;
  calls.push({
    kind,
    command: typeof command === 'string' ? command : [...command],
    shell,
    ...(env ? { env: { ...env } } : {}),
  });
  const isForward =
    kind === 'run' &&
    !(Array.isArray(command) && command[1] === 'sso' && command[2] === 'login');
  return isForward
    ? { exitCode: 0, stdout: '', stderr: '' }
    : { exitCode: 1, stdout: '', stderr: 'baseline aws stub' };
};

/**
 * Take (and clear) the AWS CLI calls recorded since the last take.
 *
 * @returns The recorded calls.
 */
export const takeAwsCalls = (): AwsCall[] => calls.splice(0, calls.length);
