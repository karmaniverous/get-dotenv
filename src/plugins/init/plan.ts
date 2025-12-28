import path from 'path';

/**
 * Represents a file copy operation during scaffolding.
 *
 * @public
 */
export interface CopyOperation {
  /** Source file path. */
  src: string;
  /** Destination file path. */
  dest: string;
  /** Token substitutions map. */
  subs?: Record<string, string>;
}

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
   * Absolute path to the shipped templates root directory.
   */
  templatesRoot: string;
  /**
   * Whether to include a private .local variant (JSON/YAML only).
   */
  withLocal: boolean;
  /**
   * Absolute destination project root.
   */
  destRoot: string;
}

/**
 * Plan the copy operations for configuration files.
 *
 * @param options - Planning options for config scaffolding.
 * @returns An array of copy operations to perform.
 */
export const planConfigCopies = ({
  format,
  templatesRoot,
  withLocal,
  destRoot,
}: PlanConfigCopiesOptions): Array<CopyOperation> => {
  const copies: Array<CopyOperation> = [];
  if (format === 'json') {
    copies.push({
      src: path.join(
        templatesRoot,
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
          templatesRoot,
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
        templatesRoot,
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
          templatesRoot,
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
      src: path.join(templatesRoot, 'config', 'js', 'getdotenv.config.js'),
      dest: path.join(destRoot, 'getdotenv.config.js'),
    });
  } else {
    copies.push({
      src: path.join(templatesRoot, 'config', 'ts', 'getdotenv.config.ts'),
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
   * Absolute path to the shipped templates root directory.
   */
  templatesRoot: string;
  /**
   * Absolute destination project root.
   */
  destRoot: string;
}

/**
 * Plan the copy operations for the CLI skeleton.
 *
 * @param options - Planning options for CLI scaffolding.
 * @returns An array of copy operations to perform.
 */
export const planCliCopies = ({
  cliName,
  templatesRoot,
  destRoot,
}: PlanCliCopiesOptions): Array<CopyOperation> => {
  const subs = { __CLI_NAME__: cliName };
  const base = path.join(destRoot, 'src', 'cli', cliName);
  const helloBase = path.join(base, 'plugins', 'hello');
  return [
    {
      src: path.join(templatesRoot, 'cli', 'index.ts'),
      dest: path.join(base, 'index.ts'),
      subs,
    },
    {
      src: path.join(templatesRoot, 'cli', 'plugins', 'hello', 'index.ts'),
      dest: path.join(helloBase, 'index.ts'),
      subs,
    },
    {
      src: path.join(templatesRoot, 'cli', 'plugins', 'hello', 'options.ts'),
      dest: path.join(helloBase, 'options.ts'),
      subs,
    },
    {
      src: path.join(
        templatesRoot,
        'cli',
        'plugins',
        'hello',
        'defaultAction.ts',
      ),
      dest: path.join(helloBase, 'defaultAction.ts'),
      subs,
    },
    {
      src: path.join(
        templatesRoot,
        'cli',
        'plugins',
        'hello',
        'strangerAction.ts',
      ),
      dest: path.join(helloBase, 'strangerAction.ts'),
      subs,
    },
    {
      src: path.join(templatesRoot, 'cli', 'plugins', 'hello', 'types.ts'),
      dest: path.join(helloBase, 'types.ts'),
      subs,
    },
  ];
};
