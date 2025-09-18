import { execa, execaCommand } from 'execa';

import { tokenize } from './tokenize';

const dbg = (...args: unknown[]) => {
  if (process.env.GETDOTENV_DEBUG) {
    // Use stderr to avoid interfering with stdout assertions

    console.error('[getdotenv:run]', ...args);
  }
};

export const runCommand = async (
  command: string,
  shell: string | boolean | URL,
  opts: { env?: NodeJS.ProcessEnv; stdio?: 'inherit' | 'pipe' },
): Promise<number> => {
  if (shell === false) {
    const tokens = tokenize(command);
    const file = tokens[0];
    if (!file) return 0;
    dbg('exec (plain)', { file, args: tokens.slice(1), stdio: opts.stdio });
    const result = await execa(file, tokens.slice(1), { ...opts });
    if (opts.stdio === 'pipe' && result.stdout) {
      process.stdout.write(
        result.stdout + (result.stdout.endsWith('\n') ? '' : '\n'),
      );
    }
    const exit = (result as { exitCode?: unknown } | undefined)?.exitCode;
    dbg('exit (plain)', { exitCode: exit });
    return typeof exit === 'number' ? exit : Number.NaN;
  } else {
    dbg('exec (shell)', {
      shell: typeof shell === 'string' ? shell : shell ? 'custom' : false,
      stdio: opts.stdio,
      command,
    });
    const result = await execaCommand(command, { shell, ...opts });
    if (opts.stdio === 'pipe' && result.stdout) {
      process.stdout.write(
        result.stdout + (result.stdout.endsWith('\n') ? '' : '\n'),
      );
    }
    const exit = (result as { exitCode?: unknown } | undefined)?.exitCode;
    dbg('exit (shell)', { exitCode: exit });
    return typeof exit === 'number' ? exit : Number.NaN;
  }
};
