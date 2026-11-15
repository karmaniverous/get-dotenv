# AGENTS.md

Standing rules for every agent (human or AI) working on a pull request in this repository. They apply to every step of the get-dotenv 8.0.0 dev plan (one branch, `feature/gh-44-get-dotenv-8`, and one PR, [#93](https://github.com/karmaniverous/get-dotenv/pull/93)) and stay until replaced. Each step's brief says "follow AGENTS.md"; these rules are part of every step.

## Source of truth

- The locked product spec (its 8.0.0 Next Version section, decisions and dev plan) is the source of truth. Don't change the spec from a PR. Owner decisions are constraints: never reverse one in code. If real code contradicts the spec, or a decision looks wrong, stop and report it.
- Do only the step you were given. Steps run in order; each depends only on the steps before it.

## Step gate

Every step ends with this gate. It is part of the step's definition and is enforced through the PR progress table. A step can't be ticked in the table until all six columns are filled.

1. **SOLID/DRY** over the step's own diff. Behaviour-preserving refactors go in their own commit, and the unchanged tests and mutation results prove them.
2. **Tests land in the same step.** Every issue the step covers gets a regression test from the issue's repro. The test is shown to fail on the step's parent commit and pass on the step's head, and both commit SHAs are recorded. Every new module or changed function gets a mutation check: break the code, a test must fail. Mutants and results are recorded. Tests that assert nothing a mutant could break don't count.
3. **Docs land in the same step.** `git grep` every README, guide, TSDoc block and SKILL.md that mentions each touched option, API or behaviour, and update every hit. Every new export gets TSDoc, so `npm run docs` stays at 0 warnings.
4. **Baseline.** Any change to the S1 baseline output (`test/baseline-7.0.11/`) must have an entry in `departures.ts` that names its issue or decision. An unlisted change means stop and report; never re-record the baseline to make a test pass.
5. **Gates.** All of these, with zero errors and zero warnings:

   ```bash
   npm run lint
   npx tsc --noEmit
   npm test -- --coverage
   npm run build
   npm run knip
   npm run docs
   npm run verify:types
   npm run verify:package
   npm run verify:smoke
   npm run verify:bundle
   npm run verify:tarball
   ```

   Then the PR-state check (below), push, and CI green on the pushed head on both `ubuntu-latest` and `windows-latest`.

6. **Record it.** Tick the step in the PR progress table, with commit SHAs, regression-test red/green SHAs, mutation results and the docs files touched.

## Finishing step

The finishing step (S15) runs the `jeeves-pr-review` passes. Their results go in the finishing table in the PR description, one row per pass. `gh pr ready` is not run while any row is blank.

| Pass                   | What it checks                                                                                                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Completeness           | Every item in the plan's Covers column, and every 4.11 checklist item this repo owns, is traced to the code and the test that proves it, with links.                                                                            |
| SOLID/DRY              | Over the whole PR diff.                                                                                                                                                                                                         |
| Test adequacy          | Coverage for each touched file is at least its baseline, and new files have their own threshold. A mutation check per new module and no trivial tests. Tests that run in workers or child processes also get same-thread tests. |
| Docs sync              | README and guides checked against the code, and README examples run as tests where the repo does this. TypeDoc has 0 warnings.                                                                                                  |
| Independent review     | By a fresh subagent with no shared context. Every finding is fixed or answered in the table.                                                                                                                                    |
| Gates + CI + mergeable | All gates and CI green on the pushed head, and the PR is mergeable.                                                                                                                                                             |

## Lint, types and skips

- **Never** use `eslint-disable` in production code, and never weaken a lint, tsconfig, knip or coverage rule (no `ignores`, no rules turned `off`, no lowered thresholds). Fix the code.
- In tests only, a single line may carry `eslint-disable-next-line <rule> -- <why>` when the test genuinely can't be written another way. List every such line in the PR description's "eslint-disable lines" section.
- No test is skipped silently. A skip is explicit in code (`it.skipIf(...)`) with a comment naming the issue, and it is listed in the PR description.

## Git and PRs

- Branch names follow `.lefthook/pre-commit/branch-naming-policy` (`feature/`, `bugfix/`, `chore/`, `docs/`, `hotfix/`; no dots).
- Conventional Commits. Commit in logical steps, and **push after every commit**.
- The `add-issue` commit hook prefixes every commit message with `[GH-44]`, taken from the branch name. That prefix is intended: commit normally, and never skip or exclude a hook.
- Immediately before **every** push, run:

  ```bash
  gh pr list --repo karmaniverous/get-dotenv --head feature/gh-44-get-dotenv-8 --state all --json number,state
  ```

  If the newest PR on the branch is `MERGED` or `CLOSED`, stop and report; don't push.

- **Never merge a PR, publish, tag, release or change the package version.** Those are the owner's.
