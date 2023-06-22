// npm imports
import spawn from 'cross-spawn';

export const getAwsSsoCredentials = (localProfile) => {
  if (!localProfile?.length) {
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_SESSION_TOKEN;
    return;
  }

  const { status, stderr, stdout } = spawn.sync('aws', [
    'configure',
    'export-credentials',
    '--profile',
    localProfile,
  ]);

  if (status) throw new Error(stderr.toString());

  const { AccessKeyId, SecretAccessKey, SessionToken } = JSON.parse(
    stdout.toString()
  );

  process.env.AWS_ACCESS_KEY_ID = AccessKeyId;
  process.env.AWS_SECRET_ACCESS_KEY = SecretAccessKey;
  process.env.AWS_SESSION_TOKEN = SessionToken;
};
