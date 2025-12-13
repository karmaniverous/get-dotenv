/**
 * Base root CLI defaults (shared; kept untyped here to avoid cross-layer deps).
 * Used as the bottom layer for CLI option resolution.
 */
export const baseRootOptionDefaults = {
  dotenvToken: '.env',
  loadProcess: true,
  logger: console,
  // Diagnostics defaults
  warnEntropy: true,
  entropyThreshold: 3.8,
  entropyMinLength: 16,
  entropyWhitelist: ['^GIT_', '^npm_', '^CI$', 'SHLVL'],
  paths: './',
  pathsDelimiter: ' ',
  privateToken: 'local',
  scripts: {
    'git-status': {
      cmd: 'git branch --show-current && git status -s -u',
      shell: true,
    },
  },
  shell: true,
  vars: '',
  varsAssignor: '=',
  varsDelimiter: ' ',
  // tri-state flags default to unset unless explicitly provided
  // (debug/log/exclude* resolved via flag utils)
} as const;
