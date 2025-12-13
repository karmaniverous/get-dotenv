/**
 * @packageDocumentation
 * Public package entrypoint for get-dotenv. Re-exports the core programmatic API,
 * the CLI host, and utility helpers for consumers. See the subpath modules for
 * detailed documentation: `@karmaniverous/get-dotenv/cli`, `@karmaniverous/get-dotenv/cliHost`,
 * `@karmaniverous/get-dotenv/config`, and the environment overlay helpers under `@karmaniverous/get-dotenv/env/overlay`.
 */

export { createCli, type CreateCliOptions } from './cli';
export {
  buildSpawnEnv,
  definePlugin,
  defineScripts,
  GetDotenvCli,
  type GetDotenvCliOptions,
  type GetDotenvCliPlugin,
  type GetDotenvCliPublic,
  type InferPluginConfig,
  type PluginWithInstanceHelpers,
  readMergedOptions,
  type ScriptsTable,
} from './cliHost';
export {
  defineDynamic,
  defineGetDotenvConfig,
  type DynamicFn,
  type DynamicMap,
  getDotenv,
  getDotenvCliOptions2Options,
  type GetDotenvConfig,
  type GetDotenvDynamic,
  type GetDotenvOptions,
  type InferGetDotenvVarsFromConfig,
  type ProcessEnv,
} from './core';
export { baseRootOptionDefaults } from './defaults';
export {
  dotenvExpand,
  dotenvExpandAll,
  dotenvExpandFromProcessEnv,
} from './dotenv';
export { interpolateDeep } from './util';
export { z } from 'zod';
