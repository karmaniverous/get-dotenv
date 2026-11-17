/**
 * Normalization of volatile values in recorded baseline output.
 *
 * Everything the harness records passes through {@link normalizeText} (strings)
 * or {@link normalizeValue} (JSON-like values), so the stored baseline holds no
 * machine-, run- or version-specific text: temporary directories, the repo
 * checkout, the home directory, path separators after those roots, package and
 * Node versions, timestamps, durations and stack frames.
 */
import { readFileSync, realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const isWin = process.platform === 'win32';

const repoRoot = path.resolve(import.meta.dirname, '..', '..');

const packageVersion = (
  JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8')) as {
    version: string;
  }
).version;

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Every spelling of a root path that may appear in output. */
const spellings = (root: string): string[] => {
  const forms = new Set<string>();
  const add = (p: string) => {
    if (p.length === 0) return;
    forms.add(p);
    forms.add(p.replace(/\\/g, '/'));
    forms.add(p.replace(/\\/g, '\\\\'));
    forms.add(p.replace(/\\/g, '\\\\\\\\'));
  };
  add(root);
  try {
    add(realpathSync.native(root));
  } catch {
    /* root may not exist (yet) */
  }
  // Longest first, so a longer spelling is replaced before its prefix.
  return [...forms].sort((a, b) => b.length - a.length);
};

interface RootRule {
  placeholder: string;
  pattern: RegExp;
}

const rootRule = (root: string, placeholder: string): RootRule => ({
  placeholder,
  pattern: new RegExp(
    spellings(root).map(escapeRegex).join('|'),
    isWin ? 'gi' : 'g',
  ),
});

const staticRules: RootRule[] = [
  rootRule(repoRoot, '<REPO>'),
  rootRule(os.tmpdir(), '<OSTMP>'),
  rootRule(os.homedir(), '<HOME>'),
];

let caseRules: RootRule[] = [];

/**
 * Set the per-case roots (the case's temporary directory). They are replaced
 * before the static roots, because a temp directory usually sits under the
 * OS temp directory or the home directory.
 *
 * @param roots - Map of placeholder to absolute path.
 */
export const setCaseRoots = (roots: Record<string, string>): void => {
  caseRules = Object.entries(roots).flatMap(([placeholder, root]) => [
    rootRule(root, placeholder),
    // The bare directory name (e.g. `init` derives a CLI name from it).
    {
      placeholder: `${placeholder.slice(0, -1)}NAME>`,
      pattern: new RegExp(escapeRegex(path.basename(root)), 'g'),
    },
  ]);
};

const PLACEHOLDER = /<(?:TMP|REPO|OSTMP|HOME)>/;
// Note: `<TMPNAME>` (a bare directory name) is not a root, so separators
// after it are left as the platform wrote them.

/** Rewrite path separators that follow a placeholder to forward slashes. */
const slashAfterPlaceholders = (s: string): string =>
  s.replace(
    new RegExp(
      `(${PLACEHOLDER.source})((?:(?:\\\\{1,4}|/)[^\\s\\\\/"'\`,;:()[\\]{}<>|*?]*)+)`,
      'g',
    ),
    (_m, root: string, rest: string) => root + rest.replace(/\\{1,4}/g, '/'),
  );

/**
 * Normalize a string.
 *
 * @param input - Raw text.
 * @returns Text with volatile values replaced by placeholders.
 */
export const normalizeText = (input: string): string => {
  let s = input;
  for (const rule of [...caseRules, ...staticRules])
    s = s.replace(rule.pattern, rule.placeholder);
  s = slashAfterPlaceholders(s);
  // file URLs of normalized roots: file:///<TMP>/x -> file://<TMP>/x
  s = s.replace(
    new RegExp(`file:///(${PLACEHOLDER.source})`, 'g'),
    'file://$1',
  );
  // Versions: the package under test and the Node runtime.
  s = s.replace(
    new RegExp(`(?<![\\d.])${escapeRegex(packageVersion)}(?![\\d.])`, 'g'),
    '<VERSION>',
  );
  s = s.replace(
    new RegExp(
      `(?<![\\d.])v?${escapeRegex(process.versions.node)}(?![\\d.])`,
      'g',
    ),
    '<NODE_VERSION>',
  );
  // Timestamps and durations.
  s = s.replace(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?/g,
    '<TIME>',
  );
  s = s.replace(/\b\d+(?:\.\d+)?\s?ms\b/g, '<MS>');
  // Stack frames: keep one marker per contiguous run of frames.
  s = s.replace(/(?:^[ \t]+at [^\n]*(?:\n|$))+/gm, '    at <frames>\n');
  // Node's source excerpt for uncaught errors: "<file>:<line>" + code + caret.
  s = s.replace(/^(<(?:TMP|REPO)>[^\s:]*):\d+$/gm, '$1:<LINE>');
  return s;
};

/**
 * Normalize stream output: also unify line endings.
 *
 * @param input - Raw stream text.
 * @returns Normalized text with LF line endings.
 */
export const normalizeStream = (input: string): string =>
  normalizeText(input.replace(/\r\n/g, '\n'))
    // batch banners: rules of `*` sized to the (temp) path being printed.
    .replace(/^\*{10,}$/gm, '<STARS>')
    // batch --concurrency defaults to the machine's available parallelism.
    .replace(/(--concurrency <n>[^(]*\(default:\s*)\d+\)/g, '$1<CPUS>)')
    // `--trace` with no keys lists every ambient variable, which differs by
    // machine (and may hold secrets): keep one marker line per run of them.
    .replace(
      /^\[trace\] key=\S+ origin=parent .*$/gm,
      '[trace] <ambient> origin=parent',
    )
    .replace(/^\[entropy\] key=\S+ score=\S+ len=\d+ origin=parent\n/gm, '')
    .replace(
      /(?:^\[trace\] <ambient> origin=parent\n)+/gm,
      '[trace] <ambient> origin=parent\n',
    );

/**
 * Normalize every string inside a JSON-like value and sort object keys.
 *
 * @param value - JSON-like value.
 * @returns A normalized deep copy.
 */
export const normalizeValue = (value: unknown): unknown => {
  if (typeof value === 'string') return normalizeText(value);
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort())
      out[normalizeText(key)] = normalizeValue(
        (value as Record<string, unknown>)[key],
      );
    return out;
  }
  return value;
};
