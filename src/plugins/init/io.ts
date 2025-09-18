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
