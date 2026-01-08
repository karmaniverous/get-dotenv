/**
 * @packageDocumentation
 * Barrel for built-in plugins (aws, batch, cmd, init).
 * Import from `@karmaniverous/get-dotenv/plugins` for a single entrypoint, or
 * from individual subpaths like `@karmaniverous/get-dotenv/plugins/aws`.
 * These plugins are designed to be composed with the CLI host.
 */

export { awsPlugin, getAwsRegion } from './aws';
export { awsWhoamiPlugin } from './aws/whoami';
export { batchPlugin } from './batch';
export { cmdPlugin } from './cmd';
export { initPlugin } from './init';
