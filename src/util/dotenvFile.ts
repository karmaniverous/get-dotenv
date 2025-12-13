import fs from 'fs-extra';

/**
 * Serialize a dotenv record to a file with minimal quoting (multiline values are quoted).
 * Future-proofs for ordering/sorting changes (currently insertion order).
 *
 * @param filename - Destination dotenv file path.
 * @param data - Env-like map of values to write (values may be `undefined`).
 * @returns A `Promise\<void\>` which resolves when the file has been written.
 */
export async function writeDotenvFile(
  filename: string,
  data: Record<string, string | undefined>,
): Promise<void> {
  // Serialize: key=value with quotes only for multiline values.
  const body = Object.keys(data).reduce((acc, key) => {
    const v = data[key] ?? '';
    const val = v.includes('\n') ? `"${v}"` : v;
    return `${acc}${key}=${val}\n`;
  }, '');
  await fs.writeFile(filename, body, { encoding: 'utf-8' });
}
