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
  groupPlugins,
  type InferPluginConfig,
  type PluginWithInstanceHelpers,
  readMergedOptions,
  type ScriptsTable,
  shouldCapture,
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
  type EntropyOptions,
  maybeWarnEntropy,
  redactDisplay,
  redactObject,
  type RedactOptions,
  traceChildEnv,
  type TraceChildEnvOptions,
} from './diagnostics';
export type {
  DotenvAssignmentSegment,
  DotenvBareKeySegment,
  DotenvDocument,
  DotenvDuplicateKeyStrategy,
  DotenvEditMode,
  DotenvEditOptions,
  DotenvEolMode,
  DotenvFs,
  DotenvPathSearchOrder,
  DotenvSegment,
  DotenvTargetPrivacy,
  DotenvTargetScope,
  DotenvUpdateMap,
  DotenvUpdateValue,
  EditDotenvFileOptions,
  EditDotenvFileResult,
} from './dotenv';
export {
  applyDotenvEdits,
  dotenvExpand,
  dotenvExpandAll,
  dotenvExpandFromProcessEnv,
  editDotenvFile,
  editDotenvText,
  parseDotenvDocument,
  renderDotenvDocument,
} from './dotenv';
export type {
  DotenvConfigProvenanceEntry,
  DotenvDynamicProvenanceEntry,
  DotenvDynamicSource,
  DotenvFileProvenanceEntry,
  DotenvProvenance,
  DotenvProvenanceEntry,
  DotenvProvenanceEntryBase,
  DotenvProvenanceKind,
  DotenvProvenanceOp,
  DotenvVarsProvenanceEntry,
} from './env';
export * from './util';
/** @deprecated Import \{ z \} from 'zod' directly. Will be removed in v7. */
export { z } from 'zod';
