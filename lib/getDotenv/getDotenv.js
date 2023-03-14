import path from 'path';
import { expand } from 'dotenv-expand';
import { readDotenv, readDotenvSync } from '../readDotEnv/readDotenv.js';
import __dirname from './dirname.cjs';

/**
 * get-dotenv options type
 *
 * @typedef {Object} OptionsType
 *
 * @property {string} [dotenvToken] - token indicating a dotenv file (default: '.env')
 * @property {string} [dynamicPath] - path to file exporting an object keyed to dynamic variable functions
 * @property {string} [env] - target environment
 * @property {bool} [excludePrivate] - exclude private variables (default: false)
 * @property {bool} [excludePublic] - exclude public variables (default: false)
 * @property {bool} [loadProcess] - load dotenv to process.env (default: false)
 * @property {bool} [log] - log result to console (default: false)
 * @property {string[]} [paths] - array of target directory paths (default ['./'])
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
 * @returns {Promise<object>} The combined parsed dotenv object.
 */
export const getDotenv = async ({
  dotenvToken = '.env',
  env,
  dynamicPath,
  excludePrivate = false,
  excludePublic = false,
  loadProcess = false,
  log = false,
  paths = ['./'],
  privateToken = 'local',
} = {}) => {
  // Read .env files.
  const parsed = await paths.reduce(
    async (e, p) => ({
      ...(await e),
      ...(excludePublic
        ? {}
        : {
            ...(await readDotenv(path.resolve(p, dotenvToken))),
            ...(env
              ? await readDotenv(path.resolve(p, `${dotenvToken}.${env}`))
              : {}),
          }),
      ...(excludePrivate
        ? {}
        : {
            ...(await readDotenv(
              path.resolve(p, `${dotenvToken}.${privateToken}`)
            )),
            ...(env
              ? await readDotenv(
                  path.resolve(p, `${dotenvToken}.${env}.${privateToken}`)
                )
              : {}),
          }),
    }),
    []
  );

  const { error, parsed: dotenv } = expand({
    ignoreProcessEnv: true,
    parsed,
  });

  if (error) throw new Error(error);

  // Process dynamic variables.
  if (dynamicPath) {
    const { default: dynamic } = await import(
      path.relative(__dirname, dynamicPath).replace(/\\/g, '/')
    );

    Object.keys(dynamic).forEach((key) => {
      Object.assign(dotenv, { [key]: dynamic[key](dotenv) });
    });
  }

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
  dynamicPath,
  env,
  excludePrivate = false,
  excludePublic = false,
  loadProcess = false,
  log = false,
  paths = ['./'],
  privateToken = 'local',
} = {}) => {
  // Read .env files.
  const parsed = paths.reduce(
    (e, p) => ({
      ...e,
      ...(excludePublic
        ? {}
        : {
            ...readDotenvSync(path.resolve(p, dotenvToken)),
            ...(env
              ? readDotenvSync(path.resolve(p, `${dotenvToken}.${env}`))
              : {}),
          }),
      ...(excludePrivate
        ? {}
        : {
            ...readDotenvSync(
              path.resolve(p, `${dotenvToken}.${privateToken}`)
            ),
            ...(env
              ? readDotenvSync(
                  path.resolve(p, `${dotenvToken}.${env}.${privateToken}`)
                )
              : {}),
          }),
    }),
    []
  );

  const { error, parsed: dotenv } = expand({
    ignoreProcessEnv: true,
    parsed,
  });

  if (error) throw new Error(error);

  // Throw error if dynamicPath is set.
  if (dynamicPath) throw new Error('dynamicPath not supported in sync mode');

  // Log result.
  if (log) console.log(dotenv);

  // Load process.env.
  if (loadProcess) Object.assign(process.env, dotenv);

  return dotenv;
};
