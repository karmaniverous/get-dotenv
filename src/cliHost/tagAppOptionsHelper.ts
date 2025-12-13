import type { CommandUnknownOpts, Option } from '@commander-js/extra-typings';

/**
 * Temporarily tag options added during a callback as 'app' for grouped help.
 * Wraps `addOption` on the command instance.
 */
export function tagAppOptionsAround<T>(
  root: CommandUnknownOpts,
  setOptionGroup: (opt: Option, group: string) => void,
  fn: (root: CommandUnknownOpts) => T,
): T {
  const originalAddOption: typeof root.addOption = root.addOption.bind(
    root,
  ) as unknown as typeof root.addOption;
  root.addOption = ((opt: Option) => {
    setOptionGroup(opt, 'app');
    return originalAddOption(opt);
  }) as typeof root.addOption;
  try {
    return fn(root);
  } finally {
    root.addOption = originalAddOption;
  }
}
