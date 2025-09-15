import { type Scripts } from './GetDotenvCliOptions';

export const resolveCommand = (
  scripts: Scripts | undefined,
  command: string,
) =>
  scripts && typeof scripts[command] === 'object' && scripts[command] !== null
    ? (scripts[command] as { cmd: string }).cmd
    : ((scripts?.[command] as string | undefined) ?? command);

export const resolveShell = (
  scripts: Scripts | undefined,
  command: string,
  shell: string | boolean | undefined,
): string | boolean | URL =>
  scripts && typeof scripts[command] === 'object' && scripts[command] !== null
    ? ((scripts[command] as Exclude<Scripts[string], string>).shell ?? false)
    : (shell ?? false);
