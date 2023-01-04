import path from 'path';
import { expand } from 'dotenv-expand';
import { readDotenv, readDotenvSync } from '../readDotEnv/readDotenv.js';

/**
 * get-dotenv options type
 *
 * @typedef {Object} OptionsType
 *
 * @property {string} [dotenvToken] - token indicating a dotenv file (default: '.env')
 * @property {string} [env] - target environment
 * @property {bool} [excludePrivate] - exclude private variables (default: false)
 * @property {bool} [excludePublic] - exclude public variables (default: false)
 * @property {bool} [loadProcess] - load dotenv to process.env (default: false)
 * @property {bool} [log] - log result to console (default: false)
 * @property {string} [path] - path to target directory (default './')
 * @property {string} [privateToken] - token indicating private variables (default: 'local').
 */

/**
 * Asynchronously process dotenv files of the form .env[.<ENV>][.<PRIVATE_TOKEN>]
 *
 * @async
 * @function getDotenv
 *
 * @param {OptionsType} [options] - options object
 *
 * @returns {Object} The combined parsed dotenv object.
 */
export const getDotenv = async ({
  dotenvToken = '.env',
  env,
  excludePrivate = false,
  excludePublic = false,
  loadProcess = false,
  log = false,
  path: dotenvPath = './',
  privateToken = 'local',
} = {}) => {
  // Read .env files.
  const dotenv = expand({
    ...(excludePublic
      ? {}
      : {
          ...(await readDotenv(path.resolve(dotenvPath, dotenvToken))),
          ...(env
            ? await readDotenv(
                path.resolve(dotenvPath, `${dotenvToken}.${env}`)
              )
            : {}),
        }),
    ...(excludePrivate
      ? {}
      : {
          ...(await readDotenv(
            path.resolve(dotenvPath, `${dotenvToken}.${privateToken}`)
          )),
          ...(env
            ? await readDotenv(
                path.resolve(
                  dotenvPath,
                  `${dotenvToken}.${env}.${privateToken}`
                )
              )
            : {}),
        }),
  });

  // Log result.
  if (log) console.log(dotenv);

  // Load process.env.
  if (loadProcess) Object.assign(process.env, dotenv);

  return dotenv;
};

/**
 * Synchronously process dotenv files of the form .env[.<ENV>][.<PRIVATETOKEN>]
 *
 * @function getDotenvSync
 *
 * @param {OptionsType} [options] - options object
 *
 * @returns {Object} The combined parsed dotenv object.
 */
export const getDotenvSync = ({
  dotenvToken = '.env',
  env,
  excludePrivate = false,
  excludePublic = false,
  loadProcess = false,
  log = false,
  path: dotenvPath = './',
  privateToken = 'local',
} = {}) => {
  // Read .env files.
  const dotenv = expand({
    ...(excludePublic
      ? {}
      : {
          ...readDotenvSync(path.resolve(dotenvPath, dotenvToken)),
          ...(env
            ? readDotenvSync(path.resolve(dotenvPath, `${dotenvToken}.${env}`))
            : {}),
        }),
    ...(excludePrivate
      ? {}
      : {
          ...readDotenvSync(
            path.resolve(dotenvPath, `${dotenvToken}.${privateToken}`)
          ),
          ...(env
            ? readDotenvSync(
                path.resolve(
                  dotenvPath,
                  `${dotenvToken}.${env}.${privateToken}`
                )
              )
            : {}),
        }),
  });

  // Log result.
  if (log) console.log(dotenv);

  // Load process.env.
  if (loadProcess) Object.assign(process.env, dotenv);

  return dotenv;
};
