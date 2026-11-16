# get-dotenv 7.0.11 behaviour baseline

This directory holds the recorded behaviour of the **untouched 7.0.11 code** (dev plan step S1 of the 8.0.0 release). The baseline test, `test/baseline/baseline.test.ts`, re-runs the same corpus on every `npm test` and fails whenever an output differs from the stored one, unless the difference is listed in [`departures.ts`](./departures.ts).

## The rule

**Every departure cites an issue or a decision.** When a change alters a baseline output on purpose, add an entry to `departures.ts`:

```ts
{ case: '#47 undefined into process.env', issueOrDecision: '#47', note: 'EMPTY is deleted, not "undefined"' }
```

`issueOrDecision` is a GitHub issue (`#NN`) or a spec decision (`DNN`). The test rejects entries that name an unknown case. An unlisted difference means stop and report: **never re-record the baseline to make the test pass.**

### Field departures

A case departure stops comparing a whole case. When one value changes in many cases for one cause (a built-in default that every options bag carries, say), list it in `fieldDepartures` instead, so the rest of each case is still compared:

```ts
{
  bagPath: ['scripts', 'git-status', 'cmd'],
  from: 'git branch --show-current && git status -s -u',
  to: 'git status -s -u -b',
  issueOrDecision: '#51 (follow-up)',
  note: 'one command with no shell operators',
}
```

Use one only when all three hold: **one value** (a single field, from one stored value to one new value), **many cases** (a case departure would hide unrelated changes in each of them), **one cause** (the cited issue or decision). Otherwise list the cases.

The comparer (`test/baseline/fieldDepartures.ts`) looks for `bagPath` in every options bag a record holds: the merged bag, and the `getDotenvCliOptions` each child and AWS call received. Where the stored value is `from`, the current value must be `to`; any other value fails, and a stored value other than `from` is compared as is. An entry that rewrites nothing in any case fails the test.

**The hash exemption.** A child also gets its options bag serialized in its env, which is recorded only as a hash, so a rewritten bag changes that hash too. For a child whose decoded `getDotenvCliOptions` a field departure actually rewrote, the comparer takes that one hash (`getDotenvCliOptions` under `added` or `changed`, in the same place as stored) from the current record; the decoded bag is still compared field by field. Every other hash stays exact: a hash change on a child whose bag no departure rewrote, or with a decoded bag that is unchanged, still fails. AWS call env hashes are never exempt.

## Layout

| Path | What |
| --- | --- |
| `win32/`, `linux/` | The stored records, one JSON file per group: `getdotenv.json` (the shipped CLI), `vc.json` (the fixture host), `lib.json` (library-level repros and custom `createCli` hosts). Each maps a case id to its record. Windows and Linux differ (default shell, quoting, env casing), so each OS has its own baseline. |
| `departures.ts` | The typed lists of accepted departures: per case, `{ case, issueOrDecision, note }` (empty at S1), and per field, `{ bagPath, from, to, issueOrDecision, note }`. |
| `../baseline/` | The harness: corpus, hosts, probe, normalization and the test. |

## The harness

Two hosts (`test/baseline/hosts.ts`):

- **`getdotenv`**: the shipped CLI, `createCli({ alias: 'getdotenv', importMetaUrl: import.meta.url })`, exactly as `src/cli/getdotenv/index.ts` builds it.
- **`vc`**: a fixture modelled on smoz-user's `cli/vc.ts`, with only get-dotenv's own plugins and local fixture plugins: the root with its `-c/--cmd` alias; `cmd` at the root and under `aws`; `batch`/`batch cmd`; `aws` with a fixture `secrets pull` (`-s/--secret-name`, `-e/--exclude <keys...>`), a `cli.ns()` leaf; a fixture `smoz` plugin with a `--x`/`--no-x` pair, an `--opt [value]` option, an `openapi` leaf and a plain `new Command()` mount (`legacy run`).

The corpus (`test/baseline/cases/`):

- **Help:** `-h` for the root and every subcommand of both hosts, and `-V`.
- **Spec tables:** every row of the 4.4 and Decision 28 examples tables. Qualified options don't exist in 7.0.11, so a row records its normalized form (terminators removed), or, for rows that fail in 8.0, its typed form with each qualified option written plain at the same position. Child commands become the probe (`echo hi` → `node probe.mjs hi`).
- **Issues #44–#91:** each issue's own repro, adapted only where it calls an external command. Not recorded: #71 (compile-time types only), #80 (needs a real interactive `aws sso login`), #85 (needs a Node process without a TS loader; Vitest and tsx both load TS), and the AWS-forward half of #75 (needs a missing AWS CLI; the stub always answers).

