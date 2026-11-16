/**
 * The 8.0 migration guide covers every listed behaviour change.
 *
 * Every departure from the 7.0.11 baseline (case and field departures) names
 * an issue (`#NN`) or decision (`DNN`); the guide must cite each one. The
 * breaking changes that have no baseline case (the `BREAKING CHANGE` footers
 * on the 8.0 branch, and the API and contract changes the baseline can't
 * record) are listed below, and the guide must cite those too.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { departures, fieldDepartures } from '../baseline-7.0.11/departures';

const guidePath = fileURLToPath(
  new URL('../../guides/migrating-to-8.md', import.meta.url),
);

/** A Markdown link reference definition, e.g. `[#45]: https://…`. */
const linkDefinition = /^\[[^\]]+\]:\s/;

/**
 * The guide's text without its link reference definitions, so a reference
 * counts only where the prose cites it.
 */
const guideText = readFileSync(guidePath, 'utf8')
  .split(/\r?\n/)
  .filter((line) => !linkDefinition.test(line))
  .join('\n');

/**
 * The issue and decision references in an `issueOrDecision` value.
 *
 * @param value - E.g. `#45`, `D28` or `#51 (follow-up)`.
 * @returns The references, e.g. `['#51']`.
 */
const refsOf = (value: string): string[] => value.match(/#\d+|D\d+/g) ?? [];

/**
 * Whether `text` cites `ref`: `#45` as a whole number (not `#450`), and
 * `D28` as `D28` or `Decision 28`.
 *
 * @param text - The text to search.
 * @param ref - An issue (`#NN`) or decision (`DNN`) reference.
 * @returns Whether the reference appears.
 */
const cites = (text: string, ref: string): boolean => {
  const match = /^(#|D)(\d+)$/.exec(ref);
  if (!match) throw new Error(`not an issue or decision reference: ${ref}`);
  const [, kind, n] = match as unknown as [string, string, string];
  const pattern =
    kind === '#' ? `(?<![\\w#])#${n}(?!\\d)` : `\\b(?:D|Decision )${n}(?!\\d)`;
  return new RegExp(pattern).test(text);
};

/**
 * Breaking changes with no baseline case, by the reference the guide cites.
 * From the branch's `BREAKING CHANGE` footers and `!` subjects
 * (`git log main..HEAD --grep 'BREAKING CHANGE'`), and from the changes the
 * baseline can't record.
 */
const breaking: ReadonlyArray<{ ref: string; change: string }> = [
  // BREAKING CHANGE footers and `!` subjects
  { ref: '#37', change: 'engines.node >=22.12.0 (commander 15, execa 10)' },
  { ref: 'D19', change: 'cliHost no longer exports z' },
  { ref: '#45', change: 'OFF flags override a true default' },
  { ref: '#68', change: 'rootOptionDefaults.excludeAll takes effect' },
  { ref: '#91', change: "a child keeps the parent's shell: false" },
  { ref: '#77', change: 'createCli defaults rank below config' },
  { ref: '#83', change: 'rootOptionDefaults rejects dynamic and logger' },
  { ref: '#71', change: 'GetDotenvConfig has only the loader keys' },
  { ref: '#64', change: 'one composition per run' },
  { ref: '#78', change: 'left-to-right expander' },
  { ref: '#86', change: 'a stray $ stays literal' },
  { ref: '#63', change: 'host layers expand against process.env' },
  { ref: '#89', change: '-v is expanded once' },
  { ref: '#48', change: 'getDotenv() does not load process.env' },
  { ref: '#52', change: 'createCli requires importMetaUrl' },
  { ref: 'D23', change: 'host identity via importMetaUrl' },
  { ref: '#54', change: 'an existing target beats any template' },
  { ref: '#39', change: 'shared env template' },
  { ref: '#67', change: 'editor sync upserts' },
  { ref: 'D22', change: 'editor sync upserts' },
  { ref: '#72', change: 'writers round-trip; unwritable values throw' },
  { ref: '#53', change: 'runner argv is user arguments only' },
  { ref: 'D30', change: 'vc --bogus -h renders cmd help' },
  { ref: 'D31', change: 'vc node -h runs node; sync parse() throws' },
  { ref: '#76', change: 'root help lists -h, -V and every root option' },
  { ref: '#60', change: 'rootOptionVisibility hides options' },
  { ref: 'D27', change: 'help shows qualified names' },
  // Changes with no baseline case and no footer of their own
  { ref: '#94', change: 'dotenvExpand substitutes a raw map value verbatim' },
  { ref: '#57', change: 'aws whoami really removed' },
  { ref: '#58', change: 'init --dynamic removed' },
  { ref: '#65', change: 'batch has no default subcommand' },
  { ref: '#80', change: 'sso login retries get a fresh probe budget' },
  { ref: '#85', change: 'a non-integer GETDOTENV_CACHE_KEEP falls back' },
  { ref: 'D20', change: 'the --<alias>- prefix is reserved' },
  { ref: 'D24', change: '<alias>- option ban and qualified-name collisions' },
  // The plugin- and host-author contract
  { ref: '#44', change: '.use(plugin, { ns }) overrides' },
  { ref: 'D28', change: 'terminators' },
  { ref: 'D32', change: 'optional-peer package layout' },
  { ref: 'D33', change: 'bin launcher with an install hint' },
  { ref: 'D40', change: 'nested CLI alias naming' },
  { ref: 'D41', change: 'terminator placement' },
  { ref: 'D42', change: 'known limitation and its workaround' },
];

describe('cites', () => {
  it('matches a whole issue number only', () => {
    expect(cites('see #45.', '#45')).toBe(true);
    expect(cites('see [#45]', '#45')).toBe(true);
    expect(cites('see #450', '#45')).toBe(false);
    expect(cites('see #4', '#45')).toBe(false);
    expect(cites('see ##45', '#45')).toBe(false);
  });

  it('matches a decision as DNN or Decision NN', () => {
    expect(cites('(D28)', 'D28')).toBe(true);
    expect(cites('Decision 28 says', 'D28')).toBe(true);
    expect(cites('D280', 'D28')).toBe(false);
    expect(cites('ID28', 'D28')).toBe(false);
  });

  it('rejects anything else', () => {
    expect(() => cites('x', 'A1')).toThrow(/not an issue or decision/);
  });
});

describe('refsOf', () => {
  it('reads the references in an issueOrDecision value', () => {
    expect(refsOf('#51 (follow-up)')).toEqual(['#51']);
    expect(refsOf('D28')).toEqual(['D28']);
  });
});

describe('guides/migrating-to-8.md', () => {
  const listed = [...departures, ...fieldDepartures];
  const departureRefs = [
    ...new Set(listed.flatMap((d) => refsOf(d.issueOrDecision))),
  ].sort();

  it('has departures to check', () => {
    expect(listed.length).toBeGreaterThan(0);
    expect(departureRefs.length).toBeGreaterThan(0);
  });

  it.each(departureRefs)('cites departure %s', (ref) => {
    expect(cites(guideText, ref)).toBe(true);
  });

  it.each(breaking)('cites $ref ($change)', ({ ref }) => {
    expect(cites(guideText, ref)).toBe(true);
  });
});
