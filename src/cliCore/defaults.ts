// Base root CLI defaults (shared; kept untyped here to avoid cross-layer deps).
export const baseRootOptionDefaults = {
  dotenvToken: '.env',
  loadProcess: true,
  logger: console,
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
