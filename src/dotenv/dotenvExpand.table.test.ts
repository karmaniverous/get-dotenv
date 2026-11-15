import { describe, expect, it } from 'vitest';

import type { ProcessEnv } from '@/src/core';

import { dotenvExpand, dotenvExpandAll } from './dotenvExpand';

/** One expansion case: input text, reference map, expected result. */
type Row = [
  name: string,
  input: string,
  ref: ProcessEnv,
  expected: string | undefined,
];

const A = { A: 'x' };

const rows: Record<string, Row[]> = {
  escapes: [
    ['escaped reference', '\\$A', A, '$A'],
    ['escaped braced reference', '\\${A}', A, '${A}'],
    // #78: the escaped one stayed escaped only if the name appeared once.
    ['escaped and unescaped, same name', '\\$A $A', A, '$A x'],
    ['unescaped then escaped, same name', '$A \\$A', A, 'x $A'],
    // `\\$A`: the first backslash is literal, the second escapes the `$`.
    ['backslash pair before $', 'a\\\\$A', A, 'a\\$A'],
    ['backslash not before $ stays', 'a\\nb', A, 'a\\nb'],
    ['escape inside a braced default', '${B:\\$A}', A, '$A'],
    ['escape inside a referenced value', '$E', { E: 'p\\$A' }, 'p$A'],
  ],
  literalDollar: [
    // #86: a $ that starts no reference no longer stops expansion.
    ['trailing $', '$A cost $', A, 'x cost $'],
    ['$!', '$A $!', A, 'x $!'],
    ['braced then trailing $', '${A} 100$', A, 'x 100$'],
    ['lone $', '$', A, '$'],
    ['$ before punctuation', 'a$-b $A', A, 'a$-b x'],
    ['unclosed brace', '${A $A', A, '${A x'],
    ['unclosed brace with default', '${A:d $A', A, '${A:d x'],
    ['empty braces', '${} $A', A, '${} x'],
  ],
  forms: [
    ['$NAME', '$A', A, 'x'],
    ['${NAME}', '${A}', A, 'x'],
    ['embedded', 'a${A}b', A, 'axb'],
    ['digit name', '$1', { 1: 'one' }, 'one'],
    ['$NAME:default, unset', '$B:d', A, 'd'],
    ['${NAME:default}, unset', '${B:d}', A, 'd'],
    ['$NAME:default, set', '$A:d', A, 'x'],
    ['${NAME:default}, set', '${A:d}', A, 'x'],
    // There is no `:-` form: everything after the colon is the default.
    ['${NAME:-default} default is "-default"', '${B:-d}', A, '-d'],
    ['unbraced default ends at whitespace', 'a $B:d e', A, 'a d e'],
    ['unbraced default swallows :port', 'http://$A:8080/x', A, 'http://x'],
    ['braced form keeps :port', 'http://${A}:8080/x', A, 'http://x:8080/x'],
    ['empty value is used, not the default', '[${E:d}]', { E: '' }, '[]'],
    ['empty default', '[${B:}]', A, '[]'],
    ['unknown, isolated', '$U', A, undefined],
    ['unknown, embedded', 'a $U b', A, 'a  b'],
    ['empty input', '', A, undefined],
  ],
  nested: [
    ['referenced value is expanded', '$R', { R: '$S', S: 'y' }, 'y'],
    ['chain', '${R}!', { R: '${S}-', S: '$T', T: 'z' }, 'z-!'],
    ['reference in a braced default', '${B:${A}}', A, 'x'],
    ['nested braced defaults', '${B:${C:${A}}}', A, 'x'],
    ['default around a reference', '${B:pre-${A}-post}', A, 'pre-x-post'],
    ['reference in an unbraced default', '$B:$A', A, 'x'],
    ['default unused when set', '${A:${NOPE:z}}', A, 'x'],
    ['brace in a default', '${B:{y}}', A, '{y}'],
    ['same name twice', '$R$R', { R: '$S', S: 'y' }, 'yy'],
    // #78: a substituted value is spliced in, never re-scanned with the text
    // around it, so `$` + `C` does not form a new reference to C.
    ['result is not re-scanned', '$D$C', { D: '$', C: 'C' }, '$C'],
  ],
  cycles: [
    // #78: a reference to a variable already being expanded counts as unset.
    ['self reference', '$SELF', { SELF: '$SELF' }, undefined],
    ['self reference, embedded', '$SELF', { SELF: 'a${SELF}b' }, 'ab'],
    [
      'self reference takes its default',
      '$P',
      { P: '${P:/usr/bin}:/x' },
      '/usr/bin:/x',
    ],
    ['mutual reference', '$M', { M: 'a$N', N: 'b$M' }, 'ab'],
    ['three-way cycle', '$X', { X: '1$Y', Y: '2$Z', Z: '3$X' }, '123'],
  ],
  replacementPatterns: [
    // #78: String.replace patterns in a substituted value are not applied.
    ['$& in a value', '$P', { P: 'x$&y' }, 'x$&y'],
    ['$& spliced mid-text', 'pre $P post', { P: 'x$&y' }, 'pre x$&y post'],
    ["$' and $` in a value", '$P', { P: "a$'b$`c" }, "a$'b$`c"],
    ['trailing $$ in a value', '$P', { P: 'a$$' }, 'a$$'],
    ['escaped $$ in a value', '$P', { P: 'a\\$\\$b' }, 'a$$b'],
    // A referenced value is expanded like any value: `$$b` is a literal `$`
    // followed by a reference to b.
    ['$$name in a value', '$P', { P: 'a$$b', b: 'B' }, 'a$B'],
  ],
};

describe('dotenvExpand table', () => {
  for (const [group, groupRows] of Object.entries(rows)) {
    describe(group, () => {
      it.each(groupRows)('%s', (_name, input, ref, expected) => {
        expect(dotenvExpand(input, ref)).toBe(expected);
      });
    });
  }

  it('never overflows on a self-referencing map (dotenvExpandAll)', () => {
    // A value's own key is not marked as being expanded (so `PATH=$PATH:/x`
    // still reads an ambient PATH); the cycle is cut at the first variable
    // that repeats.
    const raw = { SELF: '$SELF', A: 'a$B', B: 'b$A' };
    expect(dotenvExpandAll(raw, { ref: raw })).toEqual({
      SELF: undefined,
      A: 'aba',
      B: 'bab',
    });
  });

  it('progressive: a later key in the same pass is not yet visible', () => {
    expect(
      dotenvExpandAll({ B: '$A', A: '1' }, { ref: {}, progressive: true }),
    ).toEqual({ B: undefined, A: '1' });
  });
});
