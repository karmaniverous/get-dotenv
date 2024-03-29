// npm imports
import fs from 'fs-extra';
import pickBy from 'lodash.pickby';
import path from 'path';
import { nanoid } from 'nanoid';

// lib imports
import { dotenvExpandAll } from './dotenvExpand.js';
import { getdotenvDefaultOptions } from './options.js';
import { readDotenv, readDotenvSync } from './readDotenv.js';

const pruneVars = (getdotenvDefaultOptions, options) =>
  pickBy(
    {
      ...(getdotenvDefaultOptions.vars ?? {}),
      ...(options.vars ?? {}),
    },
    (v) => v?.length
  );

/**
 * get-dotenv options type
 *
 * @typedef {Object} GetDotenvOptions
 * @property {string} [defaultEnv] - default target environment
 * @property {string} [dotenvToken] - token indicating a dotenv file
 * @property {string} [dynamicPath] - path to file exporting an object keyed to dynamic variable functions
 * @property {string} [env] - target environment
 * @property {bool} [excludeDynamic] - exclude dynamic variables
 * @property {bool} [excludeEnv] - exclude environment-specific variables
 * @property {bool} [excludeGlobal] - exclude global & dynamic variables
 * @property {bool} [excludePrivate] - exclude private variables
 * @property {bool} [excludePublic] - exclude public variables
 * @property {bool} [loadProcess] - load dotenv to process.env
 * @property {bool} [log] - log result to logger
 * @property {function} [logger] - logger object (defaults to console)
 * @property {string} [outputPath] - if populated, writes consolidated .env file to this path (follows {@link https://github.com/motdotla/dotenv-expand/blob/master/tests/.env dotenv-expand rules})
 * @property {string[]} [paths] - array of input directory paths
 * @property {string} [privateToken] - token indicating private variables
 * @property {object} [vars] - explicit variables to include
 */

/**
 * Asynchronously process dotenv files of the form .env[.<ENV>][.<PRIVATE_TOKEN>]
 *
 * @async
 * @function getDotenv
 *
 * @param {GetDotenvOptions} [options] - options object
 *
 * @returns {Promise<object>} The combined parsed dotenv object.
 */
export const getDotenv = async (options = {}) => {
  // Apply defaults.
  let {
    defaultEnv,
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
    logger = console,
    outputPath,
    paths,
    privateToken,
  } = { ...getdotenvDefaultOptions, ...options };

  const vars = pruneVars(getdotenvDefaultOptions, options);

  // Read .env files.
  const loaded = await paths.reduce(async (e, p) => {
    let publicGlobal =
      excludePublic || excludeGlobal
        ? {}
        : readDotenv(path.resolve(p, dotenvToken));
    let publicEnv =
      excludePublic || excludeEnv
        ? {}
        : readDotenv(path.resolve(p, `${dotenvToken}.${env ?? defaultEnv}`));
    let privateGlobal =
      excludePrivate || excludeGlobal
        ? {}
        : readDotenv(path.resolve(p, `${dotenvToken}.${privateToken}`));
    let privateEnv =
      excludePrivate || excludeEnv
        ? {}
        : readDotenv(
            path.resolve(
              p,
              `${dotenvToken}.${env ?? defaultEnv}.${privateToken}`
            )
          );

    [e, publicGlobal, publicEnv, privateGlobal, privateEnv] = await Promise.all(
      [e, publicGlobal, publicEnv, privateGlobal, privateEnv]
    );

    return {
      ...e,
      ...publicGlobal,
      ...publicEnv,
      ...privateGlobal,
      ...privateEnv,
    };
  }, {});

  const outputKey = nanoid();

  const dotenv = dotenvExpandAll({
    vars: {
      ...loaded,
      ...vars,
      ...(outputPath ? { [outputKey]: outputPath } : {}),
    },
    progressive: true,
  });

  // Process dynamic variables.
  if (dynamicPath && !excludeDynamic && (await fs.exists(dynamicPath))) {
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
  if (log) logger.log(dotenv);

  // Load process.env.
  if (loadProcess) Object.assign(process.env, dotenv);

  return dotenv;
};

/**
 * Synchronously process dotenv files of the form .env[.<ENV>][.<PRIVATETOKEN>]
 *
 * @function getDotenvSync
 *
 * @param {GetDotenvOptions} [options] - options object
 *
 * @returns {Object} The combined parsed dotenv object.
 */
export const getDotenvSync = (options = {}) => {
  // Apply defaults.
  let {
    defaultEnv,
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
    logger = console,
    outputPath,
    paths,
    privateToken,
  } = { ...getdotenvDefaultOptions, ...options };

  const vars = pruneVars(getdotenvDefaultOptions, options);

  // Read .env files.
  const loaded = paths.reduce((e, p) => {
    let publicGlobal =
      excludePublic || excludeGlobal
        ? {}
        : readDotenvSync(path.resolve(p, dotenvToken));
    let publicEnv =
      excludePublic || excludeEnv
        ? {}
        : readDotenvSync(
            path.resolve(p, `${dotenvToken}.${env ?? defaultEnv}`)
          );
    let privateGlobal =
      excludePrivate || excludeGlobal
        ? {}
        : readDotenvSync(path.resolve(p, `${dotenvToken}.${privateToken}`));
    let privateEnv =
      excludePrivate || excludeEnv
        ? {}
        : readDotenvSync(
            path.resolve(
              p,
              `${dotenvToken}.${env ?? defaultEnv}.${privateToken}`
            )
          );

    return {
      ...e,
      ...publicGlobal,
      ...publicEnv,
      ...privateGlobal,
      ...privateEnv,
    };
  }, {});

  const outputKey = nanoid();

  const dotenv = dotenvExpandAll({
    vars: {
      ...loaded,
      ...vars,
      ...(outputPath ? { [outputKey]: outputPath } : {}),
    },
    progressive: true,
  });

  // Process dynamic variables.
  if (dynamicPath && !excludeDynamic && fs.existsSync(dynamicPath)) {
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
  if (log) logger.log(dotenv);

  // Load process.env.
  if (loadProcess) Object.assign(process.env, dotenv);

  return dotenv;
};
