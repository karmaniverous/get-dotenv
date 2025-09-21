import { execa } from 'execa';
import { describe, expect, it } from 'vitest';

// Windows-only alias termination check with capture enabled.
// Ensures the alias path (--cmd) terminates within a bounded time and
// produces the expected output. Uses execa's timeout to guarantee the test
// never hangs the runner; on failure, partial stdout/stderr are printed.
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

      // 5s step timeout; adjust via env if needed (CI variance).
      const STEP_TIMEOUT_MS = Number.parseInt(
        process.env.GETDOTENV_VITEST_STEP_TIMEOUT_MS ?? '20000',
        10,
      ); // Ensure the child CLI is NOT treated as "under tests" so the alias
      // path is free to call process.exit normally. Keep capture ON.
      const childEnv = {
        ...process.env,
        GETDOTENV_STDIO: 'pipe',
        VITEST_WORKER_ID: undefined,
        GETDOTENV_TEST: undefined,
      } as NodeJS.ProcessEnv;

      const { stdout, exitCode, timedOut } = await execa(nodeBin, argv, {
        env: childEnv,
        timeout: STEP_TIMEOUT_MS,
        killSignal: 'SIGKILL',
      });
      // If we timed out, fail hard with context; Vitest will print stdout/stderr.
      expect(timedOut).toBeFalsy();
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
    20000,
  );
});
