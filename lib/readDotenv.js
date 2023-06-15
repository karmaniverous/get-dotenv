import { parse } from 'dotenv';
import fs from 'fs-extra';

/**
 * Asynchronously read a dotenv file & parse it into an object.
 *
 * @async
 * @private
 * @function readDotenv
 *
 * @param {string} path - Any value.
 *
 * @returns {Object} The parsed dotenv object.
 */
export const readDotenv = async (path) => {
  try {
    return parse(await fs.readFile(path));
  } catch {
    return {};
  }
};

/**
 * Synchronously reads a dotenv file & parses it into an object.
 *
 * @private
 * @function readDotenvSync
 *
 * @param {string} path - Any value.
 *
 * @returns {Object} The parsed dotenv object.
 */
export const readDotenvSync = (path) => {
  try {
    return parse(fs.readFileSync(path));
  } catch {
    return {};
  }
};
