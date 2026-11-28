/**
 * Describe what lies beneath an error: its `cause` chain and, for an
 * `AggregateError`, each of its errors. The CLI prints these lines under the
 * top-level error, so a wrapped failure (a config that won't load) shows what
 * actually went wrong.
 */

/** Options for {@link describeErrorCauses}. */
export interface DescribeErrorCausesOptions {
  /** Describe each error by its stack trace rather than its message. */
  stacks?: boolean;
}

/** Indent continuation lines of a multi-line text to `pad`. */
const indentBody = (text: string, pad: string): string =>
  text.split(/\r?\n/).join(`\n${pad}`);

/**
 * Lines describing the errors under `err`, one entry per error; a multi-line
 * message (or stack) stays one entry, its continuation lines indented. Each
 * level is indented two spaces deeper. A cycle is followed only once.
 *
 * @param err - The error whose causes to describe.
 * @param options - How to describe each error.
 * @returns The lines (empty when `err` has no cause or aggregated errors).
 */
export const describeErrorCauses = (
  err: unknown,
  { stacks = false }: DescribeErrorCausesOptions = {},
): string[] => {
  const textOf = (value: unknown): string =>
    value instanceof Error
      ? stacks
        ? (value.stack ?? value.message)
        : value.message
      : String(value);
  const seen = new Set<unknown>();
  const walk = (value: unknown, depth: number): string[] => {
    if (!(value instanceof Error) || seen.has(value)) return [];
    seen.add(value);
    const pad = '  '.repeat(depth);
    const lines: string[] = [];
    const push = (label: string, child: unknown) => {
      lines.push(
        `${pad}${label}${indentBody(textOf(child), `${pad}  `)}`,
        ...walk(child, depth + 1),
      );
    };
    if (value instanceof AggregateError) {
      for (const child of value.errors) push('- ', child);
    }
    if (value.cause !== undefined) push('Caused by: ', value.cause);
    return lines;
  };
  return walk(err, 1);
};
