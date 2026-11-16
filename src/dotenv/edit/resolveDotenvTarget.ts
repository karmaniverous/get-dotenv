/**
 * @packageDocumentation
 * Deterministic dotenv target selection across a multi-path cascade.
 *
 * This module extracts the “which file should we edit?” logic from the FS-level editor
 * so plugins/tools can reuse the same selection semantics as `editDotenvFile`.
 *
 * Notes:
 * - Selection is based on `paths` only (directories), consistent with get-dotenv overlay precedence.
 * - Default search order is reverse (last path wins).
 * - Candidates are searched in tiers: an existing target in any path, then the env-specific
 *   template (`<target>.<templateExtension>`), then (env scope only) the shared env template.
 *   Each tier searches every path, in search order, before the next tier starts.
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
  /**
   * Env name token substituted in place of the real env name when building the
   * shared env template filename (`scope: 'env'` only). For example, with the
   * default token `'env'`, the shared template for `.env.<env>.local` is
   * `.env.env.local.template`, and for `.env.<env>` it is `.env.env.template`.
   *
   * The shared env template is the last tier: it is used only when neither the
   * env-scoped target nor its env-specific template (`<target>.<templateExtension>`)
   * exists in any path. An env-specific template in any path beats a shared
   * template in any path. This option has no effect for `scope: 'global'`.
   *
   * @defaultValue `'env'`
   */
  sharedEnvTemplateToken?: string;
}

/** One tier of {@link resolveDotenvTarget} candidates: a filename searched in every path. */
interface CandidateTier {
  /** Filename searched for in each path. */
  name: string;
  /** Whether a match is a template to copy to the target, rather than the target itself. */
  template: boolean;
}

/**
 * The candidate tiers, highest precedence first: the target, its env-specific template, and
 * (env scope only) the shared env template. A tier whose filename repeats an earlier one is dropped.
 */
const candidateTiers = (
  opts: ResolveDotenvTargetOptions,
  filename: string,
): CandidateTier[] => {
  const templateExtension = opts.templateExtension ?? 'template';
  const tiers: CandidateTier[] = [
    { name: filename, template: false },
    { name: `${filename}.${templateExtension}`, template: true },
  ];
  if (opts.scope === 'env') {
    // Built like the env target, with the token in place of the env name.
    const shared = `${buildDotenvTargetFilename({
      ...(typeof opts.dotenvToken === 'string'
        ? { dotenvToken: opts.dotenvToken }
        : {}),
      ...(typeof opts.privateToken === 'string'
        ? { privateToken: opts.privateToken }
        : {}),
      scope: 'env',
      privacy: opts.privacy,
      env: opts.sharedEnvTemplateToken ?? 'env',
    })}.${templateExtension}`;
    if (!tiers.some((t) => t.name === shared))
      tiers.push({ name: shared, template: true });
  }
  return tiers;
};

/**
 * Resolve a deterministic dotenv target across `paths` based on scope/privacy selectors.
 *
 * Selection rules, in tiers (each tier searches every path, in search order, before the next):
 * 1. an existing target file (`<target>`);
 * 2. the env-specific template (`<target>.<templateExtension>`);
 * 3. `scope: 'env'` only: the shared env template, named like the target with
 *    `sharedEnvTemplateToken` in place of the env name (`.env.env.local.template`).
 *
 * So an existing target in any path beats a template in any path, and an env-specific
 * template in any path beats the shared one. For a template match, `targetPath` is the
 * target filename in the template's directory. Throws, listing every candidate checked,
 * when nothing matches.
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
  const pathsOrdered = orderedPaths(opts.paths, opts.searchOrder ?? 'reverse');

  const candidates: string[] = [];
  for (const tier of candidateTiers(opts, filename)) {
    for (const dir of pathsOrdered) {
      const candidate = path.resolve(dir, tier.name);
      candidates.push(candidate);
      if (!(await opts.fs.pathExists(candidate))) continue;
      const targetPath = path.resolve(dir, filename);
      return tier.template
        ? { targetPath, templatePath: candidate, filename }
        : { targetPath, filename };
    }
  }

  throw new Error(
    `Unable to locate dotenv target "${filename}" under provided paths, and no template was found. Checked: ${candidates.join(', ')}`,
  );
}
