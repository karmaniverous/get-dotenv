/**
 * #51: an argv array joined for a shell is quoted by that shell's rules.
 */
import { describe, expect, it } from 'vitest';

import { joinForShell, osDefaultShell, quoteForShell } from './shell';

describe('quoteForShell / joinForShell (#51)', () => {
  it('osDefaultShell is powershell.exe on Windows, /bin/bash elsewhere', () => {
    expect(osDefaultShell()).toBe(
      process.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
    );
  });

  it('cmd.exe keeps its double-quote rules', () => {
    expect(quoteForShell('a b', 'C:\\Windows\\System32\\cmd.exe')).toBe(
      '"a b"',
    );
    expect(quoteForShell('q"r', 'cmd')).toBe('"q\\"r"');
    expect(quoteForShell('plain', 'cmd.exe')).toBe('plain');
  });

  it('PowerShell quoting by executable name', () => {
    expect(quoteForShell('x$y', 'powershell.exe')).toBe("'x$y'");
    expect(
      quoteForShell('x$y', 'C:\\Program Files\\PowerShell\\7\\pwsh.exe'),
    ).toBe("'x$y'");
    expect(quoteForShell("it's", 'pwsh')).toBe("'it''s'");
    expect(quoteForShell('q"r', 'pwsh')).toBe("'q\"r'");
    expect(quoteForShell('q"r', 'powershell')).toBe("'q\\\"r'");
    expect(quoteForShell('a "b"', 'powershell.exe')).toBe('\'"a ""b"""\'');
    expect(quoteForShell('plain-1.0', 'pwsh')).toBe('plain-1.0');
  });

  it('PowerShell runs a quoted command name through the call operator', () => {
    expect(joinForShell(['C:\\Program Files\\node.exe', '-v'], 'pwsh')).toBe(
      "& 'C:\\Program Files\\node.exe' -v",
    );
    expect(
      joinForShell(['C:\\Program Files\\node.exe', 'a b'], 'powershell.exe'),
    ).toBe("& 'C:\\Program Files\\node.exe' '\"a b\"'");
    expect(joinForShell(['node', 'a b'], 'pwsh')).toBe("node 'a b'");
    expect(joinForShell(['a b', 'c'], '/bin/sh')).toBe("'a b' c");
    expect(joinForShell([], 'pwsh')).toBe('');
  });

  it('an empty argument is quoted for every shell (review 5916926264 #3)', () => {
    expect(quoteForShell('', '/bin/sh')).toBe("''");
    expect(quoteForShell('', 'cmd.exe')).toBe('""');
    expect(quoteForShell('', 'pwsh')).toBe("''");
    // Windows PowerShell 5.1 drops an empty native argument: pass `""`.
    expect(quoteForShell('', 'powershell.exe')).toBe(`'""'`);
    expect(joinForShell(['node', '', 'x'], '/bin/bash')).toBe("node '' x");
  });

  it('POSIX quoting for other shells, including file URLs', () => {
    expect(quoteForShell("it's", '/bin/zsh')).toBe("'it'\\''s'");
    expect(quoteForShell('x$y', new URL('file:///bin/bash'))).toBe("'x$y'");
    expect(quoteForShell('plain', '/bin/sh')).toBe('plain');
  });
});
