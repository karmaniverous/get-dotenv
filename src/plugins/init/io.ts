import fs from 'fs-extra';
import path from 'path';

export const ensureDir = async (p: string) => {
  await fs.ensureDir(p);
  return p;
};

export const writeFile = async (dest: string, data: string) => {
  await ensureDir(path.dirname(dest));
  await fs.writeFile(dest, data, 'utf-8');
};

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
 * Ensure a set of lines exist (exact match) in a file. Creates the file
 * when missing. Returns whether it was created or changed.
 */
export const ensureLines = async (
  filePath: string,
  lines: string[],
): Promise<{ created: boolean; changed: boolean }> => {
  const exists = await fs.pathExists(filePath);
  const current = exists ? await fs.readFile(filePath, 'utf-8') : '';
  const curLines = current.split(/\r?\n/);
  const have = new Set(curLines.filter((l) => l.length > 0));
  let mutated = false;
  for (const l of lines) {
    if (!have.has(l)) {
      curLines.push(l);
      have.add(l);
      mutated = true;
    }
  }
  // Normalize to LF and ensure trailing newline
  const next = curLines.filter((l) => l.length > 0).join('\n') + '\n';
  if (!exists) {
    await writeFile(filePath, next);
    return { created: true, changed: true };
  }
  if (mutated) {
    await fs.writeFile(filePath, next, 'utf-8');
    return { created: false, changed: true };
  }
  return { created: false, changed: false };
};
