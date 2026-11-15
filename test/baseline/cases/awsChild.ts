/**
 * The corpus cases that drive an aws child command.
 *
 * At S1 they drove the demo `aws whoami really`, which #57 removed (S7). In
 * S8 they were re-pointed to the fixture aws child `aws session show`
 * (`awsChildFixturePlugin` in `../hosts.ts`), with the same files and the
 * same flags, and their 7.0.11 records were re-recorded from the untouched
 * 7.0.11 code (see the baseline README). They are custom hosts, so they are
 * stored in `lib.json`.
 */
import { createAwsChildHost } from '../hosts';
import type { CliCase } from '../types';

/** `aws <flags> <child>`: the aws flags must reach the child's session (#56). */
export const awsChildProfileFlagCase: CliCase = {
  kind: 'cli',
  group: 'lib',
  host: createAwsChildHost,
  id: '#56 profile flag on aws child',
  source: '#56',
  args: ['aws', '--profile', 'flag-profile', 'session', 'show'],
  files: {
    '.env':
      'APP=base\nAWS_LOCAL_PROFILE=dotenv-profile\nSECRET_IDENTITY=batman\n',
  },
};

/** `-h` on an aws child command must not resolve a session (#84, S12). */
export const awsChildHelpCase: CliCase = {
  kind: 'cli',
  group: 'lib',
  host: createAwsChildHost,
  id: '#84 aws child help resolves session',
  source: '#84',
  args: ['aws', 'session', 'show', '-h'],
  files: { '.env': 'APP=base\nAWS_LOCAL_PROFILE=dotenv-profile\n' },
};
