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

  it('cmd.exe: argv escaping, then a caret before every metacharacter (review 5916926264 #2)', () => {
    expect(quoteForShell('a b', 'C:\\Windows\\System32\\cmd.exe')).toBe(
      '^"a^ b^"',
    );
    expect(quoteForShell('q"r', 'cmd')).toBe('^"q\\^"r^"');
    expect(quoteForShell('plain', 'cmd.exe')).toBe('^"plain^"');
    // Backslashes double only before a quote, including the closing one.
    expect(quoteForShell('a\\b', 'cmd.exe')).toBe('^"a\\b^"');
    expect(quoteForShell('tail\\', 'cmd.exe')).toBe('^"tail\\\\^"');
    expect(quoteForShell('a\\"b', 'cmd.exe')).toBe('^"a\\\\\\^"b^"');
    expect(quoteForShell('%PATH%!x!&|<>()^', 'cmd.exe')).toBe(
      '^"^%PATH^%^!x^!^&^|^<^>^(^)^^^"',
    );
    expect(joinForShell(['node', 'x'], 'cmd.exe')).toBe('node ^"x^"');
    expect(joinForShell(['C:\\Program Files\\node.exe', 'x'], 'cmd.exe')).toBe(
      '"C:\\Program Files\\node.exe" ^"x^"',
    );
  });

  it('cmd.exe: throws, without echoing the token, where it cannot stop expansion (review 5916926264 #2)', () => {
    const fails = (argv: string[]) => {
      try {
        joinForShell(argv, 'cmd.exe');
      } catch (e) {
        return (e as Error).message;
      }
      return undefined;
    };
    expect(fails(['node', 'a\nSECRET'])).toMatch(/line break/);
    expect(fails(['node', 'a\rSECRET'])).toMatch(/line break/);
    expect(fails(['node', '%PATH:SECRET=b%'])).toMatch(/%name:/);
    // The pair can span two tokens.
    expect(fails(['node', 'a%SECRET:c', 'd%'])).toMatch(/%name:/);
    // A name holding a caret (an escaped space or token boundary) is no
    // ordinary variable, so its edit can't expand.
    expect(fails(['node', 'x%', 'y:z%'])).toBeUndefined();
    expect(fails(['node', '%a b:c%'])).toBeUndefined();
    expect(fails(['C:\\a%SECRET%\\x.exe'])).toMatch(/command path/);
    expect(fails(['a"SECRET'])).toMatch(/command path/);
    for (const argv of [
      ['node', 'a\nSECRET'],
      ['node', '%PATH:SECRET=b%'],
      ['node', 'a%SECRET:c', 'd%'],
      ['C:\\a%SECRET%\\x.exe'],
    ])
      expect(fails(argv)).not.toContain('SECRET');
    // A `%` pair without `:` is safe: the escaped name ends in `^`.
    expect(fails(['node', '%PATH%', 'a:b'])).toBeUndefined();
    expect(() => quoteForShell('%a:b%', 'cmd.exe')).toThrow(/%name:/);
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
    expect(quoteForShell('plain-1.0', 'pwsh')).toBe("'plain-1.0'");
  });

  it('PowerShell: every quote character doubled, --% as an array (review 5916926264 #1)', () => {
    for (const shell of ['pwsh', 'powershell.exe']) {
      expect(quoteForShell('a\u2018b\u2019c\u201Ad\u201Be', shell)).toBe(
        "'a\u2018\u2018b\u2019\u2019c\u201A\u201Ad\u201B\u201Be'",
      );
      expect(quoteForShell('--%', shell)).toBe("@('--%')");
      expect(quoteForShell('--%x', shell)).toBe("'--%x'");
      expect(quoteForShell('plain', shell)).toBe("'plain'");
    }
    // A curly double quote ends no single-quoted string.
    expect(quoteForShell('\u201Cx\u201D', 'pwsh')).toBe("'\u201Cx\u201D'");
    // A command name PowerShell would read as an operator or alias runs
    // through the call operator.
    expect(joinForShell(['%', 'x'], 'pwsh')).toBe("& '%' 'x'");
    expect(joinForShell(['-x', 'y'], 'pwsh')).toBe("& '-x' 'y'");
    expect(joinForShell(['./bin/x.exe'], 'pwsh')).toBe('./bin/x.exe');
  });

  it('PowerShell runs a quoted command name through the call operator', () => {
    expect(joinForShell(['C:\\Program Files\\node.exe', '-v'], 'pwsh')).toBe(
      "& 'C:\\Program Files\\node.exe' '-v'",
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
