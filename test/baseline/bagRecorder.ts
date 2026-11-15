/**
 * Records the merged root options bag of every get-dotenv host in this
 * process, by wrapping `GetDotenvCli.prototype._setOptionsBag` (the one place
 * the root hooks and the alias store the bag). The last bag set is the one the
 * run's actions read.
 */
import { GetDotenvCli } from '@/src/cliHost/GetDotenvCli';

let lastBag: unknown;

type Bag = Parameters<GetDotenvCli['_setOptionsBag']>[0];

const original = Object.getOwnPropertyDescriptor(
  GetDotenvCli.prototype,
  '_setOptionsBag',
)?.value as (this: GetDotenvCli, bag: Bag) => void;

GetDotenvCli.prototype._setOptionsBag = function (
  this: GetDotenvCli,
  bag: Bag,
) {
  lastBag = bag;
  original.call(this, bag);
};

/** Forget the last recorded bag (start of a case). */
export const resetBag = (): void => {
  lastBag = undefined;
};

/**
 * Serialize the last recorded bag: functions and the logger become markers,
 * object keys are sorted.
 *
 * @returns The bag as a JSON-safe value, or `null` when none was set.
 */
export const takeBag = (): unknown => {
  if (lastBag === undefined) return null;
  return JSON.parse(
    JSON.stringify(lastBag, (key, value: unknown) => {
      if (key === 'logger') return '[logger]';
      if (typeof value === 'function') return '[function]';
      if (value === undefined) return '[undefined]';
      return value;
    }),
  ) as unknown;
};
