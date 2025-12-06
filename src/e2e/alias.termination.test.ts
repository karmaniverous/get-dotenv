import { execa } from 'execa';
import { describe, expect, it } from 'vitest';

import { tokenize } from '../plugins/cmd/tokenize';

// Mirror of the CLI alias executor's peel logic:
// Strip exactly one symmetric outer quote layer from a string token.
const stripOne = (s: string) => {
  if (s.length < 2) return s;
  const a = s.charAt(0);
  const b = s.charAt(s.length - 1);
  const symmetric =
    (a === '"' && b === '"') || (a === "'" && b === "'");
  return symmetric ? s.slice(1, -1) : s;
};

// Windows-only alias termination check with capture enabled.
// Ensures the alias path (--cmd) terminates and produces the expected output.
// Timeout is governed by Vitest (see vitest.config.ts testTimeout).
describe('E2E alias termination (Windows)', () => {
  const isWindows = process.platform === 'win32';

  (isWindows ? it : it.skip)(
    'terminates with GETDOTENV_STDIO=pipe and prints expected JSON',
    async () => {
      const nodeBin = process.execPath;
      const CLI = (...args: string[]) => [
        '--import',
        'tsx',
        'src/cli/getdotenv',
        ...args,
      ];
      // JSON payload to validate APP/ENV and blank SECRET when -r is used.
      const codeJson =
        'console.log(JSON.stringify({APP:process.env.APP_SETTING ?? "",ENV:process.env.ENV_SETTING ?? "",SECRET:process.env.APP_SECRET ?? ""}))';

      // Build argv using the alias on the parent (--cmd), not the cmd subcommand.
      // IMPORTANT: quote the entire alias payload as a single token so Commander
      // does not treat "-e" as the parent --env flag.
      const aliasPayload = `node -e "${codeJson}"`;
      const argv = CLI(
        '--shell-off',
        '--paths',
        './test/full',
        '-e',
        'test',
        '--dotenv-token',
        '.testenv',
        '--private-token',
        'secret',
        '-r',
        '--cmd',
        aliasPayload,
      );
      // Ensure the child CLI is NOT treated as "under tests" so the alias
      // path is free to call process.exit normally. Keep capture ON.
      const childEnv = {
        ...process.env,
        GETDOTENV_STDIO: 'pipe',
        // Enable CLI-internal breadcrumbs on stderr ([getdotenv:alias], [getdotenv:run], etc.).
        GETDOTENV_DEBUG: '1',
        VITEST_WORKER_ID: undefined,
        GETDOTENV_TEST: undefined,
      } as NodeJS.ProcessEnv;

      // Pre-run diagnostics (printed only when the test fails due to Vitest
      // onConsoleLog config): platform, argv, and alias tokenization.

      console.error(
        '[alias-e2e] node:',
        process.version,
        `${process.platform}/${process.arch}`,
      );

      console.error(
        '[alias-e2e] argv JSON:',
        JSON.stringify([nodeBin, ...argv]),
      );

      console.error('[alias-e2e] aliasPayload:', aliasPayload);
      const tokens = tokenize(aliasPayload);

      console.error(
        '[alias-e2e] tokenize(aliasPayload):',
        JSON.stringify(tokens),
      );
      // Simulate the CLI alias transform for the code arg:
      // - tokenize (done above)
      // - peel one symmetric layer of outer quotes on the code token
      const codeToken = Array.isArray(tokens) ? (tokens[2] ?? '') : '';
      const simulatedEval = stripOne(codeToken);
      const quoteCount = (simulatedEval.match(/"/g) ?? []).length;
      const hasEmptyLiterals = /\?\?\s*""/.test(simulatedEval);
      // eslint-disable-next-line no-console
      console.error(
        '[alias-e2e] simulatedEval:',
        JSON.stringify(simulatedEval),
      );
      // eslint-disable-next-line no-console
      console.error(
        '[alias-e2e] simulatedEval length / quoteCount / has ?? "":',
        simulatedEval.length,
        quoteCount,
        hasEmptyLiterals,
      );

      let stdout = '';
      let exitCode = Number.NaN;
      try {
        const result = await execa(nodeBin, argv, {
          env: childEnv,
          all: true, // capture merged stdout/stderr for breadcrumbs context
        });
        stdout = result.stdout;
        exitCode =
          typeof result.exitCode === 'number' ? result.exitCode : Number.NaN;
        if (typeof result.all === 'string' && result.all.trim()) {
          console.error(
            '[alias-e2e] child merged output (all):\n' + result.all.trim(),
          );
        }
      } catch (err) {
        const e = err as {
          exitCode?: number;
          signal?: string;
          timedOut?: boolean;
          failed?: boolean;
          killed?: boolean;
          code?: string;
          shortMessage?: string;
          stdout?: string;
          stderr?: string;
          all?: string;
        };

        console.error('[alias-e2e] execa error summary:', {
          exitCode: e.exitCode,
          signal: e.signal,
          timedOut: e.timedOut,
          failed: e.failed,
          killed: e.killed,
          code: e.code,
        });
        if (e.shortMessage) {
          console.error('[alias-e2e] shortMessage:', e.shortMessage);
        }
        if (typeof e.stderr === 'string' && e.stderr.trim()) {
          console.error('[alias-e2e] child stderr:\n' + e.stderr.trim());
        }
        if (typeof e.stdout === 'string' && e.stdout.trim()) {
          console.error('[alias-e2e] child stdout:\n' + e.stdout.trim());
        }
        if (typeof e.all === 'string' && e.all.trim()) {
          console.error(
            '[alias-e2e] child merged output (all):\n' + e.all.trim(),
          );
        }
        throw err; // preserve failing behavior with added diagnostics
      }
      expect(exitCode).toBe(0);

      const txt = stdout.trim();
      expect(txt.length).toBeGreaterThan(0);

      let parsed: unknown;
      try {
        parsed = JSON.parse(txt);
      } catch {
        // Provide useful debugging when JSON parse fails.
        throw new Error(`alias stdout was not valid JSON: ${txt}`);
      }
      const obj = parsed as {
        APP?: string;
        ENV?: string;
        SECRET?: string;
      };
      expect(obj.APP).toBe('deep_app_setting');
      expect(obj.ENV).toBe('deep_test_setting');
      // With -r/--exclude-private set, SECRET should be blank.
      expect(obj.SECRET ?? '').toBe('');
    },
  );
});
