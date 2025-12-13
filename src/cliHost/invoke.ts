/** src/cliHost/invoke.ts
 * Shared helpers for composing child env overlays and preserving argv for Node -e.
 */
import type { GetDotenvCliOptions } from './GetDotenvCliOptions';

/**
 * Compose a child-process env overlay from dotenv and the merged CLI options bag.
 * Returns a shallow object including getDotenvCliOptions when serializable.
 */
export function composeNestedEnv(
  merged: GetDotenvCliOptions | Record<string, unknown>,
  dotenv: Record<string, string | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(dotenv)) {
    if (typeof v === 'string') out[k] = v;
  }
  try {
    const { logger: _omit, ...bag } = merged as Record<string, unknown>;
    const txt = JSON.stringify(bag);
    if (typeof txt === 'string') out.getDotenvCliOptions = txt;
  } catch {
    /* best-effort only */
  }
  return out;
}

/**
 * Strip one layer of symmetric outer quotes (single or double) from a string.
 *
 * @param s - Input string.
 */
export const stripOne = (s: string) => {
  if (s.length < 2) return s;
  const a = s.charAt(0);
  const b = s.charAt(s.length - 1);
  const symmetric = (a === '"' && b === '"') || (a === "'" && b === "'");
  return symmetric ? s.slice(1, -1) : s;
};

/**
 * Preserve argv array for Node -e/--eval payloads under shell-off and
 * peel one symmetric outer quote layer from the code argument.
 */
export function maybePreserveNodeEvalArgv(args: string[]): string[] {
  if (args.length >= 3) {
    const first = (args[0] ?? '').toLowerCase();
    const hasEval = args[1] === '-e' || args[1] === '--eval';
    if (first === 'node' && hasEval) {
      const copy = args.slice();
      copy[2] = stripOne(copy[2] ?? '');
      return copy;
    }
  }
  return args;
}
