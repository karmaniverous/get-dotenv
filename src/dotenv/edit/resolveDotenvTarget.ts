/**
 * @packageDocumentation
 * Deterministic dotenv target selection across a multi-path cascade.
 *
 * This module extracts the “which file should we edit?” logic from the FS-level editor
 * so plugins/tools can reuse the same selection semantics as {@link editDotenvFile}.
 *
 * Notes:
 * - Selection is based on `paths` only (directories), consistent with get-dotenv overlay precedence.
 * - Default search order is reverse (last path wins).
 * - Template discovery is supported via `<target>.<templateExtension>` and returns the template path
 *   when the concrete target is missing.
 */

import path from 'node:path';

import type {
  DotenvFs,
  DotenvPathSearchOrder,
  DotenvTargetPrivacy,
  DotenvTargetScope,
} from './types';

const resolveEnvName = (
  env?: string,
  defaultEnv?: string,
): string | undefined =>
  typeof env === 'string' && env.length > 0
    ? env
    : typeof defaultEnv === 'string' && defaultEnv.length > 0
      ? defaultEnv
      : undefined;

/**
 * Options for {@link buildDotenvTargetFilename}.
 *
 * @public
 */
export interface BuildDotenvTargetFilenameOptions {
  /** Base dotenv filename token. Defaults to `'.env'`. */
  dotenvToken?: string;
  /** Private token used for private dotenv files. Defaults to `'local'`. */
  privateToken?: string;
  /** Selected environment name (used when `scope` is `'env'`). */
  env?: string;
  /** Default environment name used when `env` is not provided. */
  defaultEnv?: string;
  /** Scope axis (global vs env-specific). */
  scope: DotenvTargetScope;
  /** Privacy axis (public vs private). */
  privacy: DotenvTargetPrivacy;
}

/**
 * Build the dotenv filename for a selector (scope × privacy) using the same naming
 * convention as get-dotenv.
 *
 * @param opts - Filename selector options.
 * @returns The filename token (for example, `.env.dev.local`).
 * @throws Error when `scope` is `'env'` and neither `env` nor `defaultEnv` is provided.
 *
 * @public
 */
export function buildDotenvTargetFilename(
  opts: BuildDotenvTargetFilenameOptions,
): string {
  const dotenvToken = opts.dotenvToken ?? '.env';
  const privateToken = opts.privateToken ?? 'local';
  const envName = resolveEnvName(opts.env, opts.defaultEnv);

  const parts = [dotenvToken];
  if (opts.scope === 'env') {
    if (!envName) {
      throw new Error(
        `Unable to resolve env-scoped dotenv filename: env is required.`,
      );
    }
    parts.push(envName);
  }
  if (opts.privacy === 'private') parts.push(privateToken);

  return parts.join('.');
}

const orderedPaths = (
  pathsIn: string[],
  order: DotenvPathSearchOrder,
): string[] => {
  const list = pathsIn.slice();
  return order === 'forward' ? list : list.reverse();
};

/**
 * Result of {@link resolveDotenvTarget}.
 *
 * @public
 */
export interface ResolveDotenvTargetResult {
  /** Absolute path to the resolved dotenv file target. */
  targetPath: string;
  /**
   * Optional absolute path to the template file when selected due to a missing target.
   * This is a sibling of {@link ResolveDotenvTargetResult.targetPath}.
   */
  templatePath?: string;
  /** The filename token used for selection (for example, `.env.local`). */
  filename: string;
}

/**
 * Options for {@link resolveDotenvTarget}.
 *
 * @public
 */
export interface ResolveDotenvTargetOptions extends BuildDotenvTargetFilenameOptions {
  /** Search paths (directories) to locate the target dotenv file. */
  paths: string[];
  /** Filesystem port used for existence checks. */
  fs: DotenvFs;
  /** Path search order. Defaults to `'reverse'` (last path wins). */
  searchOrder?: DotenvPathSearchOrder;
  /** Template extension used for bootstrap discovery. Defaults to `'template'`. */
  templateExtension?: string;
}

/**
 * Resolve a deterministic dotenv target across `paths` based on scope/privacy selectors.
 *
 * Selection rules:
 * - Iterates `paths` in the requested search order.
 * - Returns the first existing target file.
 * - Otherwise, returns the first sibling template file (`<target>.<templateExtension>`) when present.
 * - Throws when neither a target nor a template exists anywhere under `paths`.
 *
 * @param opts - Resolver options (paths + selector + fs port).
 * @returns The resolved target path and optional template path.
 *
 * @public
 */
export async function resolveDotenvTarget(
  opts: ResolveDotenvTargetOptions,
): Promise<ResolveDotenvTargetResult> {
  const filename = buildDotenvTargetFilename(opts);
  const templateExtension = opts.templateExtension ?? 'template';
  const searchOrder = opts.searchOrder ?? 'reverse';

  const pathsOrdered = orderedPaths(opts.paths, searchOrder);

  for (const dir of pathsOrdered) {
    const targetPath = path.resolve(dir, filename);
    if (await opts.fs.pathExists(targetPath)) {
      return { targetPath, filename };
    }

    const templatePath = `${targetPath}.${templateExtension}`;
    if (await opts.fs.pathExists(templatePath)) {
      return { targetPath, templatePath, filename };
    }
  }

  throw new Error(
    `Unable to locate dotenv target "${filename}" under provided paths, and no template was found.`,
  );
}
