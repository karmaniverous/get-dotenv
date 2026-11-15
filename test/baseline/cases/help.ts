/**
 * Help corpus: `-h` for the root and every subcommand of both hosts, and `-V`.
 */
import type { HostName } from '../hosts';
import type { CliCase } from '../types';

const paths: Record<HostName, string[][]> = {
  getdotenv: [
    [],
    ['cmd'],
    ['batch'],
    ['batch', 'cmd'],
    ['aws'],
    ['aws', 'whoami'],
    ['aws', 'whoami', 'really'],
    ['init'],
  ],
  vc: [
    [],
    ['cmd'],
    ['batch'],
    ['batch', 'cmd'],
    ['aws'],
    ['aws', 'cmd'],
    ['aws', 'secrets'],
    ['aws', 'secrets', 'pull'],
    ['smoz'],
    ['smoz', 'openapi'],
    ['smoz', 'legacy'],
    ['smoz', 'legacy', 'run'],
  ],
};

const helpCases = (host: HostName): CliCase[] => [
  ...paths[host].map((p): CliCase => ({
    kind: 'cli',
    group: host,
    host,
    id: `help ${[host, ...p].join(' ')}`,
    source: 'help',
    args: [...p, '-h'],
  })),
  {
    kind: 'cli',
    group: host,
    host,
    id: `version ${host}`,
    source: 'help',
    args: ['-V'],
  },
];

/** Help and version cases for both hosts. */
export const helpCorpus: CliCase[] = [
  ...helpCases('getdotenv'),
  ...helpCases('vc'),
];
