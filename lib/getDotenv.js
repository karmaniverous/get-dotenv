// npm imports
import { expand } from 'dotenv-expand';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuid } from 'uuid';

// lib imports
import { readDotenv, readDotenvSync } from './readDotenv.js';

/**
 * get-dotenv options type
 *
 * @typedef {Object} OptionsType
 *
 * @property {string} [dotenvToken] - token indicating a dotenv file (default: '.env')
 * @property {string} [dynamicPath] - path to file exporting an object keyed to dynamic variable functions
 * @property {string} [env] - target environment
 * @property {bool} [excludeDynamic] - exclude dynamic variables (default: false)
 * @property {bool} [excludeEnv] - exclude environment-specific variables (default: false)
 * @property {bool} [excludeGlobal] - exclude global & dynamic variables (default: false)
 * @property {bool} [excludePrivate] - exclude private variables (default: false)
 * @property {bool} [excludePublic] - exclude public variables (default: false)
 * @property {bool} [loadProcess] - load dotenv to process.env (default: false)
 * @property {bool} [log] - log result to console (default: false)
 * @property {string} [outputPath] - if populated, writes consolidated .env file to this path (follows {@link https://github.com/motdotla/dotenv-expand/blob/master/tests/.env dotenv-expand rules})
 * @property {string[]} [paths] - array of input directory paths (default ['./'])
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
  excludeDynamic = false,
  excludeEnv = false,
  excludeGlobal = false,
  excludePrivate = false,
  excludePublic = false,
  loadProcess = false,
  log = false,
  outputPath,
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
            ...(excludeGlobal
              ? {}
              : await readDotenv(path.resolve(p, dotenvToken))),
            ...(env && !excludeEnv
              ? await readDotenv(path.resolve(p, `${dotenvToken}.${env}`))
              : {}),
          }),
      ...(excludePrivate
        ? {}
        : {
            ...(excludeGlobal
              ? {}
              : await readDotenv(
                  path.resolve(p, `${dotenvToken}.${privateToken}`)
                )),
            ...(env && !excludeEnv
              ? await readDotenv(
                  path.resolve(p, `${dotenvToken}.${env}.${privateToken}`)
                )
              : {}),
          }),
    }),
    {}
  );

  const outputKey = uuid();
  const { parsed: dotenv } = expand({
    ignoreProcessEnv: true,
    parsed: {
      ...parsed,
      ...(outputPath ? { [outputKey]: outputPath } : {}),
    },
  });

  // Process dynamic variables.
  if (dynamicPath && !excludeDynamic) {
    const dynamic = new Function(
      `return ${(await fs.readFile(dynamicPath)).toString()}`
    )()(dotenv);
    Object.keys(dynamic).forEach((key) => {
      Object.assign(dotenv, {
        [key]:
          typeof dynamic[key] === 'function'
            ? dynamic[key](dotenv)
            : dynamic[key],
      });
    });
  }

  // Write output file.
  if (outputPath) {
    outputPath = dotenv[outputKey];
    delete dotenv[outputKey];

    await fs.writeFile(
      outputPath,
      Object.keys(dotenv).reduce((contents, key) => {
        const value = dotenv[key] ?? '';
        return `${contents}${key}=${
          value.includes('\n') ? `"${value}"` : value
        }\n`;
      }, ''),
      { encoding: 'utf-8' }
    );
  }

  // Log result.
  if (log) console.log(dotenv);

  // Load process.env.
  if (loadProcess)
    Object.assign(process.env, dotenv, {
      getdotenvOptions: JSON.stringify({
        dotenvToken,
        dynamicPath,
        env,
        excludeDynamic,
        excludeEnv,
        excludeGlobal,
        excludePrivate,
        excludePublic,
        loadProcess,
        log,
        outputPath,
        paths,
        privateToken,
      }),
    });

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
  excludeDynamic = false,
  excludeEnv = false,
  excludeGlobal = false,
  excludePrivate = false,
  excludePublic = false,
  loadProcess = false,
  log = false,
  outputPath,
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
            ...(excludeGlobal
              ? {}
              : readDotenvSync(path.resolve(p, dotenvToken))),
            ...(env && !excludeEnv
              ? readDotenvSync(path.resolve(p, `${dotenvToken}.${env}`))
              : {}),
          }),
      ...(excludePrivate
        ? {}
        : {
            ...(excludeGlobal
              ? {}
              : readDotenvSync(
                  path.resolve(p, `${dotenvToken}.${privateToken}`)
                )),
            ...(env && !excludeEnv
              ? readDotenvSync(
                  path.resolve(p, `${dotenvToken}.${env}.${privateToken}`)
                )
              : {}),
          }),
    }),
    {}
  );

  const outputKey = uuid();
  const { parsed: dotenv } = expand({
    ignoreProcessEnv: true,
    parsed: {
      ...parsed,
      ...(outputPath ? { [outputKey]: outputPath } : {}),
    },
  });

  // Process dynamic variables.
  if (dynamicPath && !excludeDynamic) {
    const dynamic = new Function(
      `return ${fs.readFileSync(dynamicPath).toString()}`
    )()(dotenv);
    Object.keys(dynamic).forEach((key) => {
      Object.assign(dotenv, {
        [key]:
          typeof dynamic[key] === 'function'
            ? dynamic[key](dotenv)
            : dynamic[key],
      });
    });
  }

  // Write output file.
  if (outputPath) {
    outputPath = dotenv[outputKey];
    delete dotenv[outputKey];

    fs.writeFileSync(
      outputPath,
      Object.keys(dotenv).reduce((contents, key) => {
        const value = dotenv[key] ?? '';
        return `${contents}${key}=${
          value.includes('\n') ? `"${value}"` : value
        }\n`;
      }, ''),
      { encoding: 'utf-8' }
    );
  }

  // Log result.
  if (log) console.log(dotenv);

  // Load process.env.
  if (loadProcess)
    Object.assign(process.env, dotenv, {
      getdotenvOptions: JSON.stringify({
        dotenvToken,
        dynamicPath,
        env,
        excludeDynamic,
        excludeEnv,
        excludeGlobal,
        excludePrivate,
        excludePublic,
        loadProcess,
        log,
        outputPath,
        paths,
        privateToken,
      }),
    });

  return dotenv;
};