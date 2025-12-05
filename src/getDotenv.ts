import fs from 'fs-extra';
import { nanoid } from 'nanoid';
import path from 'path';

import type { EntropyOptions } from './diagnostics/entropy';
import { maybeWarnEntropy } from './diagnostics/entropy';
import type { RedactOptions } from './diagnostics/redact';
import { redactObject } from './diagnostics/redact';
import { dotenvExpandAll } from './dotenvExpand';
import {
  type GetDotenvDynamic,
  type GetDotenvOptions,
  type ProcessEnv,
  resolveGetDotenvOptions,
} from './GetDotenvOptions';
import { readDotenv } from './readDotenv';
import { loadModuleDefault } from './util/loadModuleDefault';

/**
 * Asynchronously process dotenv files of the form `.env[.<ENV>][.<PRIVATE_TOKEN>]`
 *
 * @param options - `GetDotenvOptions` object
 * @returns The combined parsed dotenv object.
 * * @example Load from the project root with default tokens
 * ```ts
 * const vars = await getDotenv();
 * console.log(vars.MY_SETTING);
 * ```
 *
 * @example Load from multiple paths and a specific environment
 * ```ts
 * const vars = await getDotenv({
 *   env: 'dev',
 *   dotenvToken: '.testenv',
 *   privateToken: 'secret',
 *   paths: ['./', './packages/app'],
 * });
 * ```
 *
 * @example Use dynamic variables
 * ```ts
 * // .env.js default-exports: { DYNAMIC: ({ PREV }) => `${PREV}-suffix` }
 * const vars = await getDotenv({ dynamicPath: '.env.js' });
 * ```
 *
 * @remarks
 * - When {@link GetDotenvOptions.loadProcess} is true, the resulting variables are merged
 *   into `process.env` as a side effect.
 * - When {@link GetDotenvOptions.outputPath} is provided, a consolidated dotenv file is written.
 *   The path is resolved after expansion, so it may reference previously loaded vars.
 *
 * @throws Error when a dynamic module is present but cannot be imported.
 * @throws Error when an output path was requested but could not be resolved.
 */
