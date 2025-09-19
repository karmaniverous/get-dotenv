import { execa, execaCommand } from 'execa';

import { tokenize } from '../plugins/cmd/tokenize';

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

export const runCommand = async (
  command: string | string[],
  shell: string | boolean | URL,
  opts: {
    cwd?: string | URL;
    env?: NodeJS.ProcessEnv;
    stdio?: 'inherit' | 'pipe';
  },
): Promise<number> => {
  if (shell === false) {
    let file: string | undefined;
    let args: string[] = [];
    if (Array.isArray(command)) {
      file = command[0];
      args = command.slice(1).map(stripOuterQuotes);
    } else {
      const tokens = tokenize(command);
      file = tokens[0];
      args = tokens.slice(1);
    }
    if (!file) return 0;
    dbg('exec (plain)', { file, args, stdio: opts.stdio });
    // Build options without injecting undefined properties (exactOptionalPropertyTypes).
    const envSan = sanitizeEnv(opts.env);
    const plainOpts: {
      cwd?: string | URL;
      env?: Readonly<Partial<Record<string, string>>>;
      stdio?: 'inherit' | 'pipe';
    } = {};
    if (opts.cwd !== undefined) plainOpts.cwd = opts.cwd;
    if (envSan !== undefined) plainOpts.env = envSan;
    if (opts.stdio !== undefined) plainOpts.stdio = opts.stdio;

    const result = await execa(
      file,
      args,
      plainOpts as {
        cwd?: string | URL;
        env?: Readonly<Partial<Record<string, string>>>;
        stdio?: 'inherit' | 'pipe';
      },
    );
    if (opts.stdio === 'pipe' && result.stdout) {
      process.stdout.write(
        result.stdout + (result.stdout.endsWith('\n') ? '' : '\n'),
      );
    }
    const exit = (result as { exitCode?: unknown } | undefined)?.exitCode;
    dbg('exit (plain)', { exitCode: exit });
    return typeof exit === 'number' ? exit : Number.NaN;
  } else {
    const commandStr = Array.isArray(command) ? command.join(' ') : command;
    dbg('exec (shell)', {
      shell: typeof shell === 'string' ? shell : 'custom',
      stdio: opts.stdio,
      command: commandStr,
    });
    const envSan = sanitizeEnv(opts.env);
    const shellOpts: {
      cwd?: string | URL;
      shell: string | boolean | URL;
      env?: Readonly<Partial<Record<string, string>>>;
      stdio?: 'inherit' | 'pipe';
    } = { shell };
    if (opts.cwd !== undefined) shellOpts.cwd = opts.cwd;
    if (envSan !== undefined) shellOpts.env = envSan;
    if (opts.stdio !== undefined) shellOpts.stdio = opts.stdio;

    const result = await execaCommand(
      commandStr,
      shellOpts as {
        cwd?: string | URL;
        shell: string | boolean | URL;
        env?: Readonly<Partial<Record<string, string>>>;
        stdio?: 'inherit' | 'pipe';
      },
    );
    const out = (result as { stdout?: string } | undefined)?.stdout;
    if (opts.stdio === 'pipe' && out) {
      process.stdout.write(out + (out.endsWith('\n') ? '' : '\n'));
    }
    const exit = (result as { exitCode?: unknown } | undefined)?.exitCode;
    dbg('exit (shell)', { exitCode: exit });
    return typeof exit === 'number' ? exit : Number.NaN;
  }
};
