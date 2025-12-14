/**
 * @packageDocumentation
 * Public surface of the get-dotenv CLI host. Re-exports the host class,
 * plugin contracts, execution helpers, and strongly-typed utilities used to
 * compose plugin-based CLIs.
 */

export type {
  DefineSpec,
  GetDotenvCliPlugin,
  GetDotenvCliPublic,
  InferPluginConfig,
  PluginChildEntry,
  PluginNamespaceOverride,
  PluginWithInstanceHelpers,
  ResolveAndLoadOptions,
} from './contracts';
export { definePlugin } from './definePlugin';
export type { RunCommandOptions, RunCommandResultOptions } from './exec';
export { runCommand, runCommandResult, shouldCapture } from './exec';
export { GetDotenvCli } from './GetDotenvCli';
export {
  baseGetDotenvCliOptions,
  type GetDotenvCliOptions,
  type Scripts,
} from './GetDotenvCliOptions';
export { getRootCommand } from './getRootCommand';
export { type ResolvedHelpConfig, toHelpConfig } from './helpConfig';
export {
  composeNestedEnv,
  maybePreserveNodeEvalArgv,
  stripOne,
} from './invoke';
export type { PluginFlattenedEntry } from './paths';
export { readMergedOptions } from './readMergedOptions';
export { resolveCommand, resolveShell } from './resolve';
export {
  resolveCliOptions,
  type ResolveCliOptionsResult,
} from './resolveCliOptions';
export { buildSpawnEnv } from './spawnEnv';
export type { ScriptsTable } from './types';
export {
  type BrandOptions,
  defineScripts,
  type GetDotenvCliCtx,
  type RootOptionsShape,
  type ScriptDef,
} from './types';
/** @deprecated Import \{ z \} from 'zod' directly. Will be removed in v7. */
export { z } from 'zod';
