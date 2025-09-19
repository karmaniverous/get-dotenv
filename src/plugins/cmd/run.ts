import { execa, execaCommand } from 'execa';

import { tokenize } from './tokenize';

const dbg = (...args: unknown[]) => {
  if (process.env.GETDOTENV_DEBUG) {
    // Use stderr to avoid interfering with stdout assertions

    console.error('[getdotenv:run]', ...args);
  }
};

// Strip a single pair of surrounding quotes (single or double) if present.
// This is safe for argv arrays passed to execa (no quoting needed) and avoids
// passing quote characters through to Node (e.g., for `node -e "<code>"`).
const stripOuterQuotes = (s: string): string => {
  if (s.length >= 2) {
    const a = s.charAt(0);
    const b = s.charAt(s.length - 1);
    if ((a === '"' && b === '"') || (a === "'" && b === "'"))
      return s.slice(1, -1);
  }
  return s;
};

export const runCommand = async (
  command: string | string[],
  shell: string | boolean | URL,
  opts: { env?: NodeJS.ProcessEnv; stdio?: 'inherit' | 'pipe' },
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
    const result = await execa(file, args, { ...opts });
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
    const result = await execaCommand(commandStr, { shell, ...opts });
    const out = (result as { stdout?: string } | undefined)?.stdout;
    if (opts.stdio === 'pipe' && out) {
      process.stdout.write(out + (out.endsWith('\n') ? '' : '\n'));
    }
    const exit = (result as { exitCode?: unknown } | undefined)?.exitCode;
    dbg('exit (shell)', { exitCode: exit });
    return typeof exit === 'number' ? exit : Number.NaN;
  }
};
