/** src/env/dynamic.ts
 * Helpers for applying and loading dynamic variables (JS/TS).
 *
 * Requirements addressed:
 * - Single service to apply a dynamic map progressively.
 * - Single service to load a JS/TS dynamic module with robust fallbacks (util/loadModuleDefault).
 * - Unify error messaging so callers show consistent guidance.
 */
import fs from 'fs-extra';

import type { GetDotenvDynamic, ProcessEnv } from '@/src/core';
import { loadModuleDefault } from '@/src/util';

/**
 * Apply a dynamic map to the target progressively.
 * - Functions receive (target, env) and may return string | undefined.
 * - Literals are assigned directly (including undefined).
 *
 * @param target - Mutable target environment to assign into.
 * @param map - Dynamic map to apply (functions and/or literal values).
 * @param env - Selected environment name (if any) passed through to dynamic functions.
 * @returns Nothing.
 */
export function applyDynamicMap(
  target: ProcessEnv,
  map?: GetDotenvDynamic,
  env?: string,
): void {
  if (!map) return;
  for (const key of Object.keys(map)) {
    const val =
      typeof map[key] === 'function'
        ? (map[key] as (v: ProcessEnv, e?: string) => string | undefined)(
            target,
            env,
          )
        : map[key];
    Object.assign(target, { [key]: val });
  }
}

/**
 * Load a default-export dynamic map from a JS/TS file and apply it.
 * Uses util/loadModuleDefault for robust TS handling (direct import, esbuild,
 * typescript.transpile fallback).
 *
 * Error behavior:
 * - On failure to load/compile/evaluate the module, throws a unified message:
 *   "Unable to load dynamic TypeScript file: <absPath>. Install 'esbuild'..."
 *
 * @param target - Mutable target environment to assign into.
 * @param absPath - Absolute path to the dynamic module file.
 * @param env - Selected environment name (if any).
 * @param cacheDirName - Cache subdirectory under `.tsbuild/` for compiled artifacts.
 * @returns A `Promise\<void\>` which resolves after the module (if present) has been applied.
 */
export async function loadAndApplyDynamic(
  target: ProcessEnv,
  absPath: string,
  env: string | undefined,
  cacheDirName: string,
): Promise<void> {
  if (!(await fs.exists(absPath))) return;
  let dyn: GetDotenvDynamic | undefined;
  try {
    dyn = await loadModuleDefault<GetDotenvDynamic>(absPath, cacheDirName);
  } catch {
    // Preserve legacy/clear guidance used by tests and docs.
    throw new Error(
      `Unable to load dynamic TypeScript file: ${absPath}. ` +
        `Install 'esbuild' (devDependency) to enable TypeScript dynamic modules.`,
    );
  }
  applyDynamicMap(target, dyn, env);
}
