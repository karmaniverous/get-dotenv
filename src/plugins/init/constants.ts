import path from 'path';

/**
 * Absolute path to the shipped templates directory.
 *
 * Used by the init scaffolder to locate files under `templates/` at runtime.
 *
 * @remarks
 * This path is resolved relative to the current working directory. It assumes
 * the `templates/` folder is present alongside the installed package (or in the
 * repository when running from source).
 */
export const TEMPLATES_ROOT = path.resolve('templates');
