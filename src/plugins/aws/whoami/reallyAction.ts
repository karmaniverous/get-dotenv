import type { GetDotenvCliPublic } from '@/src/cliHost';

/**
 * Attach the `really` subcommand under `aws whoami`.
 *
 * Reads `SECRET_IDENTITY` from the resolved get-dotenv context (`cli.getCtx().dotenv`).
 *
 * @param cli - The `whoami` command mount.
 * @returns Nothing.
 */
export function attachWhoamiReallyAction(cli: GetDotenvCliPublic): void {
  const really = cli
    .ns('really')
    .description('Print SECRET_IDENTITY from the resolved dotenv context');

  really.action(() => {
    const secretIdentity = really.getCtx().dotenv.SECRET_IDENTITY;
    console.log(
      `Your secret identity is ${secretIdentity ?? 'still a secret'}.`,
    );
  });
}
