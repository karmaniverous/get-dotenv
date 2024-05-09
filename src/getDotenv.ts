import fs from 'fs-extra';
import _ from 'lodash';
import { nanoid } from 'nanoid';
import path from 'path';
import url from 'url';

import { dotenvExpandAll } from './dotenvExpand';
import {
  type GetDotenvDynamic,
  type GetDotenvDynamicFunction,
  type GetDotenvOptions,
  type ProcessEnv,
  resolveGetDotenvOptions,
} from './GetDotenvOptions';
import { readDotenv } from './readDotenv';

/**
 * Asynchronously process dotenv files of the form `.env[.<ENV>][.<PRIVATE_TOKEN>]`
 *
 * @param options - `GetDotenvOptions` object
 * @returns The combined parsed dotenv object.
 */
export const getDotenv = async (
  options: Partial<GetDotenvOptions> = {},
): Promise<ProcessEnv> => {
  // Apply defaults.
  const {
    defaultEnv,
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
    logger = console,
    outputPath,
    paths = [],
    privateToken = 'local',
    vars = {},
  } = await resolveGetDotenvOptions(options);

  // Read .env files.
  const loaded = paths.length
    ? await paths.reduce<Promise<ProcessEnv>>(async (e, p) => {
        const publicGlobal =
          excludePublic || excludeGlobal
            ? Promise.resolve({})
            : readDotenv(path.resolve(p, dotenvToken));

        const publicEnv =
          excludePublic || excludeEnv || (!env && !defaultEnv)
            ? Promise.resolve({})
            : readDotenv(
                path.resolve(p, `${dotenvToken}.${env ?? defaultEnv ?? ''}`),
              );

        const privateGlobal =
          excludePrivate || excludeGlobal
            ? Promise.resolve({})
            : readDotenv(path.resolve(p, `${dotenvToken}.${privateToken}`));

        const privateEnv =
          excludePrivate || excludeEnv || (!env && !defaultEnv)
            ? Promise.resolve({})
            : readDotenv(
                path.resolve(
                  p,
                  `${dotenvToken}.${env ?? defaultEnv ?? ''}.${privateToken}`,
                ),
              );

        const [
          eResolved,
          publicGlobalResolved,
          publicEnvResolved,
          privateGlobalResolved,
          privateEnvResolved,
        ] = await Promise.all([
          e,
          publicGlobal,
          publicEnv,
          privateGlobal,
          privateEnv,
        ]);

        return {
          ...eResolved,
          ...publicGlobalResolved,
          ...publicEnvResolved,
          ...privateGlobalResolved,
          ...privateEnvResolved,
        };
      }, Promise.resolve({}))
    : {};

  const outputKey = nanoid();

  const dotenv = dotenvExpandAll(
    {
      ...loaded,
      ...vars,
      ...(outputPath ? { [outputKey]: outputPath } : {}),
    },
    { progressive: true },
  );

  // Process dynamic variables.
  if (dynamicPath && !excludeDynamic) {
    const absDynamicPath = path.resolve(dynamicPath);

    if (await fs.exists(absDynamicPath)) {
      try {
        const { default: dynamic } = (await import(
          url.pathToFileURL(absDynamicPath).toString()
        )) as { default: GetDotenvDynamic };

        for (const key in dynamic)
          Object.assign(dotenv, {
            [key]: _.isFunction(dynamic[key])
              ? (dynamic[key] as GetDotenvDynamicFunction)(dotenv)
              : dynamic[key],
          });
      } catch {
        throw new Error(`Unable to import dynamic file: ${absDynamicPath}`);
      }
    }
  }

  // Write output file.
  if (outputPath) {
    const outputPath = dotenv[outputKey];
    if (!outputPath) throw new Error('Output path not found.');

    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete dotenv[outputKey];

    await fs.writeFile(
      outputPath,
      Object.keys(dotenv).reduce((contents, key) => {
        const value = dotenv[key] ?? '';
        return `${contents}${key}=${
          value.includes('\n') ? `"${value}"` : value
        }\n`;
      }, ''),
      { encoding: 'utf-8' },
    );
  }

  // Log result.
  if (log) logger.log(dotenv);

  // Load process.env.
  if (loadProcess) Object.assign(process.env, dotenv);

  return dotenv;
};
