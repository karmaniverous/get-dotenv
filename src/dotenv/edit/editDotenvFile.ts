/**
 * FS-level dotenv editor adapter (target resolution + template bootstrap).
 *
 * Requirements addressed:
 * - Deterministic target selection across getdotenv `paths` only.
 * - Scope axis (global|env) × privacy axis (public|private).
 * - Template bootstrap: copy `<target>.<templateExtension>` to `<target>` when needed.
 * - Edit in place while preserving formatting via the pure text editor.
 *
 * @packageDocumentation
 */

import fs from 'fs-extra';

import { editDotenvText } from './editDotenvText';
import { resolveDotenvTarget } from './resolveDotenvTarget';
import type {
  DotenvFs,
  DotenvUpdateMap,
  EditDotenvFileOptions,
  EditDotenvFileResult,
} from './types';

const defaultFs: DotenvFs = {
  pathExists: async (p) => fs.pathExists(p),
  readFile: async (p) => fs.readFile(p, 'utf-8'),
  writeFile: async (p, contents) => fs.writeFile(p, contents, 'utf-8'),
  copyFile: async (src, dest) => fs.copyFile(src, dest),
};

/**
 * Edit a dotenv file selected by scope/privacy across a list of search paths.
 *
 * @param updates - Update map of keys to values.
 * @param options - Target selection options + edit options.
 * @returns An {@link EditDotenvFileResult}.
 *
 * @public
 */
export async function editDotenvFile(
  updates: DotenvUpdateMap,
  options: EditDotenvFileOptions,
): Promise<EditDotenvFileResult> {
  const fsPort = options.fs ?? defaultFs;
  const dotenvToken = options.dotenvToken ?? '.env';
  const privateToken = options.privateToken ?? 'local';
  const templateExtension = options.templateExtension ?? 'template';
  const searchOrder = options.searchOrder ?? 'reverse';

  const resolved = await resolveDotenvTarget({
    fs: fsPort,
    paths: options.paths,
    dotenvToken,
    privateToken,
    env: options.env,
    defaultEnv: options.defaultEnv,
    scope: options.scope,
    privacy: options.privacy,
    templateExtension,
    searchOrder,
  });

  let createdFromTemplate = false;
  if (resolved.templatePath) {
    // Template bootstrap: copy template as the destination sibling.
    // Only copy if the target does not already exist.
    if (!(await fsPort.pathExists(resolved.targetPath))) {
      await fsPort.copyFile(resolved.templatePath, resolved.targetPath);
      createdFromTemplate = true;
    }
  }

  const before = await fsPort.readFile(resolved.targetPath);
  const after = editDotenvText(before, updates, {
    ...(options.mode ? { mode: options.mode } : {}),
    ...(options.duplicateKeys ? { duplicateKeys: options.duplicateKeys } : {}),
    ...(options.undefinedBehavior
      ? { undefinedBehavior: options.undefinedBehavior }
      : {}),
    ...(options.nullBehavior ? { nullBehavior: options.nullBehavior } : {}),
    ...(options.eol ? { eol: options.eol } : {}),
    ...(typeof options.defaultSeparator === 'string'
      ? { defaultSeparator: options.defaultSeparator }
      : {}),
  });

  const changed = before !== after;
  if (changed) {
    await fsPort.writeFile(resolved.targetPath, after);
  }

  return { path: resolved.targetPath, createdFromTemplate, changed };
}
