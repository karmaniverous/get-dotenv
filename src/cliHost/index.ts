export type {
  DefineSpec,
  GetDotenvCliPlugin,
  GetDotenvCliPublic,
  InferPluginConfig,
  PluginWithInstanceHelpers,
} from './contracts';
export { definePlugin } from './definePlugin';
export { runCommand, runCommandResult } from './exec';
export { GetDotenvCli, type GetDotenvCliCtx } from './GetDotenvCliq';
export {
  baseGetDotenvCliOptions,
  type GetDotenvCliOptions,
  type Scripts,
} from './GetDotenvCliOptions';
export { getRootCommand } from './getRootCommand';
export { toHelpConfig } from './helpConfig';
export {
  composeNestedEnv,
  maybePreserveNodeEvalArgv,
  stripOne,
} from './invoke';
export { readMergedOptions } from './readMergedOptions';
export { resolveCommand, resolveShell } from './resolve';
export { resolveCliOptions } from './resolveCliOptions';
export { buildSpawnEnv } from './spawnEnv';
export type { ScriptsTable } from './types';
export { defineScripts, type RootOptionsShape } from './types';
export { z } from 'zod';
