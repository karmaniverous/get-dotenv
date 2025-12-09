/** src/util/dotenvFile.ts
 * Serialize a dotenv record to a file with minimal quoting (multiline values are quoted).
 *
 * Requirements addressed:
 * - One authoritative serializer/writer for consolidated dotenv output.
 * - Future-proof for ordering/sorting changes (today: insertion order).
 */
import fs from 'fs-extra';

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
