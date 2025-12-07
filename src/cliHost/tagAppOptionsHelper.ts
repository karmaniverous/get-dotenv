/** src/cliHost/tagAppOptionsHelper.ts
 * Temporarily tag options added during a callback as 'app' for grouped help.
 */
import type { Command, Option } from '@commander-js/extra-typings';

export function tagAppOptionsAround<T>(
  root: Command,
  setOptionGroup: (opt: Option, group: string) => void,
  fn: (root: Command) => T,
): T {
  const originalAddOption = root.addOption.bind(root);
  root.addOption = function patchedAdd(this: Command, opt: Option) {
    setOptionGroup(opt, 'app');
    return originalAddOption(opt);
  } as Command['addOption'];
  try {
    return fn(root);
  } finally {
    root.addOption = originalAddOption;
  }
}
