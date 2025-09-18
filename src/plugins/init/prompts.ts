import { stdin as input, stdout as output } from 'node:process';

import type { createInterface } from 'readline/promises';

import type { Logger } from '../../GetDotenvOptions';

/**
 * Determine whether the current environment should be treated as non-interactive.
 * CI heuristics include: CI, GITHUB_ACTIONS, BUILDKITE, TEAMCITY_VERSION, TF_BUILD.
 */
export const isNonInteractive = () => {
  const ciLike =
    process.env.CI ||
    process.env.GITHUB_ACTIONS ||
    process.env.BUILDKITE ||
    process.env.TEAMCITY_VERSION ||
    process.env.TF_BUILD;
  return Boolean(ciLike) || !(input.isTTY && output.isTTY);
};

export const promptDecision = async (
  filePath: string,
  logger: Logger,
  rl: ReturnType<typeof createInterface>,
): Promise<'o' | 'e' | 's' | 'O' | 'E' | 'S'> => {
  logger.log(
    `File exists: ${filePath}\nChoose: [o]verwrite, [e]xample, [s]kip, [O]verwrite All, [E]xample All, [S]kip All`,
  );

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    const a = (await rl.question('> ')).trim();
    const valid = ['o', 'e', 's', 'O', 'E', 'S'] as const;
    if ((valid as readonly string[]).includes(a))
      return a as 'o' | 'e' | 's' | 'O' | 'E' | 'S';
    logger.log('Please enter one of: o e s O E S');
  }
};
