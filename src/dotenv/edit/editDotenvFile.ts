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

import path from 'node:path';

import fs from 'fs-extra';

import { editDotenvText } from './editDotenvText';
import type {
  DotenvFs,
  DotenvPathSearchOrder,
  EditDotenvFileOptions,
  EditDotenvFileResult,
} from './types';

const defaultFs: DotenvFs = {
  pathExists: async (p) => fs.pathExists(p),
  readFile: async (p) => fs.readFile(p, 'utf-8'),
  writeFile: async (p, contents) => fs.writeFile(p, contents, 'utf-8'),
  copyFile: async (src, dest) => fs.copyFile(src, dest),
};

const resolveEnvName = (
  env?: string,
  defaultEnv?: string,
): string | undefined =>
  typeof env === 'string' && env.length > 0
    ? env
    : typeof defaultEnv === 'string' && defaultEnv.length > 0
      ? defaultEnv
      : undefined;

const buildTargetFilename = (opts: {
  dotenvToken: string;
  privateToken: string;
  scope: 'global' | 'env';
  privacy: 'public' | 'private';
  envName?: string;
}): string => {
  const { dotenvToken, privateToken, scope, privacy, envName } = opts;
  if (scope === 'env' && !envName) {
    throw new Error(
      `Unable to resolve env-scoped dotenv filename: env is required.`,
    );
  }
  const parts = [dotenvToken];
  if (scope === 'env') parts.push(envName!);
  if (privacy === 'private') parts.push(privateToken);
  return parts.join('.');
};

const orderedPaths = (
  pathsIn: string[],
  order: DotenvPathSearchOrder,
): string[] => {
  const list = pathsIn.slice();
  return order === 'forward' ? list : list.reverse();
};

type ResolvedTarget = {
  targetPath: string;
  templatePath?: string;
};

const resolveTargetAcrossPaths = async (
  fsPort: DotenvFs,
  opts: {
    paths: string[];
    filename: string;
    templateExtension: string;
    searchOrder: DotenvPathSearchOrder;
  },
): Promise<ResolvedTarget> => {
  const { filename, templateExtension, searchOrder } = opts;
  const pathsOrdered = orderedPaths(opts.paths, searchOrder);

  for (const dir of pathsOrdered) {
    const targetPath = path.resolve(dir, filename);
    if (await fsPort.pathExists(targetPath)) return { targetPath };

    const templatePath = `${targetPath}.${templateExtension}`;
    if (await fsPort.pathExists(templatePath))
      return { targetPath, templatePath };
  }

  throw new Error(
    `Unable to locate dotenv target "${filename}" under provided paths, and no template was found.`,
  );
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
  updates: Record<string, unknown>,
  options: EditDotenvFileOptions,
): Promise<EditDotenvFileResult> {
  const fsPort = options.fs ?? defaultFs;
  const dotenvToken = options.dotenvToken ?? '.env';
  const privateToken = options.privateToken ?? 'local';
  const templateExtension = options.templateExtension ?? 'template';
  const searchOrder = options.searchOrder ?? 'reverse';

  const envName = resolveEnvName(options.env, options.defaultEnv);
  const filename = buildTargetFilename({
    dotenvToken,
    privateToken,
    scope: options.scope,
    privacy: options.privacy,
    envName,
  });

  const resolved = await resolveTargetAcrossPaths(fsPort, {
    paths: options.paths,
    filename,
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

  const before = (await fsPort.readFile(resolved.targetPath)) ?? '';
  const after = editDotenvText(before, updates as Record<string, any>, {
    mode: options.mode,
    duplicateKeys: options.duplicateKeys,
    undefinedBehavior: options.undefinedBehavior,
    nullBehavior: options.nullBehavior,
    eol: options.eol,
    defaultSeparator: options.defaultSeparator,
  });

  const changed = before !== after;
  if (changed) {
    await fsPort.writeFile(resolved.targetPath, after);
  }

  return { path: resolved.targetPath, createdFromTemplate, changed };
}
