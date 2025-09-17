export default {
  dotenvToken: '.env',
  privateToken: 'local',
  paths: './',
  vars: { APP_SETTING: 'app_value' },
  envVars: { dev: { ENV_SETTING: 'dev_value' } },
  dynamic: {
    GREETING: ({ APP_SETTING = '' }) => `Hello ${APP_SETTING}`,
  },
};
