import { execa, execaCommand } from 'execa';

import { tokenize } from './tokenize';

export const runCommand = async (
  command: string,
  shell: string | boolean | URL,
  opts: { env?: NodeJS.ProcessEnv; stdio?: 'inherit' | 'pipe' },
): Promise<number> => {
  if (shell === false) {
    const tokens = tokenize(command);
    const file = tokens[0];
    if (!file) return 0;
    const result = await execa(file, tokens.slice(1), { ...opts });
    if (opts.stdio === 'pipe' && result.stdout) {
      process.stdout.write(
        result.stdout + (result.stdout.endsWith('\n') ? '' : '\n'),
      );
    }
    const exit = (result as { exitCode?: unknown } | undefined)?.exitCode;
    return typeof exit === 'number' ? exit : Number.NaN;
  } else {
    const result = await execaCommand(command, { shell, ...opts });
    if (opts.stdio === 'pipe' && result.stdout) {
      process.stdout.write(
        result.stdout + (result.stdout.endsWith('\n') ? '' : '\n'),
      );
    }
    const exit = (result as { exitCode?: unknown } | undefined)?.exitCode;
    return typeof exit === 'number' ? exit : Number.NaN;
  }
};
