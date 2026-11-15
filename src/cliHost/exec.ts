import { execa } from 'execa';

import { tokenize } from '@/src/util';

const dbg = (...args: unknown[]) => {
  if (process.env.GETDOTENV_DEBUG) {
    // Use stderr to avoid interfering with stdout assertions
    console.error('[getdotenv:run]', ...args);
  }
};

/**
 * Helper to decide whether to capture child stdio.
 * Checks GETDOTENV_STDIO env var or the provided bag capture flag.
 */
export const shouldCapture = (bagCapture?: boolean): boolean =>
  process.env.GETDOTENV_STDIO === 'pipe' || Boolean(bagCapture);

/**
 * Result object returned by {@link runCommandResult}.
 *
 * @public
 */
export interface RunCommandResult {
  /**
   * Exit code of the child process.
   *
   * Conventionally, `0` indicates success. A child that never ran (missing
   * command or cwd, timeout kill) reports 127 for ENOENT and 1 otherwise,
   * with `Error: <message>` in `stderr`.
   */
  exitCode: number;
  /**
   * Captured standard output (stdout) as UTF-8 text.
   */
  stdout: string;
  /**
   * Captured standard error (stderr) as UTF-8 text.
   */
  stderr: string;
}

/**
 * Options for runCommandResult (buffered execution).
 *
 * @public
 */
export interface RunCommandResultOptions {
  /**
   * Working directory for the child process.
   */
  cwd?: string | URL;
  /**
   * Environment variables for the child process. Undefined values are dropped.
   * When given, this is the child's complete environment: `process.env` is not
   * merged back in (build it with `buildSpawnEnv`).
   */
  env?: NodeJS.ProcessEnv;
  /**
   * Optional timeout (ms). Kills the child with SIGKILL on expiry.
   */
  timeoutMs?: number;
}

/**
 * Options for runCommand (execution with optional inherit/pipe).
 *
 * @public
 */
export interface RunCommandOptions {
  /**
   * Working directory for the child process.
   */
  cwd?: string | URL;
  /**
   * Environment variables for the child process. Undefined values are dropped.
   * When given, this is the child's complete environment: `process.env` is not
   * merged back in (build it with `buildSpawnEnv`).
   */
  env?: NodeJS.ProcessEnv;
  /**
   * Stdio strategy for the child process. `inherit` streams the child's
   * output; `pipe` buffers it and, after the child exits, writes its stdout
   * to stdout and its stderr to stderr.
   */
  stdio?: 'inherit' | 'pipe';
}

interface ExecNormalizedOptions
  extends RunCommandOptions, RunCommandResultOptions {}

