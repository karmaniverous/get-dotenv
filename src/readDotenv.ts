import { parse } from 'dotenv';
import fs from 'fs-extra';

import { type ProcessEnv } from './GetDotenvOptions';

/**
 * Asynchronously read a dotenv file & parse it into an object.
 *
 * @param path - Path to dotenv file.
 * @returns The parsed dotenv object.
 */
export const readDotenv = async (path: string): Promise<ProcessEnv> => {
  try {
    return (await fs.exists(path)) ? parse(await fs.readFile(path)) : {};
  } catch {
    return {};
  }
};

/**
 * Synchronously reads a dotenv file & parses it into an object.
 *
 * @param path - Path to dotenv file.
 * @returns The parsed dotenv object.
 */
export const readDotenvSync = (path: string): ProcessEnv => {
  try {
    return fs.existsSync(path) ? parse(fs.readFileSync(path)) : {};
  } catch {
    return {};
  }
};
