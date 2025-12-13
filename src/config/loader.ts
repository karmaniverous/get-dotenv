import fs from 'fs-extra';
import { packageDirectory } from 'package-directory';
import path, { extname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import YAML from 'yaml';

import {
  type GetDotenvConfigResolved,
  getDotenvConfigSchemaRaw,
  getDotenvConfigSchemaResolved,
} from '@/src/schema';
import { loadModuleDefault } from '@/src/util';

// Discovery candidates (first match wins per scope/privacy).
// Order preserves historical JSON/YAML precedence; JS/TS added afterwards.
const PUBLIC_FILENAMES = [
  'getdotenv.config.json',
  'getdotenv.config.yaml',
  'getdotenv.config.yml',
  'getdotenv.config.js',
  'getdotenv.config.mjs',
  'getdotenv.config.cjs',
  'getdotenv.config.ts',
  'getdotenv.config.mts',
  'getdotenv.config.cts',
] as const;
const LOCAL_FILENAMES = [
  'getdotenv.config.local.json',
  'getdotenv.config.local.yaml',
  'getdotenv.config.local.yml',
  'getdotenv.config.local.js',
  'getdotenv.config.local.mjs',
  'getdotenv.config.local.cjs',
  'getdotenv.config.local.ts',
  'getdotenv.config.local.mts',
  'getdotenv.config.local.cts',
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
export interface ConfigFile {
  path: string;
  privacy: ConfigPrivacy;
  scope: ConfigScope;
}

/**
 * Discover JSON/YAML config files in the packaged root and project root.
 * Order: packaged public → project public → project local. */
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
 * For JS/TS: default export is loaded; "dynamic" is allowed.
 */
export const loadConfigFile = async (
  filePath: string,
): Promise<GetDotenvConfigResolved> => {
  let raw: unknown = {};
  try {
    const abs = path.resolve(filePath);
    if (isJsOrTs(abs)) {
      // JS/TS support: load default export via shared robust pipeline.
      const mod = await loadModuleDefault<unknown>(abs, 'getdotenv-config');
      raw = mod ?? {};
    } else {
      const txt = await fs.readFile(abs, 'utf-8');
      raw = isJson(abs) ? JSON.parse(txt) : isYaml(abs) ? YAML.parse(txt) : {};
    }
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

  // Disallow dynamic and schema in JSON/YAML; allow both in JS/TS.
  if (
    !isJsOrTs(filePath) &&
    (parsed.data.dynamic !== undefined || parsed.data.schema !== undefined)
  ) {
    throw new Error(
      `Config ${filePath} specifies unsupported keys for JSON/YAML. ` +
        `Use JS/TS config for "dynamic" or "schema".`,
    );
  }

  return getDotenvConfigSchemaResolved.parse(parsed.data);
};
export interface ResolvedConfigSources {
  packaged?: GetDotenvConfigResolved;
  project?: {
    public?: GetDotenvConfigResolved;
    local?: GetDotenvConfigResolved;
  };
}

/**
 * Discover and load configs into resolved shapes, ordered by scope/privacy.
 * JSON/YAML/JS/TS supported; first match per scope/privacy applies.
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
