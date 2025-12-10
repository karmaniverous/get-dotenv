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
} from '@/src/cliHost';
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
} from '@/src/core';
export {
  dotenvExpand,
  dotenvExpandAll,
  dotenvExpandFromProcessEnv,
} from '@/src/dotenv/dotenvExpand';
export { interpolateDeep } from '@/src/util/interpolateDeep';
export { z } from 'zod';
