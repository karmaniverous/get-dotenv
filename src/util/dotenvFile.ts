import fs from 'fs-extra';

import type { ProcessEnv } from '@/src/core';
import { formatDotenvValue } from '@/src/dotenv/formatDotenvValue';

/**
 * Serialize a dotenv record to text: one `KEY=value` line per key, in
 * insertion order, with `undefined` written as an empty value. Each value is
 * quoted and escaped as needed (the rules of the dotenv file-editing API,
 * `editDotenvFile`: {@link formatDotenvValue})
 * so that get-dotenv (dotenv's `parse`, then its expander) reads the text
 * back to the same record: a `$` the expander would act on is written `\$`.
 *
 * @param data - Env-like map of values to write (values may be `undefined`).
 * @returns The dotenv text.
 * @throws Error when a value can't be written so that dotenv reads it back
 * unchanged (the message names the key).
 */
export const formatDotenvRecord = (data: ProcessEnv): string =>
  Object.keys(data).reduce(
    (acc, key) =>
      `${acc}${key}=${formatDotenvValue({ key, value: data[key] ?? '' }).token}\n`,
    '',
  );

/**
 * Write a dotenv record to a file (see {@link formatDotenvRecord}).
 *
 * @param filename - Destination dotenv file path.
 * @param data - Env-like map of values to write (values may be `undefined`).
 * @returns A `Promise\<void\>` which resolves when the file has been written.
 * @throws Error when a value can't be written so that dotenv reads it back
 * unchanged; nothing is written then.
 */
export async function writeDotenvFile(
  filename: string,
  data: ProcessEnv,
): Promise<void> {
  await fs.writeFile(filename, formatDotenvRecord(data), { encoding: 'utf-8' });
}
