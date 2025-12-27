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
  /**
   * Command to execute. A string is interpreted according to the shell preference;
   * an array is treated as argv for shell‑off execution.
   */
  command?: string | string[];
  /**
   * Merged root CLI options bag (JSON‑serializable) forwarded for nested composition
   * by downstream executors. Used to compute child overlays deterministically.
   */
  getDotenvCliOptions?: Record<string, unknown>;
  /**
   * Composed dotenv environment (string | undefined values) to inject into each child.
   */
  dotenvEnv?: Record<string, string | undefined>;
  /**
   * Space‑delimited patterns used to discover target working directories.
   */
  globs: string;
  /**
   * When true, continue processing remaining paths after a command error.
   */
  ignoreErrors?: boolean;
  /**
   * When true, list matched directories without executing a command.
   */
  list?: boolean;
  /**
   * Logger used for headings, listings, and diagnostics.
   */
  logger: Logger;
  /**
   * Resolve the batch root from the nearest package directory instead of CWD.
   */
  pkgCwd?: boolean;
  /**
   * Root path (relative to CWD or package directory) for resolving globs.
   */
  rootPath: string;
  /**
   * Shell to use when executing the command. A string selects a specific shell,
   * `false` disables the shell (plain execution), and `URL` mirrors executor options.
   */
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
    /** Command string to execute. */
    cmd: z.string(),
    /** Optional shell override for this script entry. */
    shell: z.union([z.string(), z.boolean()]).optional(),
  }),
]);

/**
 * Zod schema for batch plugin configuration.
 */
export const batchPluginConfigSchema = z.object({
  /** Optional scripts table scoped to the batch plugin. */
  scripts: z.record(z.string(), ScriptSchema).optional(),
  /** Optional default shell for batch execution (overridden by per-script shell when present). */
  shell: z.union([z.string(), z.boolean()]).optional(),
  /** Root path for discovery, relative to CWD (or package root when pkgCwd is true). */
  rootPath: z.string().optional(),
  /** Space-delimited glob patterns used to discover directories. */
  globs: z.string().optional(),
  /** When true, resolve the batch root from the nearest package directory. */
  pkgCwd: z.boolean().optional(),
});

/**
 * Batch plugin configuration object.
 */
export type BatchPluginConfig = z.infer<typeof batchPluginConfigSchema>;
