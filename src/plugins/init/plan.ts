import path from 'path';

import { TEMPLATES_ROOT } from './constants';

/**
 * Options for planning config template copies.
 *
 * @public
 */
export interface PlanConfigCopiesOptions {
  /**
   * Desired config format to scaffold.
   */
  format: 'json' | 'yaml' | 'js' | 'ts';
  /**
   * Whether to include a private .local variant (JSON/YAML only).
   */
  withLocal: boolean;
  /**
   * Absolute destination project root.
   */
  destRoot: string;
}

export const planConfigCopies = ({
  format,
  withLocal,
  destRoot,
}: PlanConfigCopiesOptions): Array<{
  src: string;
  dest: string;
  subs?: Record<string, string>;
}> => {
  const copies: Array<{
    src: string;
    dest: string;
    subs?: Record<string, string>;
  }> = [];
  if (format === 'json') {
    copies.push({
      src: path.join(
        TEMPLATES_ROOT,
        'config',
        'json',
        'public',
        'getdotenv.config.json',
      ),
      dest: path.join(destRoot, 'getdotenv.config.json'),
    });
    if (withLocal) {
      copies.push({
        src: path.join(
          TEMPLATES_ROOT,
          'config',
          'json',
          'local',
          'getdotenv.config.local.json',
        ),
        dest: path.join(destRoot, 'getdotenv.config.local.json'),
      });
    }
  } else if (format === 'yaml') {
    copies.push({
      src: path.join(
        TEMPLATES_ROOT,
        'config',
        'yaml',
        'public',
        'getdotenv.config.yaml',
      ),
      dest: path.join(destRoot, 'getdotenv.config.yaml'),
    });
    if (withLocal) {
      copies.push({
        src: path.join(
          TEMPLATES_ROOT,
          'config',
          'yaml',
          'local',
          'getdotenv.config.local.yaml',
        ),
        dest: path.join(destRoot, 'getdotenv.config.local.yaml'),
      });
    }
  } else if (format === 'js') {
    copies.push({
      src: path.join(TEMPLATES_ROOT, 'config', 'js', 'getdotenv.config.js'),
      dest: path.join(destRoot, 'getdotenv.config.js'),
    });
  } else {
    copies.push({
      src: path.join(TEMPLATES_ROOT, 'config', 'ts', 'getdotenv.config.ts'),
      dest: path.join(destRoot, 'getdotenv.config.ts'),
    });
  }
  return copies;
};

/**
 * Options for planning CLI skeleton template copies.
 *
 * @public
 */
export interface PlanCliCopiesOptions {
  /**
   * CLI command name to substitute into templates.
   */
  cliName: string;
  /**
   * Absolute destination project root.
   */
  destRoot: string;
}

export const planCliCopies = ({
  cliName,
  destRoot,
}: PlanCliCopiesOptions): Array<{
  src: string;
  dest: string;
  subs?: Record<string, string>;
}> => {
  const subs = { __CLI_NAME__: cliName };
  const base = path.join(destRoot, 'src', 'cli', cliName);
  return [
    {
      src: path.join(TEMPLATES_ROOT, 'cli', 'index.ts'),
      dest: path.join(base, 'index.ts'),
      subs,
    },
    {
      src: path.join(TEMPLATES_ROOT, 'cli', 'plugins', 'hello.ts'),
      dest: path.join(base, 'plugins', 'hello.ts'),
      subs,
    },
  ];
};
