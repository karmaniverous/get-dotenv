import fs from 'fs-extra';
import { packageDirectory } from 'package-directory';
import path, { extname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import YAML from 'yaml';

import {
  type GetDotenvConfigRaw,
  type GetDotenvConfigResolved,
  getDotenvConfigSchemaRaw,
  getDotenvConfigSchemaResolved,
} from '../schema/getDotenvConfig';

const PUBLIC_FILENAMES = [
  'getdotenv.config.json',
  'getdotenv.config.yaml',
  'getdotenv.config.yml',
] as const;
const LOCAL_FILENAMES = [
  'getdotenv.config.local.json',
  'getdotenv.config.local.yaml',
  'getdotenv.config.local.yml',
] as const;

const isYaml = (p: string) =>
  ['.yaml', '.yml'].includes(extname(p).toLowerCase());
const isJson = (p: string) => extname(p).toLowerCase() === '.json';
const isJsOrTs = (p: string) =>
  ['.js', '.mjs', '.cjs', '.ts', '.mts', '.cts'].includes(
    extname(p).toLowerCase(),
  );

export type ConfigPrivacy = 'public' | 'local';
export type ConfigScope = 'packaged' | 'project';
export type ConfigFile = {
  path: string;
  privacy: ConfigPrivacy;
  scope: ConfigScope;
};

/**
 * Discover JSON/YAML config files in the packaged root and project root.
 * Order: packaged public → project public → project local.
 */
export const discoverConfigFiles = async (
  importMetaUrl?: string,
): Promise<ConfigFile[]> => {
  const files: ConfigFile[] = [];

  // Packaged root via importMetaUrl (optional)
  if (importMetaUrl) {
    const fromUrl = fileURLToPath(importMetaUrl);
    const packagedRoot = await packageDirectory({ cwd: fromUrl });
    if (packagedRoot) {
      for (const name of PUBLIC_FILENAMES) {
        const p = join(packagedRoot, name);
        if (await fs.pathExists(p)) {
          files.push({ path: p, privacy: 'public', scope: 'packaged' });
          break; // only one public file expected per scope
        }
      }
      // By policy, packaged .local is not expected; skip even if present.
    }
  }

  // Project root (from current working directory)
  const projectRoot = await packageDirectory();
  if (projectRoot) {
    for (const name of PUBLIC_FILENAMES) {
      const p = join(projectRoot, name);
      if (await fs.pathExists(p)) {
        files.push({ path: p, privacy: 'public', scope: 'project' });
        break;
      }
    }
    for (const name of LOCAL_FILENAMES) {
      const p = join(projectRoot, name);
      if (await fs.pathExists(p)) {
        files.push({ path: p, privacy: 'local', scope: 'project' });
        break;
      }
    }
  }

  return files;
};

/**
 * Load a single config file (JSON/YAML). JS/TS is not supported in this step.
 * Validates with Zod RAW schema, then normalizes to RESOLVED.
 *
 * For JSON/YAML: if a "dynamic" property is present, throws with guidance.
 */
export const loadConfigFile = async (
  filePath: string,
): Promise<GetDotenvConfigResolved> => {
  if (isJsOrTs(filePath)) {
    throw new Error(
      `Config ${filePath} is JS/TS — not supported in this step. Use JSON/YAML or enable JS/TS support in a later version.`,
    );
  }
  let raw: unknown = {};
  try {
    const txt = await fs.readFile(filePath, 'utf-8');
    raw = isJson(filePath)
      ? JSON.parse(txt)
      : isYaml(filePath)
        ? YAML.parse(txt)
        : {};
  } catch (err) {
    throw new Error(`Failed to read/parse config: ${filePath}. ${String(err)}`);
  }

  // Validate RAW
  const parsed = getDotenvConfigSchemaRaw.safeParse(raw);
  if (!parsed.success) {
    const msgs = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid config ${filePath}:\n${msgs}`);
  }

  // Disallow dynamic in JSON/YAML for this step
  if (parsed.data.dynamic !== undefined) {
    throw new Error(
      `Config ${filePath} specifies "dynamic"; JSON/YAML configs cannot include dynamic in this step. Use JS/TS config.`,
    );
  }

  return getDotenvConfigSchemaResolved.parse(parsed.data);
};

export type ResolvedConfigSources = {
  packaged?: GetDotenvConfigResolved;
  project?: {
    public?: GetDotenvConfigResolved;
    local?: GetDotenvConfigResolved;
  };
};

/**
 * Discover and load configs into resolved shapes, ordered by scope/privacy.
 * JSON/YAML only for this step.
 */
export const resolveGetDotenvConfigSources = async (
  importMetaUrl?: string,
): Promise<ResolvedConfigSources> => {
  const discovered = await discoverConfigFiles(importMetaUrl);
  const result: ResolvedConfigSources = {};
  for (const f of discovered) {
    const cfg = await loadConfigFile(f.path);
    if (f.scope === 'packaged') {
      // packaged public only
      result.packaged = cfg;
    } else {
      result.project ??= {};
      if (f.privacy === 'public') result.project.public = cfg;
      else result.project.local = cfg;
    }
  }
  return result;
};

// Utility primarily for tests: create a file: URL string from a path
export const toFileUrl = (p: string) =>
  pathToFileURL(path.resolve(p)).toString();
