export default {
  dotenvToken: '.env',
  privateToken: 'local',
  paths: './',
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
};