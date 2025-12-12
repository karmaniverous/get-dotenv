export default {
  // Help-time root defaults (example):
  // rootOptionDefaults: {
  //   redact: true,
  //   // redactPatterns: ['API_KEY', 'SECRET'],
  // },
  // Help-time visibility (example): hide selected root flags in -h
  // rootOptionVisibility: { capture: false },

  vars: { APP_SETTING: 'app_value' },
  envVars: { dev: { ENV_SETTING: 'dev_value' } },
  dynamic: {
    GREETING: ({ APP_SETTING = '' }) => `Hello ${APP_SETTING}`,
    // Example: env-aware dynamic value. The second argument receives the
    // selected environment (if any); tailor behavior per environment.
    // For example, with env='dev' this yields "for-dev"; when env is not
    // provided, this returns an empty string.
    ENV_TAG: (_vars, env) => (env ? `for-${env}` : ''),
  },
};
