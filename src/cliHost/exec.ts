import { execa, execaCommand } from 'execa';

import { tokenize } from '@/src/util';

const dbg = (...args: unknown[]) => {
  if (process.env.GETDOTENV_DEBUG) {
    // Use stderr to avoid interfering with stdout assertions
    console.error('[getdotenv:run]', ...args);
  }
};

// Strip repeated symmetric outer quotes (single or double) until stable.
// This is safe for argv arrays passed to execa (no quoting needed) and avoids
// passing quote characters through to Node (e.g., for `node -e "<code>"`).
// Handles stacked quotes from shells like PowerShell: """code""" -> code.
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

// Extract exitCode/stdout/stderr from execa result or error in a tolerant way.
const pickResult = (
  r: unknown,
): { exitCode: number; stdout: string; stderr: string } => {
  const exit = (r as { exitCode?: unknown }).exitCode;
  const stdoutVal = (r as { stdout?: unknown }).stdout;
  const stderrVal = (r as { stderr?: unknown }).stderr;
  return {
    exitCode: typeof exit === 'number' ? exit : Number.NaN,
    stdout: typeof stdoutVal === 'string' ? stdoutVal : '',
    stderr: typeof stderrVal === 'string' ? stderrVal : '',
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
  opts: {
    cwd?: string | URL;
    env?: NodeJS.ProcessEnv;
    stdio?: 'inherit' | 'pipe';
    timeoutMs?: number;
  } = {},
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const envSan = sanitizeEnv(opts.env);
  const timeoutBits =
    typeof opts.timeoutMs === 'number'
      ? { timeout: opts.timeoutMs, killSignal: 'SIGKILL' as const }
      : {};
  const stdio = opts.stdio ?? 'pipe';

  if (shell === false) {
    let file: string | undefined;
    let args: string[] = [];
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
        (await execa(file, args, {
          ...(opts.cwd !== undefined ? { cwd: opts.cwd } : {}),
          ...(envSan !== undefined ? { env: envSan } : {}),
          stdio,
          ...timeoutBits,
        })) as unknown,
      );
      dbg('exit (plain)', { exitCode: ok.exitCode });
      return ok;
    } catch (e: unknown) {
      const out = pickResult(e);
      dbg('exit:error (plain)', { exitCode: out.exitCode });
      return out;
    }
  }

  // Shell path (string|true|URL): execaCommand handles shell resolution.
  const commandStr: string =
    typeof command === 'string' ? command : command.join(' ');
  dbg('exec (shell)', {
    command: commandStr,
    shell: typeof shell === 'string' ? shell : 'custom',
    stdio,
  });
  try {
    const ok = pickResult(
      (await execaCommand(commandStr, {
        shell,
        ...(opts.cwd !== undefined ? { cwd: opts.cwd } : {}),
        ...(envSan !== undefined ? { env: envSan } : {}),
        stdio,
        ...timeoutBits,
      })) as unknown,
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
  opts?: {
    cwd?: string | URL;
    env?: NodeJS.ProcessEnv;
    timeoutMs?: number;
  },
): Promise<{ exitCode: number; stdout: string; stderr: string }>;
export function runCommandResult(
  command: string | readonly string[],
  shell: string | boolean | URL,
  opts?: {
    cwd?: string | URL;
    env?: NodeJS.ProcessEnv;
    timeoutMs?: number;
  },
): Promise<{ exitCode: number; stdout: string; stderr: string }>;
export async function runCommandResult(
  command: string | readonly string[],
  shell: string | boolean | URL,
  opts: {
    cwd?: string | URL;
    env?: NodeJS.ProcessEnv;
    timeoutMs?: number;
  } = {},
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
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

  return _execNormalized(command, shell, coreOpts);
}

export function runCommand(
  command: readonly string[],
  shell: false,
  opts: {
    cwd?: string | URL;
    env?: NodeJS.ProcessEnv;
    stdio?: 'inherit' | 'pipe';
  },
): Promise<number>;
export function runCommand(
  command: string | readonly string[],
  shell: string | boolean | URL,
  opts: {
    cwd?: string | URL;
    env?: NodeJS.ProcessEnv;
    stdio?: 'inherit' | 'pipe';
  },
): Promise<number>;
export async function runCommand(
  command: string | readonly string[],
  shell: string | boolean | URL,
  opts: {
    cwd?: string | URL;
    env?: NodeJS.ProcessEnv;
    stdio?: 'inherit' | 'pipe';
  },
): Promise<number> {
  // Build opts without injecting undefined (exactOptionalPropertyTypes-safe)
  const callOpts: {
    cwd?: string | URL;
    env?: NodeJS.ProcessEnv;
    stdio?: 'inherit' | 'pipe';
  } = {};
  if (opts.cwd !== undefined) {
    callOpts.cwd = opts.cwd;
  }
  if (opts.env !== undefined) {
    callOpts.env = opts.env;
  }
  if (opts.stdio !== undefined) callOpts.stdio = opts.stdio;
  const ok = await _execNormalized(command, shell, callOpts);
  if (opts.stdio === 'pipe' && ok.stdout) {
    process.stdout.write(ok.stdout + (ok.stdout.endsWith('\n') ? '' : '\n'));
  }
  return typeof ok.exitCode === 'number' ? ok.exitCode : Number.NaN;
}
