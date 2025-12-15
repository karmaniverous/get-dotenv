import type { GetDotenvCliPublic } from '@karmaniverous/get-dotenv/cliHost';

/**
 * Attach the `stranger` subcommand under `hello`.
 *
 * Reads `SECRET_IDENTITY` from the resolved get-dotenv context (`cli.getCtx().dotenv`).
 *
 * @param cli - The `hello` command mount.
 * @returns Nothing.
 */
export function attachHelloStrangerAction(cli: GetDotenvCliPublic): void {
  const really = cli
    .ns('stranger')
    .description('Print SECRET_IDENTITY from the resolved dotenv context');

  really.action(() => {
    const secretIdentity = really.getCtx().dotenv.SECRET_IDENTITY;
    console.log(`My secret identity is ${secretIdentity ?? 'still a secret'}.`);
  });
}
