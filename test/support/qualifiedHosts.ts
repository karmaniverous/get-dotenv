/**
 * Installed host trees for normalization tests: the S1 `vc` fixture host
 * and the shipped `getdotenv` CLI, built by `createCli` exactly as their
 * runners build them, then installed (no parse).
 */
import { composeShippedPlugins, createCli } from '@/src/cli/createCli';
import type { GetDotenvCli } from '@/src/cliHost';
import { createVcHost } from '@/test/baseline/hosts';

/**
 * The installed `vc` fixture tree.
 *
 * @param before - Runs after install, before anything builds the table
 *   (tests add options here).
 * @returns The host root.
 */
export const vcProgram = async (
  before?: (program: GetDotenvCli) => void,
): Promise<GetDotenvCli> => {
  let program: GetDotenvCli | undefined;
  createVcHost((p) => {
    program = p;
  });
  const root = program as unknown as GetDotenvCli;
  await root.install();
  before?.(root);
  return root;
};

/**
 * The installed shipped `getdotenv` tree.
 *
 * @returns The host root.
 */
export const getdotenvProgram = async (): Promise<GetDotenvCli> => {
  let program: GetDotenvCli | undefined;
  createCli({
    importMetaUrl: import.meta.url,
    alias: 'getdotenv',
    compose: (p) => {
      program = p;
      return composeShippedPlugins(p);
    },
  });
  const root = program as unknown as GetDotenvCli;
  await root.install();
  return root;
};
