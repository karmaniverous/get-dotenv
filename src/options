// npm imports
import fs from 'fs-extra';
import fromPairs from 'lodash.frompairs';
import pick from 'lodash.pick';
import { packageDirectory } from 'pkg-dir';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load default options.
const cliDefaultOptionsGlobalPath = resolve(
  __dirname,
  '../getdotenv.config.json'
);

export const cliDefaultOptionsGlobal = (await fs.exists(
  cliDefaultOptionsGlobalPath
))
  ? JSON.parse(await fs.readFile(cliDefaultOptionsGlobalPath))
  : {};

const cliDefaultOptionsLocalPath = resolve(
  await packageDirectory(),
  'getdotenv.config.json'
);

export const cliDefaultOptionsLocal = (await fs.exists(
  cliDefaultOptionsLocalPath
))
  ? JSON.parse(await fs.readFile(cliDefaultOptionsLocalPath))
  : {};

export const cli2getdotenvOptions = ({
  paths,
  pathsDelimiter,
  pathsDelimiterPattern,
  vars,
  varsAssignor,
  varsAssignorPattern,
  varsDelimiter,
  varsDelimiterPattern,
  ...rest
} = {}) => ({
  ...pick(rest, [
    'defaultEnv',
    'dotenvToken',
    'dynamicPath',
    'env',
    'excludeDynamic',
    'excludeEnv',
    'excludeGlobal',
    'excludePrivate',
    'excludePublic',
    'loadProcess',
    'log',
    'outputPath',
    'privateToken',
  ]),
  paths:
    paths?.split(
      pathsDelimiterPattern ? RegExp(pathsDelimiterPattern) : pathsDelimiter
    ) ?? [],
  vars: fromPairs(
    vars
      ?.split(
        varsDelimiterPattern ? RegExp(varsDelimiterPattern) : varsDelimiter
      )
      .map((v) =>
        v.split(
          varsAssignorPattern ? RegExp(varsAssignorPattern) : varsAssignor
        )
      )
  ),
});

export const getdotenvDefaultOptions = cli2getdotenvOptions({
  ...cliDefaultOptionsGlobal,
  ...cliDefaultOptionsLocal,
});
