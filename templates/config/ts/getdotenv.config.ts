import { defineGetDotenvConfig } from '@karmaniverous/get-dotenv/core';

type Vars = {
  APP_SETTING?: string;
  ENV_SETTING?: string;
};

export default defineGetDotenvConfig<Vars>({
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
    GREETING: ({ APP_SETTING = '' }) => `${APP_SETTING}-ts`,
    // Example: env-aware dynamic value. The second argument receives the
    // selected environment (if any); tailor behavior per environment.
    // For example, with env='dev' this yields "for-dev"; when env is not
    // provided, this returns an empty string.
    ENV_TAG: (_vars: Record<string, string | undefined>, env?: string) =>
      env ? `for-${env}` : '',
  },
});