Each case runs in a fresh temporary directory with default fixture files (`package.json`, `.env`, `.env.bali`, `.env.dev`) plus its own. The ambient environment is reduced to what Node, the shells and Vitest need, plus `BASELINE_AMBIENT=ambient-value`.

- **In-process** (default): the host runs inside the Vitest worker, with stdout, stderr, the console and `process.exit` captured. `GETDOTENV_STDIO=pipe` is set, as the repo's own e2e tests do, so child output is captured and top-level help prints under Vitest. The AWS CLI is stubbed by mocking `src/cliHost/exec` the way the aws plugin's tests do (`awsStub.ts`): probes fail, forwards succeed, nothing reaches AWS.
- **Child process** (`mode: 'child'`, only where the behaviour is a child process: exit codes, `process.exit`, real stdio): the host runs as `node --import tsx <entry>`, like the repo's e2e tests, without the Vitest variables.

Child commands are `node probe.mjs …` (`test/baseline/probe.mjs`), which records its argv, cwd and environment.

Recorded per case: the merged options bag, every child the probe saw (argv, cwd, environment difference and the `getDotenvCliOptions` it received), stubbed AWS CLI calls, the exit code (and whether `process.exit` was called), a rejected run's error, stdout and stderr, and, where a case asks, files and the directory tree after the run. Library cases record their return value instead of a bag.

**Redaction:** a child's environment is recorded as the keys added, changed or removed relative to the env the run started with; values are SHA-256 hashes (12 hex digits) of the normalized value. Keys that shells set themselves (`_`, `SHLVL`, `PWD`, `OLDPWD`, `PSModulePath`) are ignored. `--trace` lines for ambient variables are collapsed to one marker line.

**Normalization** (`normalize.ts`): the case directory, the repo checkout, the OS temp directory and the home directory become `<TMP>`, `<REPO>`, `<OSTMP>` and `<HOME>` in raw, forward-slash and JSON-escaped spellings (case-insensitive on Windows), with separators after them written as `/`; the case directory's bare name becomes `<TMPNAME>`; the package and Node versions, ISO timestamps, `NNms` durations and stack frames are replaced; stream output uses LF. The recorder runs the corpus twice and refuses to write unless both runs match.

## Re-pointed cases

A case whose command a later step removes from the code is re-pointed to an equivalent fixture command, and only that case is re-recorded from the untouched 7.0.11 code; nothing else in the baseline is touched.

| Case | Was (S1) | Now | Step |
| --- | --- | --- | --- |
| `#56 profile flag on aws child` | `getdotenv aws --profile flag-profile whoami really` | `aws --profile flag-profile session show` on a fixture host (`createAwsChildHost`: `awsPlugin()` with the fixture child `awsChildFixturePlugin`, `test/baseline/hosts.ts`), same files | S8 |
| `#84 aws child help resolves session` | `getdotenv aws whoami really -h` | `aws session show -h` on the same fixture host, same files | S8 |

Why: #57 (S7) removed the demo `aws whoami really`, which both cases drove. The fixture child has the same shape (a plugin child of `aws` with a `cli.ns()` leaf) and its leaf prints the session it sees (`AWS_PROFILE`, `AWS_REGION`, `ctx.plugins.aws`), so the cases exercise the same paths: the aws `preSubcommand` hook, then (for `#56`) the root `preAction` hook's aws `afterResolve` and the leaf action. The cases live in `test/baseline/cases/awsChild.ts`; with a custom host they are stored in `lib.json`.

How: the 7.0.11 code (`903b57d4`) was checked out into a temporary git worktree outside the repo, with its own `npm ci`; the harness modules and `cases/awsChild.ts` were copied in, and a one-off test ran just these two cases twice (identical output) with the same exec mock as `baseline.test.ts`. The win32 records are that output. No Linux host was available, so the Linux records were derived from the win32 ones with exactly the two platform differences the S1 Linux and win32 records of the same cases show (`export-credentials --format powershell` → `env`; the bag's `shell` `powershell.exe` → `/bin/bash`). The re-pointing commit compares both against the S7 code, which is unchanged from 7.0.11 on these paths, with no departure: locally on win32 and in CI on Linux. The 7.0.11 output shows the #56 defect: the child sees `AWS_PROFILE` `dotenv-profile` although `--profile flag-profile` was given.

## Re-recording

Only for the untouched 7.0.11 code, or to add a platform:

```bash
npm run baseline:record
```

It runs the corpus twice, fails if the runs differ, and writes `test/baseline-7.0.11/<platform>/`. The Linux baseline was produced in CI: when the baseline test fails, CI uploads the current output (`.tsbuild/baseline-actual/<platform>/`) as the `baseline-actual-<os>` artifact. Every run of the test writes that directory, so it is also the place to look when a case fails.
