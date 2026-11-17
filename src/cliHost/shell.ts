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
 * - POSIX shells: single quotes; an embedded `'` becomes `'\''`. An argument
 *   with nothing the shell would read is returned as is.
 * - `cmd.exe`: every argument is escaped for the command's argv parser
 *   (the MSVCRT / `CommandLineToArgvW` rules: wrapped in `"`, an embedded
 *   `"` becomes `\"`, and the backslashes before a `"` or the end double),
 *   then every cmd.exe metacharacter, the quotes included, gets a `^`. This
 *   is cross-spawn's `escapeArgument` (`lib/util/escape.js`), after
 *   {@link https://qntm.org/cmd | qntm.org/cmd}. cmd.exe expands `%name%`
 *   before it reads carets, so a caret can't stop it: an escaped `%PATH%`
 *   leaves the name `PATH^`, which no ordinary variable has, but
 *   `%name:old=new%` and `%name:~n,m%` act on `name` alone. The argument
 *   (or argv) throws where such an edit could expand (two `%` enclosing a
 *   `:` with no caret before it), and for a line break, which ends a
 *   cmd.exe command. A command name is bare when plain, else in real
 *   quotes, and throws if it holds `"`, `%` or a line break. Not covered: a
 *   variable whose name contains `^`; `!name!` when delayed expansion is
 *   turned on in the registry (off by default); and a batch file (`.cmd`,
 *   `.bat`), which parses its arguments again.
 * - PowerShell (`powershell.exe`, `pwsh` 7.3 or later): every argument is a
 *   single-quoted string, so PowerShell reads nothing in it. Each character
 *   PowerShell takes as a single quote (`'` and the curly quotes U+2018 to
 *   U+201B) is doubled. The argument `--%` is passed as `@('--%')`:
 *   PowerShell takes any argument whose value is `--%`, quoted or not, as
 *   its stop-parsing marker, and an array holding it is passed as text.
 *   Windows PowerShell 5.1 hands a native command its argument text without
 *   escaping embedded double quotes, so for `powershell.exe` the argument
 *   text is first escaped for the command's own argv parser.
 *
 * An empty argument is kept: `''` (POSIX, `pwsh`), `""` (`cmd.exe`), or
 * `'""'` for `powershell.exe`, which drops an empty native argument.
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
      return assertNoCmdVariableEdit(quoteCmd(arg));
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

// Every character PowerShell takes as a single quote: a single-quoted string
// ends at any of them unless it is doubled (review 5916926264 #1).
const POWERSHELL_SINGLE_QUOTES = /['\u2018-\u201B]/g;

// A PowerShell single-quoted string holding `text` literally.
const powerShellLiteral = (text: string): string =>
  `'${text.replace(POWERSHELL_SINGLE_QUOTES, '$&$&')}'`;

// One PowerShell argument; `text` is what goes inside the quotes. The value
// `--%` turns on stop-parsing even when quoted (PowerShell's
// NativeCommandParameterBinder compares the value), so it goes as an array.
const quotePowerShell = (arg: string, text: string): string =>
  arg === '--%' ? "@('--%')" : powerShellLiteral(text);

// cmd.exe metacharacters, each escaped with `^` (cross-spawn's
// `lib/util/escape.js`).
const CMD_METACHARACTERS = /([()\][%!^"`<>&|;, *?])/g;

// An argument for the MSVCRT / CommandLineToArgvW parser: in quotes, a `"`
// as `\"`, and each run of backslashes doubled before a `"` or the end.
// Backslashes anywhere else are literal. A linear scan, no backtracking.
const argvQuote = (arg: string): string => {
  let out = '"';
  let slashes = 0;
  for (const ch of arg) {
    if (ch === '\\') {
      slashes += 1;
      continue;
    }
    out +=
      ch === '"'
        ? '\\'.repeat(slashes * 2 + 1) + '"'
        : '\\'.repeat(slashes) + ch;
    slashes = 0;
  }
  return `${out}${'\\'.repeat(slashes * 2)}"`;
};

// The error for a token cmd.exe can't carry. It names the problem, never
// the token, which may hold a secret.
const cmdError = (problem: string): Error =>
  new Error(
    `cmd.exe can't pass this argv safely: ${problem}. Run it with shell: false or another shell.`,
  );

// One cmd.exe argument (review 5916926264 #2).
const quoteCmd = (arg: string): string => {
  if (/[\r\n]/.test(arg)) throw cmdError('an argument contains a line break');
  return argvQuote(arg).replace(CMD_METACHARACTERS, '^$1');
};

// cmd.exe expands `%...%` before it reads carets. Every escaped `%` is
// `^%`, so the text between two `%` ends in `^` and names no ordinary
// variable, unless it holds `:`, which makes it `%name:old=new%` or
// `%name:~n,m%` acting on the name before the `:`. That name is safe only
// when it holds a caret (any escaped metacharacter, space or token
// boundary). Checked across the whole command: a pair can span tokens.
const assertNoCmdVariableEdit = (line: string): string => {
  const parts = line.split('%');
  const edits = parts.slice(1, -1).some((between) => {
    const colon = between.indexOf(':');
    return colon >= 0 && !between.slice(0, colon).includes('^');
  });
  if (edits) throw cmdError('a %name:...% variable edit would expand');
  return line;
};

// A cmd.exe command name: bare when plain, else in real quotes (a caret-
// quoted name with a space doesn't run). Inside real quotes a caret is
// literal, so a `"`, `%` or line break can't be escaped there.
const quoteCmdCommand = (file: string): string => {
  if (/^[\w\-.:\\/]+$/.test(file)) return file;
  if (/["%\r\n]/.test(file))
    throw cmdError('the command path contains ", % or a line break');
  return `"${file}"`;
};

// A PowerShell command name that can stand bare; any other runs through the
// call operator.
const POWERSHELL_BARE_COMMAND = /^[\w./:\\][\w\-./:\\]*$/;

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
 * name only through the call operator, so a command name that is not plain
 * (word characters and `-./:\`) is single-quoted and prefixed with `& `.
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
  if (kind === 'cmd')
    return assertNoCmdVariableEdit(
      [
        quoteCmdCommand(file),
        ...args.map((arg) => quoteForShell(arg, shell)),
      ].join(' '),
    );
  let head = quoteForShell(file, shell);
  if (kind === 'powershell' || kind === 'pwsh')
    head = POWERSHELL_BARE_COMMAND.test(file)
      ? file
      : `& ${powerShellLiteral(file)}`;
  return [head, ...args.map((arg) => quoteForShell(arg, shell))].join(' ');
};