export function getDotenv<Vars extends ProcessEnv = ProcessEnv>(
  options?: Partial<GetDotenvOptions>,
): Promise<Vars>;
export function getDotenv<Vars extends ProcessEnv>(
  options: Partial<GetDotenvOptions> & { vars: Vars },
): Promise<ProcessEnv & Vars>;
export async function getDotenv(
  options: Partial<GetDotenvOptions> = {},
): Promise<ProcessEnv> {
  // Apply defaults.
  const {
    defaultEnv,
    dotenvToken = '.env',
    dynamicPath,
    env,
    excludeDynamic = false,
    excludeEnv = false,
    excludeGlobal = false,
    excludePrivate = false,
    excludePublic = false,
    loadProcess = false,
    log = false,
    logger = console,
    outputPath,
    paths = [],
    privateToken = 'local',
    vars = {},
  } = await resolveGetDotenvOptions(options);

  // Read .env files.
  const loaded = paths.length
    ? await paths.reduce<Promise<ProcessEnv>>(async (e, p) => {
        const publicGlobal =
          excludePublic || excludeGlobal
            ? Promise.resolve({})
            : readDotenv(path.resolve(p, dotenvToken));

        const publicEnv =
          excludePublic || excludeEnv || (!env && !defaultEnv)
            ? Promise.resolve({})
            : readDotenv(
                path.resolve(p, `${dotenvToken}.${env ?? defaultEnv ?? ''}`),
              );

        const privateGlobal =
          excludePrivate || excludeGlobal
            ? Promise.resolve({})
            : readDotenv(path.resolve(p, `${dotenvToken}.${privateToken}`));

        const privateEnv =
          excludePrivate || excludeEnv || (!env && !defaultEnv)
            ? Promise.resolve({})
            : readDotenv(
                path.resolve(
                  p,
                  `${dotenvToken}.${env ?? defaultEnv ?? ''}.${privateToken}`,
                ),
              );

        const [
          eResolved,
          publicGlobalResolved,
          publicEnvResolved,
          privateGlobalResolved,
          privateEnvResolved,
        ] = await Promise.all([
          e,
          publicGlobal,
          publicEnv,
          privateGlobal,
          privateEnv,
        ]);

        return {
          ...eResolved,
          ...publicGlobalResolved,
          ...publicEnvResolved,
          ...privateGlobalResolved,
          ...privateEnvResolved,
        };
      }, Promise.resolve({}))
    : {};

  const outputKey = nanoid();

  const dotenv = dotenvExpandAll(
    {
      ...loaded,
      ...vars,
      ...(outputPath ? { [outputKey]: outputPath } : {}),
    },
    { progressive: true },
  );

  // Process dynamic variables. Programmatic option takes precedence over path.
  if (!excludeDynamic) {
    let dynamic: GetDotenvDynamic | undefined = undefined;
    if (options.dynamic && Object.keys(options.dynamic).length > 0) {
      dynamic = options.dynamic;
    } else if (dynamicPath) {
      const absDynamicPath = path.resolve(dynamicPath);
      if (await fs.exists(absDynamicPath)) {
        try {
          dynamic = await loadModuleDefault<GetDotenvDynamic>(
            absDynamicPath,
            'getdotenv-dynamic',
          );
        } catch {
          // Preserve legacy error text for compatibility with tests/docs.
          throw new Error(
            `Unable to load dynamic TypeScript file: ${absDynamicPath}. ` +
              `Install 'esbuild' (devDependency) to enable TypeScript dynamic modules.`,
          );
        }
      }
    }
    if (dynamic) {
      try {
        for (const key in dynamic)
          Object.assign(dotenv, {
            [key]:
              typeof dynamic[key] === 'function'
                ? dynamic[key](dotenv, env ?? defaultEnv)
                : dynamic[key],
          });
      } catch {
        throw new Error(`Unable to evaluate dynamic variables.`);
      }
    }
  }
  // Write output file.
  let resultDotenv: ProcessEnv = dotenv;
  if (outputPath) {
    const outputPathResolved = dotenv[outputKey];
    if (!outputPathResolved) throw new Error('Output path not found.');
    const { [outputKey]: _omitted, ...dotenvForOutput } = dotenv;

    await fs.writeFile(
      outputPathResolved,
      Object.keys(dotenvForOutput).reduce((contents, key) => {
        const value = dotenvForOutput[key] ?? '';
        return `${contents}${key}=${
          value.includes('\n') ? `"${value}"` : value
        }\n`;
      }, ''),
      { encoding: 'utf-8' },
    );

    resultDotenv = dotenvForOutput;
  }

  // Log result.
  if (log) {
    const redactFlag = (options as { redact?: boolean }).redact ?? false;
    const redactPatterns =
      (options as { redactPatterns?: string[] }).redactPatterns ?? undefined;
    const redOpts: RedactOptions = {};
    if (redactFlag) redOpts.redact = true;
    if (redactFlag && Array.isArray(redactPatterns))
      redOpts.redactPatterns = redactPatterns;
    const bag = redactFlag
      ? redactObject(resultDotenv, redOpts)
      : { ...resultDotenv };
    logger.log(bag);
    // Entropy warnings: once-per-key-per-run (presentation only)
    const warnEntropyVal =
      (options as { warnEntropy?: boolean }).warnEntropy ?? true;
    const entropyThresholdVal = (options as { entropyThreshold?: number })
      .entropyThreshold;
    const entropyMinLengthVal = (options as { entropyMinLength?: number })
      .entropyMinLength;
    const entropyWhitelistVal = (options as { entropyWhitelist?: string[] })
      .entropyWhitelist;
    const entOpts: EntropyOptions = {};
    if (typeof warnEntropyVal === 'boolean')
      entOpts.warnEntropy = warnEntropyVal;
    if (typeof entropyThresholdVal === 'number')
      entOpts.entropyThreshold = entropyThresholdVal;
    if (typeof entropyMinLengthVal === 'number')
      entOpts.entropyMinLength = entropyMinLengthVal;
    if (Array.isArray(entropyWhitelistVal))
      entOpts.entropyWhitelist = entropyWhitelistVal;
    for (const [k, v] of Object.entries(resultDotenv)) {
      maybeWarnEntropy(
        k,
        v,
        v !== undefined ? 'dotenv' : 'unset',
        entOpts,
        (line) => {
          logger.log(line);
        },
      );
    }
  }

  // Load process.env.
  if (loadProcess) Object.assign(process.env, resultDotenv);

  return resultDotenv;
}
