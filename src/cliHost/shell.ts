/**
 * Shell settings: the OS default shell and per-shell argv quoting.
 */
import path from 'node:path';

/**
 * The OS default shell: `powershell.exe` on Windows, `/bin/bash` elsewhere.
 * `shell: true` means this shell wherever it is set.
 *
 * @returns The default shell for this platform.
 */
export const osDefaultShell = (): string =>
  process.platform === 'win32' ? 'powershell.exe' : '/bin/bash';

/** Shell families whose quoting rules differ. */
type ShellKind = 'posix' | 'cmd' | 'powershell' | 'pwsh';

// Which quoting rules a shell needs, from its executable name.
const shellKind = (shell: string | URL): ShellKind => {
  const file = shell instanceof URL ? shell.pathname : shell;
  const name = path.win32
    .basename(file)
    .toLowerCase()
    .replace(/\.exe$/, '');
  if (name === 'cmd') return 'cmd';
  if (name === 'powershell') return 'powershell';
  if (name === 'pwsh') return 'pwsh';
  return 'posix';
};

/**
 * Quote one argument so the given shell passes it to the command intact.
 *
 * - POSIX shells: single quotes; an embedded `'` becomes `'\''`.
 * - `cmd.exe`: double quotes; an embedded `"` becomes `\"`.
 * - PowerShell (`powershell.exe`, `pwsh`): single quotes; an embedded `'` is
 *   doubled. Windows PowerShell 5.1 hands a native command its argument
 *   text without escaping embedded double quotes, so for `powershell.exe` the
 *   argument text is escaped for the command's own argv parser.
 *
 * An argument with nothing the shell would read is returned as is. An empty
 * argument is kept: `''` (POSIX, `pwsh`), `""` (`cmd.exe`), or `'""'` for
 * `powershell.exe`, which drops an empty native argument.
 *
 * @param arg - One argument.
 * @param shell - The shell (a path or name, or a file URL).
 * @returns The argument, quoted when needed.
 */
export const quoteForShell = (arg: string, shell: string | URL): string => {
  const kind = shellKind(shell);
  if (arg === '') return EMPTY_ARGUMENT[kind];
  switch (kind) {
    case 'cmd':
      return /[\s"'&|<>^()!%+,;=]/.test(arg)
        ? `"${arg.replace(/"/g, '\\"')}"`
        : arg;
    case 'powershell':
      return quotePowerShell(arg, powerShell51Argument(arg));
    case 'pwsh':
      return quotePowerShell(arg, arg);
    default:
      return /[\s"'&|<>()!$\\`~#;{}[\]*?+]/.test(arg)
        ? `'${arg.replace(/'/g, "'\\''")}'`
        : arg;
  }
};

// An empty argument per shell kind (review 5916926264 #3).
const EMPTY_ARGUMENT: Record<ShellKind, string> = {
  posix: "''",
  cmd: '""',
  pwsh: "''",
  powershell: `'""'`,
};

// PowerShell single quotes, applied when the argument holds anything but word
// characters and `-./:=+%\`; `text` is what goes inside the quotes.
const quotePowerShell = (arg: string, text: string): string =>
  /[^\w\-./:=+%\\]/.test(arg) ? `'${text.replace(/'/g, "''")}'` : arg;

// Windows PowerShell 5.1 passes an argument's text to a native command as is,
// adding outer double quotes only when it sees whitespace after an even
// number of quote characters. Pre-quote an argument with whitespace (an
// embedded `"` becomes `""`, keeping the count odd) and escape a bare
// argument's quotes as `\"`, doubling backslashes that precede a quote.
const powerShell51Argument = (arg: string): string =>
  /\s/.test(arg)
    ? `"${arg.replace(/(\\*)"/g, '$1$1""').replace(/(\\+)$/, '$1$1')}"`
    : arg.replace(/(\\*)"/g, '$1$1\\"');

/**
 * Join an argv array into one command string for the given shell, each
 * argument quoted by {@link quoteForShell}. PowerShell runs a quoted command
 * name only through the call operator, so a command name that needs quotes
 * is single-quoted and prefixed with `& `.
 *
 * @param argv - Command and arguments.
 * @param shell - The shell (a path or name, or a file URL).
 * @returns The command string.
 */
export const joinForShell = (
  argv: readonly string[],
  shell: string | URL,
): string => {
  const [file, ...args] = argv;
  if (file === undefined) return '';
  const kind = shellKind(shell);
  let head = quoteForShell(file, shell);
  if (kind === 'powershell' || kind === 'pwsh') {
    const quoted = quotePowerShell(file, file);
    head = quoted === file ? file : `& ${quoted}`;
  }
  return [head, ...args.map((arg) => quoteForShell(arg, shell))].join(' ');
};
