// Minimal tokenizer for shell-off execution:
// Splits by whitespace while preserving quoted segments (single or double quotes).
// Optionally preserve doubled quotes inside quoted segments:
// - default: "" => " (Windows/PowerShell style literal-quote escape)
// - preserveDoubledQuotes: true => "" stays "" (needed for Node -e payloads)
/**
 * Options for the tokenizer used by shell-off command handling.
 *
 * @public
 */
export interface TokenizeOptions {
  /**
   * When true, keep doubled quotes inside a quoted segment (e.g., `""` stays `""`),
   * which is useful for preserving Node -e payload quoting patterns.
   * When false (default), doubled quotes collapse to a single literal quote.
   */
  preserveDoubledQuotes?: boolean;
}

export const tokenize = (command: string, opts?: TokenizeOptions): string[] => {
  const out: string[] = [];
  let cur = '';
  let quote: '"' | "'" | null = null;
  const preserve = opts && opts.preserveDoubledQuotes === true ? true : false;
  for (let i = 0; i < command.length; i++) {
    const c = command.charAt(i);
    if (quote) {
      if (c === quote) {
        // Support doubled quotes inside a quoted segment:
        // default: "" -> " and '' -> ' (Windows/PowerShell style)
        // preserve: keep as "" to allow empty string literals in Node -e payloads
        const next = command.charAt(i + 1);
        if (next === quote) {
          if (preserve) {
            // Keep "" as-is; append both and continue within the quoted segment.
            cur += quote + quote;
            i += 1; // skip the second quote char (we already appended both)
          } else {
            // Collapse to a single literal quote
            cur += quote;
            i += 1; // skip the second quote
          }
        } else {
          // end of quoted segment
          quote = null;
        }
      } else {
        cur += c;
      }
    } else {
      if (c === '"' || c === "'") {
        quote = c;
      } else if (/\s/.test(c)) {
        if (cur) {
          out.push(cur);
          cur = '';
        }
      } else {
        cur += c;
      }
    }
  }
  if (cur) out.push(cur);
  return out;
};
