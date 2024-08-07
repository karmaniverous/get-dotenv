import _ from 'lodash';

import { type Scripts } from './GetDotenvCliOptions';

export const resolveCommand = (scripts: Scripts | undefined, command: string) =>
  (scripts && _.isObject(scripts[command])
    ? scripts[command].cmd
    : (scripts?.[command] ?? command)) as string;

export const resolveShell = (
  scripts: Scripts | undefined,
  command: string,
  shell: string | boolean | undefined,
) =>
  scripts && _.isObject(scripts[command])
    ? // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      (scripts[command] as Exclude<Scripts[string], string>).shell
    : shell;
