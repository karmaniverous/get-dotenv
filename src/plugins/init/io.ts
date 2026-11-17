import fs from 'fs-extra';
import path from 'path';

/**
 * Ensure a directory exists (parents included).
 *
 * @param p - Directory path to create.
 * @returns A `Promise\<string\>` resolving to the provided `p` value.
 */
export const ensureDir = async (p: string) => {
  await fs.ensureDir(p);
  return p;
};

/**
 * Write UTF-8 text content to a file, ensuring the parent directory exists.
 *
 * @param dest - Destination file path.
 * @param data - File contents to write.
 * @returns A `Promise\<void\>` which resolves when the file is written.
 */
export const writeFile = async (dest: string, data: string) => {
  await ensureDir(path.dirname(dest));
  await fs.writeFile(dest, data, 'utf-8');
};

/**
 * Copy a text file with optional string substitution.
 *
 * @param src - Source file path.
 * @param dest - Destination file path.
 * @param substitutions - Map of token literals to replacement strings.
 * @returns A `Promise\<void\>` which resolves when the file has been copied.
 */
export const copyTextFile = async (
  src: string,
  dest: string,
  substitutions?: Record<string, string>,
) => {
  const contents = await fs.readFile(src, 'utf-8');
  const out =
    substitutions && Object.keys(substitutions).length > 0
      ? Object.entries(substitutions).reduce(
          (acc, [k, v]) => acc.split(k).join(v),
          contents,
        )
      : contents;
  await writeFile(dest, out);
};

/**
 * Result returned by {@link ensureLines}.
 *
 * @public
 */
export interface EnsureLinesResult {
  /** True when the target file did not previously exist. */
  created: boolean;
  /** True when the file was created or modified by this call. */
  changed: boolean;
}

/**
 * Ensure a set of lines exist (exact match) in a file. Creates the file
 * when missing. Returns whether it was created or changed.
 *
 * An existing file is never rewritten: its content (blank lines, line
 * endings) is kept and only the missing lines are appended, in the file's own
 * line ending (CRLF when it has any, else LF).
 *
 * @param filePath - Target file path to create/update.
 * @param lines - Lines which must be present (exact string match).
 * @returns A `Promise\<object\>` describing whether the file was created and/or changed.
 */
export const ensureLines = async (
  filePath: string,
  lines: string[],
): Promise<EnsureLinesResult> => {
  if (!(await fs.pathExists(filePath))) {
    await writeFile(filePath, [...new Set(lines)].join('\n') + '\n');
    return { created: true, changed: true };
  }
  const current = await fs.readFile(filePath, 'utf-8');
  const have = new Set(current.split(/\r?\n/));
  const missing = [...new Set(lines)].filter((l) => !have.has(l));
  if (missing.length === 0) return { created: false, changed: false };

  const eol = current.includes('\r\n') ? '\r\n' : '\n';
  const sep = current === '' || current.endsWith('\n') ? '' : eol;
  await fs.appendFile(filePath, sep + missing.join(eol) + eol, 'utf-8');
  return { created: false, changed: true };
};
