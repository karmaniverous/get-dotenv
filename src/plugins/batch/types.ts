import { z } from 'zod';

import type { ScriptsTable } from '@/src/cliHost';
import type { Logger } from '@/src/core';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { execShellCommandBatch } from './execShellCommandBatch';

/**
 * Options provided to the batch plugin factory.
 *
 * @public
 */
export interface BatchPluginOptions {
  /**
   * Scripts table used to resolve command names and optional per-script shell overrides.
   */
  scripts?: ScriptsTable;
  /**
   * Global shell preference for batch execution; overridden by per-script shell when present.
   */
  shell?: string | boolean;
}

/**
 * Options for discovering batch working directories from a root path and globs.
 *
 * @public
 */
export interface BatchGlobPathsOptions {
  /**
   * Space-delimited glob patterns relative to {@link BatchGlobPathsOptions.rootPath}.
   * Each pattern is resolved using posix-style separators and must resolve to
   * directories (files are ignored).
   */
  globs: string;
  /**
   * Logger used for user-facing messages (errors, headings, and listings).
   */
  logger: Logger;
  /**
   * When true, resolve the batch root from the nearest package directory
   * instead of the current working directory.
   */
  pkgCwd?: boolean;
  /**
   * Path to the batch root directory, resolved from the current working directory
   * (or package directory when {@link BatchGlobPathsOptions.pkgCwd} is true).
   */
  rootPath: string;
}

/**
 * Arguments for {@link execShellCommandBatch} — batch execution over discovered working directories.
 *
 * @public
 */
export interface ExecShellCommandBatchOptions {
  command?: string | string[];
  getDotenvCliOptions?: Record<string, unknown>;
  dotenvEnv?: Record<string, string | undefined>;
  globs: string;
  ignoreErrors?: boolean;
  list?: boolean;
  logger: Logger;
  pkgCwd?: boolean;
  rootPath: string;
  shell: string | boolean | URL;
}

/**
 * Flags parsed at the batch parent command level (shared between invoker paths).
 *
 * @public
 */
export interface BatchParentInvokerFlags {
  /** Command to execute. */
  command?: string;
  /** Space-delimited glob patterns. */
  globs?: string;
  /** List directories without executing. */
  list?: boolean;
  /** Ignore errors and continue. */
  ignoreErrors?: boolean;
  /** Use package directory as root. */
  pkgCwd?: boolean;
  /** Root path for discovery. */
  rootPath?: string;
}

/**
 * Options parsed for the batch "cmd" subcommand.
 * Currently empty; reserved for future extension.
 *
 * @public
 */

export interface BatchCmdSubcommandOptions {}

/**
 * Zod schema for a single script entry (string or object).
 */
export const ScriptSchema = z.union([
  z.string(),
  z.object({
    cmd: z.string(),
    shell: z.union([z.string(), z.boolean()]).optional(),
  }),
]);

/**
 * Zod schema for batch plugin configuration.
 */
export const BatchConfigSchema = z.object({
  scripts: z.record(z.string(), ScriptSchema).optional(),
  shell: z.union([z.string(), z.boolean()]).optional(),
  rootPath: z.string().optional(),
  globs: z.string().optional(),
  pkgCwd: z.boolean().optional(),
});
/**
 * Batch plugin configuration object.
 */
export type BatchConfig = z.infer<typeof BatchConfigSchema>;
