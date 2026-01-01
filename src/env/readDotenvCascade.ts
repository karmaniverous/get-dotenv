/**
 * Read dotenv files from the deterministic cascade and record provenance.
 *
 * Requirements addressed:
 * - Provenance entries for `kind: 'file'` include scope/privacy/env/path/file (descriptor-only).
 * - Provenance is ordered in ascending precedence as layers are applied.
 * - Uses the same file naming convention as get-dotenv (public/private × global/env).
 */

import path from 'node:path';

import type { ProcessEnv } from '@/src/core';
import { readDotenv } from '@/src/core';
import { dotenvExpandAll } from '@/src/dotenv';

import {
  createDotenvProvenance,
  type DotenvFileProvenanceEntry,
  type DotenvProvenance,
  pushDotenvProvenance,
} from './provenance';

/**
 * Inputs for reading the dotenv cascade with provenance.
 *
 * @public
 */
export interface ReadDotenvCascadeArgs {
  /** Base dotenv filename token (default `.env`). */
  dotenvToken?: string;
  /** Private token suffix (default `local`). */
  privateToken?: string;
  /** Ordered search paths (directories). */
  paths: string[];
  /** Selected env name (used for env-scoped files). */
  env?: string;
  /** Default env name (used when `env` is not provided). */
  defaultEnv?: string;
  /** Exclude env-scoped files. */
  excludeEnv?: boolean;
  /** Exclude global files. */
  excludeGlobal?: boolean;
  /** Exclude private files. */
  excludePrivate?: boolean;
  /** Exclude public files. */
  excludePublic?: boolean;
}

/**
 * Result of reading the dotenv cascade with provenance.
 *
 * @public
 */
export interface ReadDotenvCascadeResult {
  /** Expanded dotenv map composed from file sources only. */
  dotenv: ProcessEnv;
  /** File-only provenance history for keys in {@link ReadDotenvCascadeResult.dotenv}. */
  provenance: DotenvProvenance;
}

const resolveEnvName = (
  env?: string,
  defaultEnv?: string,
): string | undefined =>
  typeof env === 'string' && env.length > 0
    ? env
    : typeof defaultEnv === 'string' && defaultEnv.length > 0
      ? defaultEnv
      : undefined;

const buildFileToken = (args: {
  dotenvToken: string;
  privateToken: string;
  scope: 'global' | 'env';
  privacy: 'public' | 'private';
  envName?: string;
}): string => {
  const { dotenvToken, privateToken, scope, privacy, envName } = args;
  const parts = [dotenvToken];
  if (scope === 'env') parts.push(envName ?? '');
  if (privacy === 'private') parts.push(privateToken);
  return parts.join('.');
};

const recordFileLayer = (
  prov: DotenvProvenance,
  vars: ProcessEnv,
  entry: Omit<DotenvFileProvenanceEntry, 'kind' | 'op'>,
): void => {
  for (const key of Object.keys(vars)) {
    pushDotenvProvenance(prov, key, { kind: 'file', op: 'set', ...entry });
  }
};

/**
 * Read and expand dotenv vars from the deterministic file cascade, recording file provenance.
 *
 * @param args - Cascade selector options (tokens/paths/excludes/env).
 * @returns Expanded dotenv and provenance.
 *
 * @public
 */
export async function readDotenvCascadeWithProvenance(
  args: ReadDotenvCascadeArgs,
): Promise<ReadDotenvCascadeResult> {
  const dotenvToken = args.dotenvToken ?? '.env';
  const privateToken = args.privateToken ?? 'local';
  const envName = resolveEnvName(args.env, args.defaultEnv);
  const prov = createDotenvProvenance();

  const shouldPublicGlobal = !(args.excludePublic || args.excludeGlobal);
  const shouldPublicEnv = !(args.excludePublic || args.excludeEnv) && !!envName;
  const shouldPrivateGlobal = !(args.excludePrivate || args.excludeGlobal);
  const shouldPrivateEnv =
    !(args.excludePrivate || args.excludeEnv) && !!envName;

  let loaded: ProcessEnv = {};

  for (const p of args.paths) {
    const readOne = async (fileToken: string) => {
      const abs = path.resolve(p, fileToken);
      return readDotenv(abs);
    };

    if (shouldPublicGlobal) {
      const token = buildFileToken({
        dotenvToken,
        privateToken,
        scope: 'global',
        privacy: 'public',
      });
      const vars = await readOne(token);
      recordFileLayer(prov, vars, {
        scope: 'global',
        privacy: 'public',
        path: p,
        file: token,
      });
      loaded = { ...loaded, ...vars };
    }

    if (shouldPublicEnv && envName) {
      const token = buildFileToken({
        dotenvToken,
        privateToken,
        scope: 'env',
        privacy: 'public',
        envName,
      });
      const vars = await readOne(token);
      recordFileLayer(prov, vars, {
        scope: 'env',
        privacy: 'public',
        env: envName,
        path: p,
        file: token,
      });
      loaded = { ...loaded, ...vars };
    }

    if (shouldPrivateGlobal) {
      const token = buildFileToken({
        dotenvToken,
        privateToken,
        scope: 'global',
        privacy: 'private',
      });
      const vars = await readOne(token);
      recordFileLayer(prov, vars, {
        scope: 'global',
        privacy: 'private',
        path: p,
        file: token,
      });
      loaded = { ...loaded, ...vars };
    }

    if (shouldPrivateEnv && envName) {
      const token = buildFileToken({
        dotenvToken,
        privateToken,
        scope: 'env',
        privacy: 'private',
        envName,
      });
      const vars = await readOne(token);
      recordFileLayer(prov, vars, {
        scope: 'env',
        privacy: 'private',
        env: envName,
        path: p,
        file: token,
      });
      loaded = { ...loaded, ...vars };
    }
  }

  // Match getDotenv behavior: expand progressively across the merged file map.
  const expanded = dotenvExpandAll(loaded, { progressive: true });
  return { dotenv: expanded, provenance: prov };
}