// Strip repeated symmetric outer quotes (single or double) until stable.
// This is safe for argv arrays passed to execa (no quoting needed) and avoids
// passing quote characters through to Node (e.g., for `node -e "<code>"`).
// Handles stacked quotes from shells like PowerShell: """code""" -> code.
// Shell-quote a single token for safe interpolation when joining an argv
// array into a command string destined for a shell.  On Windows (cmd.exe)
// wrap in double quotes when the token contains shell metacharacters; on
// Unix wrap in single quotes with escaped embedded singles.
const shellQuoteToken = (s: string): string => {
  if (process.platform === 'win32') {
    // cmd.exe: double-quote tokens with special chars.  Inner double
    // quotes are escaped with backslash (Node/libuv convention).
    if (/[\s"'&|<>^()!%+,;=]/.test(s)) {
      return '"' + s.replace(/"/g, '\\"') + '"';
    }
    return s;
  }
  // POSIX: single-quote tokens with special chars.  Embedded single
  // quotes break out, add an escaped single, and re-enter.
  if (/[\s"'&|<>()!$\\`~#;{}[\]*?+]/.test(s)) {
    return "'" + s.replace(/'/g, "'\\''") + "'";
  }
  return s;
};

const stripOuterQuotes = (s: string): string => {
  let out = s;
  // Repeatedly trim only when the entire string is wrapped in matching quotes.
  // Stop as soon as the ends are asymmetric or no quotes remain.
  while (out.length >= 2) {
    const a = out.charAt(0);
    const b = out.charAt(out.length - 1);
    const symmetric = (a === '"' && b === '"') || (a === "'" && b === "'");
    if (!symmetric) break;
    out = out.slice(1, -1);
  }
  return out;
};

/** An execution outcome; `failure` is set when the child never ran. */
interface ExecOutcome extends RunCommandResult {
  /** `Error: <message>` for a spawn failure, also appended to `stderr`. */
  failure?: string;
}

/**
 * Extract exitCode/stdout/stderr from an execa result or error.
 *
 * An error with no exit code means the child never ran (missing command or
 * cwd, a timeout kill). It becomes exit code 127 for ENOENT and 1 otherwise,
 * with `Error: <message>` as the failure (#75), never NaN.
 */
const pickResult = (r: unknown): ExecOutcome => {
  const { exitCode, stdout, stderr, code, shortMessage, message } = r as {
    exitCode?: unknown;
    stdout?: unknown;
    stderr?: unknown;
    code?: unknown;
    shortMessage?: unknown;
    message?: unknown;
  };
  const out = typeof stdout === 'string' ? stdout : '';
  const err = typeof stderr === 'string' ? stderr : '';
  if (typeof exitCode === 'number') {
    return { exitCode, stdout: out, stderr: err };
  }
  const reason =
    typeof shortMessage === 'string'
      ? shortMessage
      : typeof message === 'string'
        ? message
        : 'the command could not be started';
  const failure = `Error: ${reason}`;
  return {
    exitCode: code === 'ENOENT' ? 127 : 1,
    stdout: out,
    stderr: err ? `${err}\n${failure}` : failure,
    failure,
  };
};

// Convert NodeJS.ProcessEnv (string | undefined values) to the shape execa
// expects (Readonly<Partial<Record<string, string>>>), dropping undefineds.
const sanitizeEnv = (
  env?: NodeJS.ProcessEnv,
): Readonly<Partial<Record<string, string>>> | undefined => {
  if (!env) return undefined;
  const entries = Object.entries(env).filter(
    (e): e is [string, string] => typeof e[1] === 'string',
  );
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
};

/**
 * Core executor that normalizes shell/plain forms and capture/inherit modes.
 * Returns captured buffers; callers may stream stdout when desired.
 */
async function _execNormalized(
  command: string | readonly string[],
  shell: string | boolean | URL,
  opts: ExecNormalizedOptions = {},
): Promise<ExecOutcome> {
  const envSan = sanitizeEnv(opts.env);
  // The supplied env is the child's complete env (#88): execa must not merge
  // process.env back in, or an ambient key that differs only in case wins
  // on Windows and a key removed from the env comes back.
  const envBits =
    envSan !== undefined ? { env: envSan, extendEnv: false as const } : {};
  const timeoutBits =
    typeof opts.timeoutMs === 'number'
      ? { timeout: opts.timeoutMs, killSignal: 'SIGKILL' as const }
      : {};
  const stdio = opts.stdio ?? 'pipe';

  if (shell === false) {
    let file: string | undefined;
    let args: string[];
    if (typeof command === 'string') {
      const tokens = tokenize(command);
      file = tokens[0];
      args = tokens.slice(1);
    } else {
      file = command[0];
      args = command.slice(1).map(stripOuterQuotes);
    }
    if (!file) return { exitCode: 0, stdout: '', stderr: '' };

    dbg('exec (plain)', { file, args, stdio });
    try {
      const ok = pickResult(
        await execa(file, args, {
          ...(opts.cwd !== undefined ? { cwd: opts.cwd } : {}),
          ...envBits,
          stdio,
          ...timeoutBits,
        }),
      );
      dbg('exit (plain)', { exitCode: ok.exitCode });
      return ok;
    } catch (e: unknown) {
      const out = pickResult(e);
      dbg('exit:error (plain)', { exitCode: out.exitCode });
      return out;
    }
  }

  // Shell path (string|true|URL): build a single command string for the
  // target shell.  When the command is an array we shell-quote each token
  // individually before joining so that metacharacters (spaces, quotes, +,
  // parentheses, etc.) survive the round-trip through cmd.exe / sh.
  const commandStr: string =
    typeof command === 'string'
      ? command
      : command.map(shellQuoteToken).join(' ');
  dbg('exec (shell)', {
    command: commandStr,
    shell: typeof shell === 'string' ? shell : 'custom',
    stdio,
  });
  // The shell gets the command string as is (#79): no re-splitting, so runs
  // of spaces and backslash escapes reach it unchanged.
  if (commandStr.trim() === '') return { exitCode: 0, stdout: '', stderr: '' };
  try {
    const ok = pickResult(
      await execa(commandStr, {
        shell,
        ...(opts.cwd !== undefined ? { cwd: opts.cwd } : {}),
        ...envBits,
        stdio,
        ...timeoutBits,
      }),
    );
    dbg('exit (shell)', { exitCode: ok.exitCode });
    return ok;
  } catch (e: unknown) {
    const out = pickResult(e);
    dbg('exit:error (shell)', { exitCode: out.exitCode });
    return out;
  }
}

/**
 * Execute a command and capture stdout/stderr (buffered).
 * - Preserves plain vs shell behavior and argv/string normalization.
 * - Never re-emits stdout/stderr to parent; returns captured buffers.
 * - Supports optional timeout (ms).
 */
export function runCommandResult(
  command: readonly string[],
  shell: false,
  opts?: RunCommandResultOptions,
): Promise<RunCommandResult>;
/**
 * Execute a command and capture stdout/stderr (buffered).
 *
 * @param command - Command string (shell) or argv array (shell-off supported).
 * @param shell - Shell setting (false for plain execution).
 * @param opts - Execution options (cwd/env/timeout).
 * @returns A promise resolving to the captured result.
 */
export function runCommandResult(
  command: string | readonly string[],
  shell: string | boolean | URL,
  opts?: RunCommandResultOptions,
): Promise<RunCommandResult>;
/**
 * Execute a command and capture stdout/stderr (buffered).
 *
 * @param command - Command string (shell) or argv array (shell-off supported).
 * @param shell - Shell setting (false for plain execution).
 * @param opts - Execution options (cwd/env/timeout).
 * @returns A promise resolving to the captured result.
 */
export async function runCommandResult(
  command: string | readonly string[],
  shell: string | boolean | URL,
  opts: RunCommandResultOptions = {},
): Promise<RunCommandResult> {
  // Build opts without injecting undefined (exactOptionalPropertyTypes-safe)
  const coreOpts: {
    stdio: 'pipe';
    cwd?: string | URL;
    env?: NodeJS.ProcessEnv;
    timeoutMs?: number;
  } = { stdio: 'pipe' };
  if (opts.cwd !== undefined) {
    coreOpts.cwd = opts.cwd;
  }
  if (opts.env !== undefined) {
    coreOpts.env = opts.env;
  }
  if (opts.timeoutMs !== undefined) {
    coreOpts.timeoutMs = opts.timeoutMs;
  }

  const { exitCode, stdout, stderr } = await _execNormalized(
    command,
    shell,
    coreOpts,
  );
  return { exitCode, stdout, stderr };
}

// Write captured child output, ending it with a newline.
const writeBuffered = (stream: NodeJS.WriteStream, text: string): void => {
  if (text) stream.write(text + (text.endsWith('\n') ? '' : '\n'));
};

/**
 * Execute a command and return its exit code.
 *
 * @param command - Command string (shell) or argv array (shell-off supported).
 * @param shell - Shell setting (false for plain execution).
 * @param opts - Execution options (cwd/env/stdio).
 * @returns A promise resolving to the process exit code. When the child
 * never ran, `Error: <message>` is written to stderr and the code is 127
 * for ENOENT, else 1.
 */
export function runCommand(
  command: readonly string[],
  shell: false,
  opts: RunCommandOptions,
): Promise<number>;
/**
 * Execute a command and return its exit code.
 *
 * @param command - Command string (shell) or argv array (shell-off supported).
 * @param shell - Shell setting (false for plain execution).
 * @param opts - Execution options (cwd/env/stdio).
 * @returns A promise resolving to the process exit code. When the child
 * never ran, `Error: <message>` is written to stderr and the code is 127
 * for ENOENT, else 1.
 */
export function runCommand(
  command: string | readonly string[],
  shell: string | boolean | URL,
  opts: RunCommandOptions,
): Promise<number>;
/**
 * Execute a command and return its exit code.
 *
 * @param command - Command string (shell) or argv array (shell-off supported).
 * @param shell - Shell setting (false for plain execution).
 * @param opts - Execution options (cwd/env/stdio).
 * @returns A promise resolving to the process exit code. When the child
 * never ran, `Error: <message>` is written to stderr and the code is 127
 * for ENOENT, else 1.
 */
export async function runCommand(
  command: string | readonly string[],
  shell: string | boolean | URL,
  opts: RunCommandOptions,
): Promise<number> {
  // Build opts without injecting undefined (exactOptionalPropertyTypes-safe)
  const callOpts: RunCommandOptions = {};
  if (opts.cwd !== undefined) {
    callOpts.cwd = opts.cwd;
  }
  if (opts.env !== undefined) {
    callOpts.env = opts.env;
  }
  if (opts.stdio !== undefined) callOpts.stdio = opts.stdio;
  const ok = await _execNormalized(command, shell, callOpts);
  if (opts.stdio === 'pipe') {
    // Re-emit the buffered output after the child exits: stdout to stdout,
    // stderr to stderr.
    writeBuffered(process.stdout, ok.stdout);
    writeBuffered(process.stderr, ok.stderr);
  } else if (ok.failure !== undefined) {
    // A child that never ran printed nothing: report why (#75).
    writeBuffered(process.stderr, ok.failure);
  }
  return ok.exitCode;
}
