/**
 * 4.11 checklist 5 / Decision 30: a default subcommand's own qualified
 * option goes right after the default's written-in name (spec 4.4 step 4,
 * "Insertion point": every non-root owner's options go immediately after its
 * name token, typed or written in).
 *
 * The S1 `vc` fixture has no default subcommand that declares options
 * (`cmd` has none), so this test adds one: a parent `p` whose default
 * subcommand `d` declares `--flag <v>`. It is a test-only host (the `vc`
 * fixture plus `p`), so the S1 baseline is untouched.
 */
import { describe, expect, it, vi } from 'vitest';

import { createCli } from '@/src/cli';
import { definePlugin, type GetDotenvCli } from '@/src/cliHost';
import { composeVcFixture } from '@/test/baseline/hosts';
import { inFixture } from '@/test/support/fixtureCli';

import { NormalizeArgvError } from './errors';
import { normalizeArgv } from './normalize';
import { qualifiedNameTableOf } from './table';

/** What `d`'s action received. */
interface Seen {
  words: string[];
  flag: string | undefined;
}

/**
 * The `vc` fixture host plus `p`, with `d` as `p`'s default subcommand.
 *
 * @returns The runner, its root, and what `d`'s action saw on each run.
 */
const pHost = () => {
  const seen: Seen[] = [];
  const pPlugin = definePlugin({
    ns: 'p',
    setup(cli) {
      cli.description('Fixture: a parent with a default subcommand');
      cli
        .ns('d', { isDefault: true })
        .description("Fixture: p's default subcommand, with its own option")
        .option('--flag <v>', 'a value')
        .argument('[words...]')
        .action((words, opts) => {
          seen.push({ words, flag: opts.flag });
        });
      return undefined;
    },
  });
  let root: GetDotenvCli | undefined;
  const run = createCli({
    importMetaUrl: import.meta.url,
    alias: 'vc',
    compose: (program) => {
      root = program;
      return composeVcFixture(program).use(pPlugin);
    },
  });
  if (!root) throw new Error('compose did not run');
  return { run, root, seen };
};

/** `'a b c'` → `['a', 'b', 'c']`. */
const words = (s: string): string[] => s.split(' ');

/** The installed `p` host's root. */
const installed = async (): Promise<GetDotenvCli> => {
  const { root } = pHost();
  await root.install();
  return root;
};

describe("a default subcommand's own qualified option (4.11 checklist 5)", () => {
  it('is in the table as --vc-p-d-flag, owned by vc p d', async () => {
    const root = await installed();
    normalizeArgv(root, []); // builds the table
    const entry = qualifiedNameTableOf(root)?.entries.get('--vc-p-d-flag');
    expect(entry?.path).toEqual(['p', 'd']);
    expect(entry?.option.flags).toBe('--flag <v>');
  });

  it.each<[string, string]>([
    ['p hello --vc-p-d-flag x', 'p d --flag=x hello'],
    ['p hello --vc-p-d-flag=x', 'p d --flag=x hello'],
    ['p --vc-p-d-flag x hello', 'p d --flag=x hello'],
    ['p hello world --vc-p-d-flag x', 'p d --flag=x hello world'],
    ['--vc-env bali p hello --vc-p-d-flag x', '--env=bali p d --flag=x hello'],
  ])('vc %s → vc %s', async (typed, normalized) => {
    const root = await installed();
    expect(normalizeArgv(root, words(typed))).toEqual(words(normalized));
  });

  it('reaches the default subcommand: d runs with flag x and its words', async () => {
    const { run, seen } = pHost();
    const out = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    try {
      await inFixture({}, () => run(words('p hello --vc-p-d-flag x')));
    } finally {
      out.mockRestore();
    }
    expect(seen).toEqual([{ words: ['hello'], flag: 'x' }]);
  });

  it('fails when the default is reached at the end of argv (nothing written in)', async () => {
    const root = await installed();
    let error: unknown;
    try {
      normalizeArgv(root, words('p --vc-p-d-flag x'));
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(NormalizeArgvError);
    expect((error as Error).message).toBe(
      "'--vc-p-d-flag' applies to 'vc p d', which takes no options at this point.",
    );
  });
});
