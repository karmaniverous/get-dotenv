/**
 * Key patterns for the presentation-only diagnostics (redaction and the
 * entropy whitelist).
 */

/**
 * Compile key patterns for repeated `test` calls. A string matches
 * case-insensitively. A RegExp is copied without its `g` and `y` flags:
 * `test` on such a pattern starts at its `lastIndex` and moves it, so reusing
 * it across keys would skip matches (review 5916926264 #6). The caller's
 * RegExp is never touched.
 *
 * @param patterns - The patterns.
 * @returns One RegExp per pattern, safe to `test` against any number of keys.
 */
export const compileKeyPatterns = (
  patterns: ReadonlyArray<string | RegExp>,
): RegExp[] =>
  patterns.map((p) =>
    typeof p === 'string'
      ? new RegExp(p, 'i')
      : new RegExp(p.source, p.flags.replace(/[gy]/g, '')),
  );
