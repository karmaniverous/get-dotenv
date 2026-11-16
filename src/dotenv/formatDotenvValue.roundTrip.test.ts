/**
 * #72: get-dotenv's dotenv writers (the editor and the `-o` writer) write
 * every value so that dotenv 18's `parse` reads it back exactly.
 *
 * Property-style: values are generated from a fixed alphabet of awkward
 * characters with a fixed-seed PRNG (deterministic, no flakiness), written,
 * parsed with dotenv (both its parsers) in several surrounding contexts, and
 * compared. A value the writer refuses must be one that no quote style can
 * represent, checked against every candidate form independently.
 */
import { parse } from 'dotenv';
import { describe, expect, it } from 'vitest';

import { formatDotenvRecord } from '@/src/util/dotenvFile';

import { editDotenvText } from './edit/editDotenvText';
import { parseDotenvDocument } from './edit/parseDotenvDocument';
import { formatDotenvValue } from './formatDotenvValue';

/** mulberry32: a tiny deterministic PRNG. */
const prng = (seed: number) => {
  let a = seed >>> 0;
  return (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Pieces values are built from: plain text plus everything dotenv treats specially. */
const ALPHABET = [
  'a',
  'Z9',
  ' ',
  '\t',
  '#',
  '"',
  "'",
  '`',
  '\\',
  'n',
  'r',
  '\n',
  '\r',
  '\r\n',
  '=',
  '$',
  'é',
  '\u2028',
  'C:\\new\\dir',
];

const generate = (count: number, seed: number): string[] => {
  const rand = prng(seed);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const len = Math.floor(rand() * 7);
    let v = '';
    for (let j = 0; j < len; j++)
      v += ALPHABET[Math.floor(rand() * ALPHABET.length)] ?? '';
    out.push(v);
  }
  return out;
};

const VALUES = generate(3000, 72);

/** Parse with both dotenv parsers. */
const parseBoth = (text: string) => [parse(text), parse(text, { fast: true })];

/**
 * Lines the value's line is checked between: alone, after another key, and
 * before a line whose last character is each quote (an unterminated value
 * would run on to it).
 */
const contexts = (line: string, eol: string): string[] => [
  line,
  `${line}${eol}`,
  `A=1${eol}${line}${eol}`,
  ...['"', "'", '`'].map((q) => `${line}${eol}Z=1 # ${q}${eol}`),
];

const readsBack = (token: string, value: string, eol = '\n'): boolean =>
  contexts(`K=${token}`, eol).every((text) =>
    parseBoth(text).every((p) => p.K === value),
  );

/**
 * Every form a writer could choose, built independently of the writer, with
 * the quote style the editor's parser must see when it reads the line again.
 */
const candidates = (v: string): Array<[string, string | null]> => [
  [v, null],
  [`"${v.replace(/\r/g, '\\r')}"`, '"'],
  [`'${v}'`, "'"],
  [`\`${v}\``, '`'],
];

/** The editor reads the line back as one value in that quote style, closed at the end. */
const editorReadsBack = (token: string, quote: string | null): boolean => {
  const { segments } = parseDotenvDocument(`K=${token}`);
  const [seg] = segments;
  return (
    segments.length === 1 &&
    seg?.kind === 'assignment' &&
    seg.quote === quote &&
    seg.suffix === ''
  );
};

describe('formatDotenvValue round trip (#72)', () => {
  it('generates a mix of plain, quoted and unrepresentable values', () => {
    const forms = new Set<string>();
    let refused = 0;
    for (const v of VALUES) {
      try {
        forms.add(String(formatDotenvValue({ key: 'K', value: v }).quote));
      } catch {
        refused += 1;
      }
    }
    expect([...forms].sort()).toEqual(['"', "'", '`', 'null']);
    expect(refused).toBeGreaterThan(0);
    // The alphabet is heavy in quotes and carriage returns, which together
    // leave no form; plain and single-awkward-character values always have one.
    expect(refused).toBeLessThan(VALUES.length / 5);
  });

  it('every written value reads back exactly, in every context, LF and CRLF', () => {
    const failures: string[] = [];
    for (const v of VALUES) {
      for (const eol of ['\n', '\r\n'] as const) {
        let token: string;
        try {
          token = formatDotenvValue({ key: 'K', value: v, fileEol: eol }).token;
        } catch {
          continue;
        }
        if (!readsBack(token, v, eol)) failures.push(JSON.stringify(v));
      }
    }
    expect(failures).toEqual([]);
  });

  it('refuses a value only when no form reads it back', () => {
    const wrong: string[] = [];
    for (const v of VALUES) {
      const refused = (() => {
        try {
          formatDotenvValue({ key: 'K', value: v });
          return false;
        } catch {
          return true;
        }
      })();
      const representable = candidates(v).some(
        ([t, q]) => editorReadsBack(t, q) && readsBack(t, v),
      );
      if (refused === representable) wrong.push(JSON.stringify(v));
    }
    expect(wrong).toEqual([]);
  });

  it('the error names the key, never the value', () => {
    expect(() =>
      formatDotenvValue({ key: 'SECRET', value: 'p\'w"d`\n' }),
    ).toThrow(
      new Error(
        'Unable to write dotenv key "SECRET": dotenv cannot read its value back unchanged in any quote style.',
      ),
    );
  });

  it('keeps the preferred quote style when it can hold the value, and falls back in order', () => {
    const fmt = (value: string, preferQuote: '"' | "'" | '`' | null) =>
      formatDotenvValue({ key: 'K', value, preferQuote }).token;
    expect(fmt('plain', "'")).toBe("'plain'");
    expect(fmt('plain', '`')).toBe('`plain`');
    expect(fmt('plain', null)).toBe('plain');
    expect(fmt('a"b', '"')).toBe(`'a"b'`);
    expect(fmt(`a"b'c`, '"')).toBe('`a"b\'c`');
    expect(fmt('a"b\'c`d', "'")).toBe('a"b\'c`d');
    expect(fmt('x #y', null)).toBe('"x #y"');
    expect(fmt('C:\\new\\dir', null)).toBe('C:\\new\\dir');
    expect(fmt(' C:\\new', null)).toBe("' C:\\new'");
    expect(fmt('a\rb', null)).toBe('"a\\rb"');
    expect(fmt('a\nb', null)).toBe('"a\nb"');
    expect(fmt("'q", null)).toBe(`"'q"`);
    // U+2028 is ordinary content to dotenv and to the editor's parser.
    expect(fmt('a\u2028b', null)).toBe('a\u2028b');
  });
});

describe('dotenv writers round-trip whole files (#72)', () => {
  const representable = VALUES.filter((v) => {
    try {
      formatDotenvValue({ key: 'K', value: v });
      return true;
    } catch {
      return false;
    }
  });
  const record = Object.fromEntries(
    representable.map((v, i) => [`K${String(i)}`, v]),
  );

  it('-o writer: formatDotenvRecord reads back as the record', () => {
    for (const p of parseBoth(formatDotenvRecord(record)))
      expect(p).toEqual(record);
  });

  it('-o writer: undefined is written as an empty value', () => {
    expect(formatDotenvRecord({ A: undefined, B: 'x #y' })).toBe(
      'A=\nB="x #y"\n',
    );
  });

  it('-o writer: issue repro values', () => {
    const vars = {
      H: 'x #y',
      W: ' lead',
      M: 'line1\nline2 "q"',
      B: 'C:\\new\\dir',
      N: 'line\nC:\\new',
    };
    const text = formatDotenvRecord(vars);
    expect(text).toBe(
      'H="x #y"\nW=" lead"\nM=\'line1\nline2 "q"\'\nB=C:\\new\\dir\nN=\'line\nC:\\new\'\n',
    );
    expect(parse(text)).toEqual(vars);
  });

  it('editor: new keys in an empty file read back as the record (LF and CRLF)', () => {
    for (const eol of ['lf', 'crlf'] as const)
      for (const p of parseBoth(editDotenvText('', record, { eol })))
        expect(p).toEqual(record);
  });

  it('editor: updates to existing lines of every quote style read back', () => {
    const keys = Object.keys(record);
    const styles = ['K=old', "K='old'", 'K="old"', 'K=`old`', 'K=old # note'];
    const text = keys
      .map((k, i) => (styles[i % styles.length] ?? '').replace('K', k))
      .join('\n');
    const out = editDotenvText(`${text}\n`, record);
    for (const p of parseBoth(out)) expect(p).toEqual(record);
  });

  it('editor: issue repros', () => {
    const hash = editDotenvText('A=1\n', { B: 'x #y' });
    const quote = editDotenvText('C=" old "\n', { C: 'a"b' });
    const backslash = editDotenvText('P="x"\n', { P: 'C:\\new\\dir' });
    expect({ hash, quote, backslash }).toEqual({
      hash: 'A=1\nB="x #y"\n',
      quote: `C='a"b'\n`,
      backslash: "P='C:\\new\\dir'\n",
    });
    expect(parse(hash).B).toBe('x #y');
    expect(parse(quote).C).toBe('a"b');
    expect(parse(backslash).P).toBe('C:\\new\\dir');
  });

  it('editor: line breaks inside a quoted value follow the file EOL', () => {
    expect(editDotenvText('A=1\r\n', { M: 'a\nb' })).toBe(
      'A=1\r\nM="a\r\nb"\r\n',
    );
  });

  it('editor: an existing line keeps its quote style when it can hold the new value', () => {
    expect(
      editDotenvText('S=\'old\'\nD="old"\nT=`old`\n', {
        S: 'new',
        D: 'new',
        T: 'new',
      }),
    ).toBe('S=\'new\'\nD="new"\nT=`new`\n');
  });

  it('editor: a backtick-quoted multiline value is one value, not a key line', () => {
    const text = 'M=`a\nB=1`\nC=2\n';
    expect(editDotenvText(text, { M: 'z' })).toBe('M=`z`\nC=2\n');
    expect(editDotenvText(text, { C: '3' }, { mode: 'sync' })).toBe('C=3\n');
  });

  it('editor: refuses a value no form can hold, naming the key', () => {
    expect(() => editDotenvText('', { BAD: 'a\'b"c`\n' })).toThrow(
      /^Unable to write dotenv key "BAD"/,
    );
  });
});
