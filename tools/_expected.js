// Canonical expected artifacts for verify scripts.
// Keep this file as the single source of truth to avoid drift.
export const distCore = [
  'index.mjs',
  'cliHost.mjs',
  'plugins.mjs',
  'plugins-aws.mjs',
  'plugins-batch.mjs',
  'plugins-init.mjs',
  'plugins-cmd.mjs',
  'config.mjs',
  'env-overlay.mjs',
];

export const tarballDistExtras = [
  // Additional CLI binary shipped in the tarball
  'getdotenv.cli.mjs',
];

export const templateCore = [
  'templates/config/json/public/getdotenv.config.json',
  'templates/config/yaml/public/getdotenv.config.yaml',
  'templates/config/js/getdotenv.config.js',
  'templates/config/ts/getdotenv.config.ts',
];

export const tarballTemplates = [
  'templates/config/json/public/getdotenv.config.json',
  'templates/config/json/local/getdotenv.config.local.json',
  'templates/config/yaml/public/getdotenv.config.yaml',
  'templates/config/yaml/local/getdotenv.config.local.yaml',
  'templates/config/js/getdotenv.config.js',
  'templates/config/ts/getdotenv.config.ts',
  'templates/cli/index.ts',
  'templates/cli/plugins/hello/index.ts',
  'templates/cli/plugins/hello/options.ts',
  'templates/cli/plugins/hello/defaultAction.ts',
  'templates/cli/plugins/hello/schema.ts',
];
