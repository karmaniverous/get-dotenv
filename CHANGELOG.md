# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased](https://github.com/karmaniverous/get-dotenv/compare/v7.0.6...HEAD)

### Bug Fixes

- Resolve eslint errors from PR #24 (tsdoc params, unused import, prettier) ([cdf2385](https://github.com/karmaniverous/get-dotenv/commit/cdf23859fb7d4e24434bacd89fcf361ab522ab56))
- *(core)* Scope afterResolve hooks to invoked command subtree (#23) ([a88392d](https://github.com/karmaniverous/get-dotenv/commit/a88392d44424cf01fedc52c853a8754417871734))
- *(aws)* Scope loginOnDemand to aws command paths only (#23) ([27e5ab4](https://github.com/karmaniverous/get-dotenv/commit/27e5ab458ab0d7a66c330ec4cdcae213b3928a63))

### Refactor

- *(core)* DRY effectiveNs into shared helper, fix stale JSDoc (#23) ([a3ace22](https://github.com/karmaniverous/get-dotenv/commit/a3ace2299d1e92166606eac658c29f160e8ca539))

### Documentation

- Update aws/plugin guides to reflect afterResolve scoping (#23) ([1c2ee07](https://github.com/karmaniverous/get-dotenv/commit/1c2ee078451d04f85fc26ba621aaf3b6e997d0d8))
- *(aws)* Clarify afterResolve loginOnDemand comment rationale ([1297aaf](https://github.com/karmaniverous/get-dotenv/commit/1297aaff15eb8a9ca3bcdff5e8480e801892f916))
- *(aws)* Fix afterResolve contract placement and add inline rationale ([2a44681](https://github.com/karmaniverous/get-dotenv/commit/2a446811bf08ec802d4fe3599faf5f6b789bf5b5))

### Testing

- *(aws)* Add CLI-level integration tests for loginOnDemand scoping (#23) ([ea0c09e](https://github.com/karmaniverous/get-dotenv/commit/ea0c09e2ebc2dc894649002520126353ade6eaa4))

### Miscellaneous Tasks

- Remove temp commit helper scripts ([092df6b](https://github.com/karmaniverous/get-dotenv/commit/092df6baad8774515fd163479daeba120c26a18e))

## [7.0.6](https://github.com/karmaniverous/get-dotenv/compare/v7.0.5...v7.0.6) - 2026-05-21

### Bug Fixes

- Propagate resolved env in preAction for subcommand flows ([ee8166b](https://github.com/karmaniverous/get-dotenv/commit/ee8166b388a5c196a76bbf91b979f05820fc97a8))

### Miscellaneous Tasks

- Release v7.0.6 ([4d9e774](https://github.com/karmaniverous/get-dotenv/commit/4d9e7741d489a681a14f0a8adbb00ba32fe6506b))

## [7.0.5](https://github.com/karmaniverous/get-dotenv/compare/v7.0.4...v7.0.5) - 2026-05-21

### Miscellaneous Tasks

- Release v7.0.5 ([de37067](https://github.com/karmaniverous/get-dotenv/commit/de370670a654847541f4ec702e1a1a9571b483b5))

## [7.0.4](https://github.com/karmaniverous/get-dotenv/compare/v7.0.3...v7.0.4) - 2026-05-21

### Bug Fixes

- Expose resolved env name on GetDotenvCliCtx ([ada32f8](https://github.com/karmaniverous/get-dotenv/commit/ada32f8c9f5b2c52e6c57580ebe893ba47557078))

### Refactor

- Extract env propagation helper per review ([f35fd3b](https://github.com/karmaniverous/get-dotenv/commit/f35fd3b5bb426c4e2e3fecaa258baf880dcce2f0))

### Miscellaneous Tasks

- Release v7.0.4 ([b1ec855](https://github.com/karmaniverous/get-dotenv/commit/b1ec8550a210a904a4fb11be040ee91fe0cf76d5))

## [7.0.3](https://github.com/karmaniverous/get-dotenv/compare/v7.0.2...v7.0.3) - 2026-05-21

### Features

- Add defaultEnvKey option for two-pass env resolution ([d6555fc](https://github.com/karmaniverous/get-dotenv/commit/d6555fc23ba7cfc61a8b4356b679b293fc68a4ee))

### Performance

- Skip pre-pass file I/O when env is explicit ([c1bb1d0](https://github.com/karmaniverous/get-dotenv/commit/c1bb1d084f7955cab28a2c252ee2bd54ec3ed858))

### Miscellaneous Tasks

- Release v7.0.3 ([8bdc05a](https://github.com/karmaniverous/get-dotenv/commit/8bdc05a597558d44f2e51d1483c04b118fe91e91))
- Move docs generation to GitHub Actions ([750de9a](https://github.com/karmaniverous/get-dotenv/commit/750de9a9c942b3cf6e270f91862bbaece983a870))

## [7.0.2](https://github.com/karmaniverous/get-dotenv/compare/v7.0.1...v7.0.2) - 2026-05-20

### Bug Fixes

- *(lint)* Resolve all lint errors after dependency update ([dda89d7](https://github.com/karmaniverous/get-dotenv/commit/dda89d705696fe6ab00874b224c5e734bd393f96))
- *(lint)* Resolve all lint errors after dependency update ([0a93d52](https://github.com/karmaniverous/get-dotenv/commit/0a93d522c729bea7d45634dff7716170c35296f3))
- *(lint)* Add vitest settings to eslint config to fix no-standalone-expect crash ([11bf22c](https://github.com/karmaniverous/get-dotenv/commit/11bf22c2bf6552648b99efb5b56ca4629754b8e2))
- *(cmd)* Use config-enriched defaults in alias invoker to prevent context clobber ([4d6046e](https://github.com/karmaniverous/get-dotenv/commit/4d6046e797fb70d5c601401111ca2e70a87ffec8))

### Refactor

- *(cmd)* Simplify enrichedDefaults merge per review ([c5e61be](https://github.com/karmaniverous/get-dotenv/commit/c5e61bebe7dc62500e5969f7acbb362709b3f56e))

### Miscellaneous Tasks

- Release v7.0.2 ([c673069](https://github.com/karmaniverous/get-dotenv/commit/c673069d23b9300bcedc94d80d91680d05e234f2))
- Add npm publish safety net (.npmignore + gitignore *.local) ([830c70f](https://github.com/karmaniverous/get-dotenv/commit/830c70ff6bfcc2e7565d3d5e700470c448ae783b))

## [7.0.1](https://github.com/karmaniverous/get-dotenv/compare/v7.0.0...v7.0.1) - 2026-01-08

### Documentation

- Update STAN assistant guides for Logger unification ([24056b2](https://github.com/karmaniverous/get-dotenv/commit/24056b228e08012719f259ad18fe6779e77ff7fd))

### Miscellaneous Tasks

- Release v7.0.1 ([1e285da](https://github.com/karmaniverous/get-dotenv/commit/1e285da14fccb30dd1d209dc861e143afffe5430))

## [7.0.0](https://github.com/karmaniverous/get-dotenv/compare/v6.5.2...v7.0.0) - 2026-01-08

### Miscellaneous Tasks

- Release v7.0.0 ([5d7d4f4](https://github.com/karmaniverous/get-dotenv/commit/5d7d4f4ab828d72fb9991830a7ee3b9ec0c48f6c))
- Unify Logger contract to AWS-compatible subset ([0ff861a](https://github.com/karmaniverous/get-dotenv/commit/0ff861a7fe4d4410b91d0823845fb4c7def6092c))

## [6.5.2](https://github.com/karmaniverous/get-dotenv/compare/v6.5.1...v6.5.2) - 2026-01-08

### Miscellaneous Tasks

- Release v6.5.2 ([91885cc](https://github.com/karmaniverous/get-dotenv/commit/91885cc966c407728100c99a026cba475d257011))

## [6.5.1](https://github.com/karmaniverous/get-dotenv/compare/v6.5.0...v6.5.1) - 2026-01-08

### Miscellaneous Tasks

- Release v6.5.1 ([8d65aab](https://github.com/karmaniverous/get-dotenv/commit/8d65aab9023d35ed9067a6e31a462b67ce398dc1))

## [6.5.0](https://github.com/karmaniverous/get-dotenv/compare/v6.4.0...v6.5.0) - 2026-01-08

### Miscellaneous Tasks

- Release v6.5.0 ([1cbb564](https://github.com/karmaniverous/get-dotenv/commit/1cbb5649e941e0736f8a47bdaebe49d7c760ca53))

## [6.4.0](https://github.com/karmaniverous/get-dotenv/compare/v6.3.0...v6.4.0) - 2026-01-01

### Features

- Extract dotenv target resolver helper ([34a1d68](https://github.com/karmaniverous/get-dotenv/commit/34a1d686aea2beb3f07544592a52fe76c1d81982))
- Add dotenv provenance + A2 dynamic order ([72226ff](https://github.com/karmaniverous/get-dotenv/commit/72226ff5aa01e52a034aacd5fd5fa8896c473c62))

### Bug Fixes

- Satisfy exactOptionalPropertyTypes ([f9e520d](https://github.com/karmaniverous/get-dotenv/commit/f9e520ddc58dcc5573c498f627ae3fe0cfd4dd53))
- Provenance type/lint regressions ([4985df3](https://github.com/karmaniverous/get-dotenv/commit/4985df3d09898cb81a4c36a5461672d0ff3b166f))

### Documentation

- Expand provenance requirements detail ([a6b8930](https://github.com/karmaniverous/get-dotenv/commit/a6b8930a97e72f0c8fddb729d6c07e3cf5d6aabf))
- Provenance + dynamic precedence plan ([269da58](https://github.com/karmaniverous/get-dotenv/commit/269da589693a770548575a7279f715d3e06f8286))
- Clarify shipped plugin interop ([c61aecc](https://github.com/karmaniverous/get-dotenv/commit/c61aecc3a3e3005959ffb1f98f720ff13f6598e7))

### Testing

- Align file provenance unset semantics ([32f610b](https://github.com/karmaniverous/get-dotenv/commit/32f610b94a4bc625d71afeffdad13c63e1f4d684))
- Assert file provenance stacks ([349075e](https://github.com/karmaniverous/get-dotenv/commit/349075e14faa47e040ac0b9b84aeb1bf3683eb81))
- Assert dynamic provenance ordering ([966c7c9](https://github.com/karmaniverous/get-dotenv/commit/966c7c9f50bdea0c995fe259b71b0a534baf553e))

### Miscellaneous Tasks

- Release v6.4.0 ([87884fa](https://github.com/karmaniverous/get-dotenv/commit/87884fa4f92ca5ecc45efce1427678d756dc8454))
- *(build)* Remove circular dep warnings ([ed7eae2](https://github.com/karmaniverous/get-dotenv/commit/ed7eae2393d9835c072e4ea27b075a7363d01875))

## [6.3.0](https://github.com/karmaniverous/get-dotenv/compare/v6.2.4...v6.3.0) - 2025-12-31

### Documentation

- Add dotenv editor guide ([6160055](https://github.com/karmaniverous/get-dotenv/commit/61600550031bab6620bb9a0507adc584b44ccabb))

### Miscellaneous Tasks

- Release v6.3.0 ([5fcc93c](https://github.com/karmaniverous/get-dotenv/commit/5fcc93c4e9d304e48797baae7728474153924ee3))

## [6.2.4](https://github.com/karmaniverous/get-dotenv/compare/v6.2.3...v6.2.4) - 2025-12-28

### Bug Fixes

- Templates root + stop dist template copies ([5488ae5](https://github.com/karmaniverous/get-dotenv/commit/5488ae5eb3fa9833b1634c1b7aa5ee3e5da12cbe))

### Documentation

- Remove TypeDoc __type warnings ([dc80e4a](https://github.com/karmaniverous/get-dotenv/commit/dc80e4a37f49c71e350f432f50ac51840da3b117))

### Miscellaneous Tasks

- Release v6.2.4 ([8a48142](https://github.com/karmaniverous/get-dotenv/commit/8a48142d486b0e2f1aa11d00935ee42887ae6b85))

### Build

- Share chunks across dist entrypoints ([5eda67f](https://github.com/karmaniverous/get-dotenv/commit/5eda67f1d0871e695cb3c51f7698a5cab6f85719))

## [6.2.3](https://github.com/karmaniverous/get-dotenv/compare/v6.2.2...v6.2.3) - 2025-12-27

### Miscellaneous Tasks

- Release v6.2.3 ([9134c16](https://github.com/karmaniverous/get-dotenv/commit/9134c16b750b7e05ab0cda50c0857b005ac3518f))

## [6.2.2](https://github.com/karmaniverous/get-dotenv/compare/v6.2.1...v6.2.2) - 2025-12-27

### Miscellaneous Tasks

- Release v6.2.2 ([02b58cf](https://github.com/karmaniverous/get-dotenv/commit/02b58cfe4af2fcbb0f67d11007faffbf333480d5))

## [6.2.1](https://github.com/karmaniverous/get-dotenv/compare/v6.2.0...v6.2.1) - 2025-12-27

### Miscellaneous Tasks

- Release v6.2.1 ([1b5009d](https://github.com/karmaniverous/get-dotenv/commit/1b5009deb816ddf1bc3a2f06ce700b273001d907))

## [6.2.0](https://github.com/karmaniverous/get-dotenv/compare/v6.1.1...v6.2.0) - 2025-12-27

### Features

- Add groupPlugins namespace helper ([cf21bb3](https://github.com/karmaniverous/get-dotenv/commit/cf21bb33c5d55dcb595f3c06513ed4f5675bfcb3))

### Documentation

- Add missing TypeDoc comments ([087bdb6](https://github.com/karmaniverous/get-dotenv/commit/087bdb6bcb790bd70ab4acc99fd9baa8a6baf5b3))
- Add missing TypeDoc comments ([b2e5db9](https://github.com/karmaniverous/get-dotenv/commit/b2e5db97d72a515cff826404c774ea8f75fadb4c))
- Document groupPlugins in Guides ([934ddfd](https://github.com/karmaniverous/get-dotenv/commit/934ddfd865938db4707624a879add80b209b983b))
- Add STAN assistant guide ([0ecb157](https://github.com/karmaniverous/get-dotenv/commit/0ecb157309371141a71f177db123ff835bd64dd6))

### Miscellaneous Tasks

- Release v6.2.0 ([eaf7aff](https://github.com/karmaniverous/get-dotenv/commit/eaf7afffd0b2ee09d4187dd7ab62580cddff4870))

### Docs

- Fix TypeDoc warnings ([425be9f](https://github.com/karmaniverous/get-dotenv/commit/425be9f250466642e324c2c1c9fe85b5f4fd9c50))

## [6.1.1](https://github.com/karmaniverous/get-dotenv/compare/v6.1.0...v6.1.1) - 2025-12-16

### Bug Fixes

- Lint require-await in aws tests ([a2b33ad](https://github.com/karmaniverous/get-dotenv/commit/a2b33ad60138a07fddd90fe61bd7cbd5b53c6618))
- *(aws)* Support SSO creds and export formats ([f38aea9](https://github.com/karmaniverous/get-dotenv/commit/f38aea94ba27c4d017bb88f52480ee04cb6ae051))

### Refactor

- Refactor names ([1f36fdf](https://github.com/karmaniverous/get-dotenv/commit/1f36fdf75aae12fecbc867b54a23f064786814cf))

### Documentation

- Continue alignment pass (batch/capture) ([f22597b](https://github.com/karmaniverous/get-dotenv/commit/f22597b70540730c6962ba8a7a1fd2b12098c137))
- Align examples with implementation ([f89e8fa](https://github.com/karmaniverous/get-dotenv/commit/f89e8fae4bc295e72af4b0dfc788a025130abfe1))
- Fix remaining config/help drift ([94bceb4](https://github.com/karmaniverous/get-dotenv/commit/94bceb4e83e2427dc7c9bcb8e5ffe7edd1582cc9))
- Align examples with current CLI ([e02f31c](https://github.com/karmaniverous/get-dotenv/commit/e02f31c2196961ae7cbb559835f2a93a276e8837))
- Update authoring guide examples to match implementation ([652743a](https://github.com/karmaniverous/get-dotenv/commit/652743ac9611605dc5a98372ce625e1e60d50f32))
- Fix createCli usage and describe plugin structure ([7670719](https://github.com/karmaniverous/get-dotenv/commit/76707194a553912ebff4215575114b5a60ff6171))

### Miscellaneous Tasks

- Release v6.1.1 ([bb7da22](https://github.com/karmaniverous/get-dotenv/commit/bb7da2256dd3e07bfed974f76dd7e67efa486b7f))

### Aws

- Apply flags to nested subcommands ([0826804](https://github.com/karmaniverous/get-dotenv/commit/082680405482e887aaf34530ec2fead2e98ca08b))

### Lint

- Fix aws subcommand flags test ([cbe2a61](https://github.com/karmaniverous/get-dotenv/commit/cbe2a6142a9ecd165bb4cfe8a33327b5d9900408))
- Fix whoami really test mocks ([5ca200b](https://github.com/karmaniverous/get-dotenv/commit/5ca200b095670a6cf1c47ab58a265fb9cdaa5440))

### Whoami

- Add really subcommand module split ([4195e20](https://github.com/karmaniverous/get-dotenv/commit/4195e20c4e284d40677eddb30dbddacd47530bf6))

## [6.1.0](https://github.com/karmaniverous/get-dotenv/compare/v6.0.0...v6.1.0) - 2025-12-14

### Documentation

- Align mount semantics and exports ([ed41069](https://github.com/karmaniverous/get-dotenv/commit/ed41069982891b9c885767927223d0900770ddcb))

### Miscellaneous Tasks

- Release v6.1.0 ([5fc2c26](https://github.com/karmaniverous/get-dotenv/commit/5fc2c26ad20383c0a876ef1f3051a40b450c31b8))

### Docs

- Refocus batch plugin guide ([90c6f91](https://github.com/karmaniverous/get-dotenv/commit/90c6f91d1a0380ce6bfd1755fa1dd461005ca080))
- Expand plugin flag values from ctx ([e61e1b6](https://github.com/karmaniverous/get-dotenv/commit/e61e1b68834a64f9b934ac180e370a59b0155c24))

## [6.0.0](https://github.com/karmaniverous/get-dotenv/compare/v6.0.0-1...v6.0.0) - 2025-12-13

### Features

- *(config)* Enforce strict schema; drop CLI scripts pass-through ([ea3fcb6](https://github.com/karmaniverous/get-dotenv/commit/ea3fcb6e86cbad86490d538125c96edb2685c071))
- Visibility helper, schema rootOptionVisibility, redact flags ([f2fe737](https://github.com/karmaniverous/get-dotenv/commit/f2fe73719cb1e0db7cfebd63698c0010800f712a))
- RootOptionDefaults + unified defaults stack ([f0c12b2](https://github.com/karmaniverous/get-dotenv/commit/f0c12b2da9ab856a99d99e895d390028bf019e8d))
- *(cli)* Add rootOptionDefaults/Visibility in createCli; update template ([223e1b2](https://github.com/karmaniverous/get-dotenv/commit/223e1b208ffc476c7277d185ace19b1a8b1a5d52))
- *(cliHost)* Add overrideRootOptions and adopt in createCli/templates ([db330c6](https://github.com/karmaniverous/get-dotenv/commit/db330c616669f44ed331b40765fa13a5f988f8e2))
- Host-created mounts with required namespaces; override API ([2d3f2ea](https://github.com/karmaniverous/get-dotenv/commit/2d3f2ea26314eb2023e3db983d21c5e184c3a00c))
- Nested plugin composition with mount propagation ([5ea9521](https://github.com/karmaniverous/get-dotenv/commit/5ea95216761efad3f5bee77ed2324176d947923f))
- Add nested plugin composition requirement and plan ([74a8d21](https://github.com/karmaniverous/get-dotenv/commit/74a8d21d94808e6a0593a367b1665b9e4a54c34c))
- *(cli)* Thread Commander generics & typed ns() ([0d4d712](https://github.com/karmaniverous/get-dotenv/commit/0d4d7129a2398b3bbd139e3856fb2a6c38f6ed1b))
- *(types)* Thread extra‑typings Commander generics through host and plugins; add typed ns(); update durable requirements ([7db86db](https://github.com/karmaniverous/get-dotenv/commit/7db86db4752f4774b5ecf901c8714d3ad8cc070b))
- *(cliHost)* Make getCtx() non-nullable and throwing; add hasCtx(); update callers ([9fa902f](https://github.com/karmaniverous/get-dotenv/commit/9fa902f524b3d6bd6b90ff7d396a07e913131bee))
- *(cmd)* Add config schema and wire expand default into alias path ([a1c3c21](https://github.com/karmaniverous/get-dotenv/commit/a1c3c21a53189a8df89076a1a090ef9d37cc26ce))
- *(batch)* Inherit logger from base options; remove per-plugin logger ([a1a10a8](https://github.com/karmaniverous/get-dotenv/commit/a1a10a88eb1700c13a82bc0526167750711361c4))
- *(logger)* Strict contract and schema defaults; remove coalescing ([6d9b199](https://github.com/karmaniverous/get-dotenv/commit/6d9b199171e9b7e42349e61825deeefc416a9eb5))

### Bug Fixes

- Correct visibility types and lint; remove unsafe casts ([cabcc8d](https://github.com/karmaniverous/get-dotenv/commit/cabcc8d568e792057271c95678c3cd02f98617a7))
- Lint violations and test path bug for root defaults ([e05c369](https://github.com/karmaniverous/get-dotenv/commit/e05c369c80f6faa486fc9d8c43f32affccbed880))
- Relax rootHooks param to resolve typecheck error ([202ed68](https://github.com/karmaniverous/get-dotenv/commit/202ed68be271390a3e9e4e66871a3a6b86a72191))
- *(typing)* RootHooks debug logs use typed view; lint clean ([1c63830](https://github.com/karmaniverous/get-dotenv/commit/1c638309674c20f94f364d2609d065a163f3c9fe))
- Typecheck, lint, and programmatic defaults regression ([205a739](https://github.com/karmaniverous/get-dotenv/commit/205a7390de6a62dd14677b3739587677f2a14044))
- *(help)* Show correct default for --load-process-off in top-level -h ([47e2edc](https://github.com/karmaniverous/get-dotenv/commit/47e2edc0c3f2e3374c2c44212a2e2ec597fce563))
- *(cli)* Install plugins before parse; defer hooks to passOptions ([b0cf1f8](https://github.com/karmaniverous/get-dotenv/commit/b0cf1f812681780389557089101e822ea089f75a))
- *(tools)* Align verify-types with overlayEnv; update knip entry ([f697f7e](https://github.com/karmaniverous/get-dotenv/commit/f697f7e78e83128b64a7b2967fc5b329233997c8))
- ExactOptionalPropertyTypes-safe opts for exec core ([5d80875](https://github.com/karmaniverous/get-dotenv/commit/5d808759f6f2d2c49b2a2882dde5c38fbde981ad))
- *(cli)* Trigger root preAction and move aws debug to stderr ([a04efa9](https://github.com/karmaniverous/get-dotenv/commit/a04efa9988a6e609ea9d5cb982132b45e26dbf46))
- Unify GetDotenvCli import casing; gate alias exit under tests ([6a3ad64](https://github.com/karmaniverous/get-dotenv/commit/6a3ad64ca2d3615b9340b406a7cf96286b4ee5dd))
- *(cli)* Cmd args, install sync mounts, and ctx on subcommands ([bb144c3](https://github.com/karmaniverous/get-dotenv/commit/bb144c33d83625d30946a47eb6614f1c3f126221))
- *(cli)* Repair plugin traversal, cmd alias, and generics ([f521b8c](https://github.com/karmaniverous/get-dotenv/commit/f521b8c6b9f15e52ec3bf2cd6cb216b7ebda13d5))
- Finalize typecheck by returning undefined in batch setup ([a1dcefe](https://github.com/karmaniverous/get-dotenv/commit/a1dcefefc31700f4cc7918ef8fcf94712b51ce78))
- Typecheck for plugin setup return, no runtime changes ([110114d](https://github.com/karmaniverous/get-dotenv/commit/110114d11064c8d86b291170516c97a244704b78))
- *(types)* Make plugin setup return Command|GetDotenvCliPublic (no void unions) and tighten installer generics ([d83142d](https://github.com/karmaniverous/get-dotenv/commit/d83142d9d8c5eec91e48ecd8fe4e5624469c9665))
- *(host)* Guard concurrent install and simplify plugin setup typing ([d18307b](https://github.com/karmaniverous/get-dotenv/commit/d18307b508d8601440d5f73539e2778731b06ba5))
- *(help)* Await plugin install before subcommand help routing ([a27f8de](https://github.com/karmaniverous/get-dotenv/commit/a27f8dec89e2ecebea081791eda0af5f5c812349))
- *(cli)* Install plugins before parse; repair aws afterResolve ([b144e83](https://github.com/karmaniverous/get-dotenv/commit/b144e83bdccbb6ae60e5802891a0b134685bde17))
- Type/lint gates for nested composition; await install; aws setup refactor ([7f88077](https://github.com/karmaniverous/get-dotenv/commit/7f88077003b45d772e469eb5b681cc4bf6d2309c))
- *(tests)* Mock correct batch exec module to resolve failures ([a3fc026](https://github.com/karmaniverous/get-dotenv/commit/a3fc026b73260fcb7ebb176bbc3434116d0b0136))
- *(cmd)* Stabilize alias runner under tests; TS/lint cleanup ([cc79bdb](https://github.com/karmaniverous/get-dotenv/commit/cc79bdb203d38ac507c0f2f464c5a89cf39be828))
- *(batch)* Align action typings with Commander generics ([110ff2e](https://github.com/karmaniverous/get-dotenv/commit/110ff2e9786003a1f60ce70b804a5d9988f22dce))
- Infer aws opts by making dynamic options generic ([9c33d4a](https://github.com/karmaniverous/get-dotenv/commit/9c33d4a2e6277f234dc53fcffd7767ecf014e174))
- *(types)* Align host/helper generics and plugin config store ([02df75c](https://github.com/karmaniverous/get-dotenv/commit/02df75c63ca3293b7bc534bd28e2fdccadefbecd))
- *(types)* Generalize compute/resolve over Commander generics ([43093e3](https://github.com/karmaniverous/get-dotenv/commit/43093e3b16799029b3feb3895123efd4f6616481))
- *(types)* Generalize plugin and thread Commander generics ([73c5476](https://github.com/karmaniverous/get-dotenv/commit/73c5476154ab91e3c96fbfed971b5d245b62557d))
- *(cli)* Widen helper generics and remove any[] ([48322b5](https://github.com/karmaniverous/get-dotenv/commit/48322b5b8443b2b90ac726f5696fb47d526c9dd9))
- Resolve lint for batch default action emit ([99f08bc](https://github.com/karmaniverous/get-dotenv/commit/99f08bc1d194359b50773e3613224450daad556f))
- Satisfy typecheck/lint in batch list-shell and alias hook ([164097b](https://github.com/karmaniverous/get-dotenv/commit/164097b3a6475a3b1d21be9fd2d56cc736165862))
- Typecheck and lint cleanups for cmd alias and batch action ([8c14d41](https://github.com/karmaniverous/get-dotenv/commit/8c14d410161add21062b6f7281810a0fcb6dbc89))
- Finalize Commander alias typing and batch lint cleanup ([bd911bf](https://github.com/karmaniverous/get-dotenv/commit/bd911bf16a992ab05d2c0eced433f3ae27416191))
- Resolve remaining Commander variance and batch lint/typing ([d61ddf2](https://github.com/karmaniverous/get-dotenv/commit/d61ddf2ad11a97dc393c49db5a5bfe52e42913b7))
- *(types)* Align Commander typing via CommandUnknownOpts and clean batch UX ([41448df](https://github.com/karmaniverous/get-dotenv/commit/41448df0bd18f042d5ee5032989d538678a9cc2e))
- *(plugins)* Adopt Commander extra-typings inference; fix aws action; clean batch opts ([9d9a6f2](https://github.com/karmaniverous/get-dotenv/commit/9d9a6f2a8fbcd71d4f69ed71dcc103d975c78df7))
- *(cli)* Keep base logger typed and lint‑clean; remove inline import() types ([2735228](https://github.com/karmaniverous/get-dotenv/commit/2735228b0c726dce86a862af4e88ea8e343dbf6f))
- Wire base logger through CLI defaults and batch; no console fallback at call site ([9b14ff7](https://github.com/karmaniverous/get-dotenv/commit/9b14ff797a30a54bc8923fc530d02e74c7478704))
- *(logger)* Required in CLI options; guarantee via readMergedOptions ([0e1e647](https://github.com/karmaniverous/get-dotenv/commit/0e1e647d3e3f86828995d616ec595dc5db47d83e))
- *(types)* Wire generic plugin-config helpers and widen help bag ([444e69a](https://github.com/karmaniverous/get-dotenv/commit/444e69a47a469067ecc88b3e561b6d988efb5a28))
- *(types)* Generic plugin-config store + readonly whitelist ([2285175](https://github.com/karmaniverous/get-dotenv/commit/22851756b48d111ec663d9a6009f0e0c36a0653d))
- *(batch)* Remove non-null assertion in defaultCmdAction ([fb11e78](https://github.com/karmaniverous/get-dotenv/commit/fb11e78c70f9907f489cc26c61b01bef0c198d4e))

### Refactor

- *(types)* Convert GetDotenvConfig and plugin helpers to interfaces ([ad41e8c](https://github.com/karmaniverous/get-dotenv/commit/ad41e8c1a8aed23841733af71d8d47e0a1f368d9))
- *(types)* Replace type aliases with interfaces ([e955834](https://github.com/karmaniverous/get-dotenv/commit/e9558348e4c9926f523d1340b35dfde36440f8fd))
- *(types)* Extract plugin composition interfaces ([334cb2a](https://github.com/karmaniverous/get-dotenv/commit/334cb2a387eac0f2d9ff555b573c960a1361a4d3))
- *(types)* Replace inline option objects with interfaces ([a2769f2](https://github.com/karmaniverous/get-dotenv/commit/a2769f298ac89e99d1414e055f36c37fa4b8ab67))
- *(cliHost)* Simplify dynamic option signatures ([4f814da](https://github.com/karmaniverous/get-dotenv/commit/4f814da3afaf78bbfeb97b05b5721d24d2ff3355))
- *(types)* Export more option interfaces and replace inline object types ([44ffccb](https://github.com/karmaniverous/get-dotenv/commit/44ffccb67376ee5ae367fe6bfbb291f334ddf92d))
- *(cmd)* Export RunCmdWithContextOptions and use in runner ([8018b3f](https://github.com/karmaniverous/get-dotenv/commit/8018b3f96e523ab6bcbba4ad2a1e30780929151d))
- *(types)* Replace inline option objects with exported interfaces ([1cdd1cb](https://github.com/karmaniverous/get-dotenv/commit/1cdd1cb5a8b88cfd2e56f7f4ce5f85776a7b3b7d))
- *(batch)* Export typed option interfaces with TSDoc ([694bf11](https://github.com/karmaniverous/get-dotenv/commit/694bf11ef11a920dec73d99a090ba47a6f4899ba))
- Tighten config contract and add visibility, redact family ([8f08e14](https://github.com/karmaniverous/get-dotenv/commit/8f08e1491299f2106e5e564659c1625584d5a3ff))
- Simplify configs to new format and remove redundant defaults ([abee580](https://github.com/karmaniverous/get-dotenv/commit/abee580e138b6037c9836ff93bd260dd6f7c7f22))
- *(tests)* Drop overrideRootOptions; use GetDotenvCli/createCli per new API ([4bfad71](https://github.com/karmaniverous/get-dotenv/commit/4bfad71340223fbd027f42e8acb18070ba50f6bf))
- Remove public overrideRootOptions; update tests ([504f61f](https://github.com/karmaniverous/get-dotenv/commit/504f61f9e216360304658e2c2a7d1a435ceb0380))
- *(cli)* Stop using overrideRootOptions; install hooks internally ([0016207](https://github.com/karmaniverous/get-dotenv/commit/0016207bfb98bb54bff40acc141922c266fb8331))
- *(cliHost)* Remove passOptions usage; consolidate hooks in overrideRootOptions ([1a5aa13](https://github.com/karmaniverous/get-dotenv/commit/1a5aa134df4b088637f16fea122ab29cd7266016))
- *(reqs)* Unify root options via overrideRootOptions; update plan ([48a16ad](https://github.com/karmaniverous/get-dotenv/commit/48a16ad841b9ee6a6e491f876ee5caa034e7ac5a))
- *(cliHost)* Split definePlugin; add uniqueness guard ([b2b2d92](https://github.com/karmaniverous/get-dotenv/commit/b2b2d92c34335f1b9ad32f218a9fdd164086bf9b))
- DRY batch 2 — normalize exec core and refactor wrappers ([6827e13](https://github.com/karmaniverous/get-dotenv/commit/6827e13fd43ac9fc8ffcbb0271e7658f86fba6c8))
- DRY batch 1 — dynamic/trace/dotenv/aws helpers ([6a6d570](https://github.com/karmaniverous/get-dotenv/commit/6a6d5707407550ce01957e6a391ab5c26e77cb58))
- Remove plugin id and legacy shims; key config by path ([9df72f1](https://github.com/karmaniverous/get-dotenv/commit/9df72f19288306af9a76dde0e693a6ff69047366))
- Remove casts in plugin indexes; fix typings/lints ([38a6ea2](https://github.com/karmaniverous/get-dotenv/commit/38a6ea22b8b82e9d920df93595b880381d884443))
- *(cmd)* Unify alias and subcommand via shared runner; remove legacy alias module ([3d89095](https://github.com/karmaniverous/get-dotenv/commit/3d8909561096981274d9b682c59ca17054153f54))
- *(batch)* Inline parent action into index.ts for better typing ([e48e480](https://github.com/karmaniverous/get-dotenv/commit/e48e48065c9949b6ddf231c5324f027d9d17b2de))
- *(plugins)* Rely on Commander action type inference ([1adae16](https://github.com/karmaniverous/get-dotenv/commit/1adae16d5c64997096bef2f2394aa103ff9b8129))
- *(plugins)* Maximize Commander action type inference ([0ada4fc](https://github.com/karmaniverous/get-dotenv/commit/0ada4fcd12aa0086344d212ad620159b1177b5e7))
- Remove dynamicOption in favor of typed factories ([d9dcced](https://github.com/karmaniverous/get-dotenv/commit/d9dcced39f343365e2b16105eb2799f3ba0889cb))
- Infer Commander action params; widen helpers; explicit root Options ([06783c9](https://github.com/karmaniverous/get-dotenv/commit/06783c9a03dcd6764fd06c443879fd9ab61150d4))
- *(opts)* Drop redundant casts; destructure merged flags across plugins ([709256b](https://github.com/karmaniverous/get-dotenv/commit/709256b6ef3b6f3e786d428262ccab3b641647b9))
- *(cliHost)* Extract heavy GetDotenvCli methods into helpers ([284835a](https://github.com/karmaniverous/get-dotenv/commit/284835a886cbc3d75495de6731125f1320df2621))
- *(cliHost)* Add small passOptions helper; restore exports ([804c481](https://github.com/karmaniverous/get-dotenv/commit/804c4814b955eae9dec6f14660d1ce34747186dd))
- *(cliHost)* Unify GetDotenvCli and decompose helpers ([2788aa1](https://github.com/karmaniverous/get-dotenv/commit/2788aa17e35dc11d62e3f68f002bd05c2013957d))
- Sweep remaining unnecessary casts and fallbacks ([6cbfeed](https://github.com/karmaniverous/get-dotenv/commit/6cbfeed8201b701d243cf73fcf2a7cc355b60a6a))
- Remove additional unnecessary casts and fallbacks ([74c7e85](https://github.com/karmaniverous/get-dotenv/commit/74c7e8580bbf02e3558a3627439e20c6735aa20d))
- Remove unnecessary casts and redundant ?? {} defaults ([c1908c2](https://github.com/karmaniverous/get-dotenv/commit/c1908c2086780b7678b3b5c4f20f97400d356c01))
- Remove unnecessary casts in help config and computeContext ([b140d05](https://github.com/karmaniverous/get-dotenv/commit/b140d05a1647b6907c869cc17b019b188b7847f8))
- Use readMergedOptions across plugins for merged root options ([adee783](https://github.com/karmaniverous/get-dotenv/commit/adee7838e4973219e65068fba2cd85f8c448c627))
- *(batch)* Use readMergedOptions in defaultCmdAction ([8d64a2e](https://github.com/karmaniverous/get-dotenv/commit/8d64a2e53212ab4e6f51259307b39adecec54e8f))

### Documentation

- *(typedoc)* Add missing comments for defineGetDotenvConfig ([4f07460](https://github.com/karmaniverous/get-dotenv/commit/4f074603a9da25496ffe329d6d4089677929bfa2))
- Add package-level and schema TypeDoc across modules ([fcc0286](https://github.com/karmaniverous/get-dotenv/commit/fcc028635de8f6204c1194f94d31d93e7e56f386))
- Expand TypeDoc coverage for schemas and constants ([d0d706c](https://github.com/karmaniverous/get-dotenv/commit/d0d706c130e9ccb199ae60276eb6ac7fefc5cb43))
- Add TypeDoc for default root options constant ([b66363b](https://github.com/karmaniverous/get-dotenv/commit/b66363b8c10128701fda24a1c2b1317c3773a570))
- Add package-level TypeDoc to barrels ([d46fae7](https://github.com/karmaniverous/get-dotenv/commit/d46fae7e5c6b452e996bb639c36ad3a863240fbb))
- *(typedoc)* Finish property docs for batch exec and command helpers ([52a29c9](https://github.com/karmaniverous/get-dotenv/commit/52a29c972796013cf22e90c3fbfbe3fcd8e06752))
- *(typedoc)* Expand property docs across exported option types ([47d3e1b](https://github.com/karmaniverous/get-dotenv/commit/47d3e1bcd7dcbc72d30dd44f0ad074b378f1a089))
- *(typedoc)* Document GetDotenvConfigResolved properties ([4462d90](https://github.com/karmaniverous/get-dotenv/commit/4462d901701e5c822da54cf36cff7d89214c8a7a))
- *(typedoc)* Add missing TSDoc for interface properties ([e9ebf22](https://github.com/karmaniverous/get-dotenv/commit/e9ebf22adea2f69fc710b5379e2698624cc49f26))
- *(getting-started)* Fix dynamic vars cross-link anchor ([0cb1117](https://github.com/karmaniverous/get-dotenv/commit/0cb111756419c3b3bc88b64532bcf7af540b16fe))
- *(getting-started)* Remove demo plugin mention; clarify customization ([ad152bc](https://github.com/karmaniverous/get-dotenv/commit/ad152bc9958fce7d935a7053031b1d093774218d))
- Decompose README and cross-link to Guides ([77392bb](https://github.com/karmaniverous/get-dotenv/commit/77392bbc60119dc7822f4c4f19d6d87513098df8))
- *(plan)* Audit docs and propose README decomposition ([edd5eca](https://github.com/karmaniverous/get-dotenv/commit/edd5eca1ba2a00fe42f027cbc10e9918e744d1d9))
- Fix CJS interop example and add dynamic import snippet ([2753ab6](https://github.com/karmaniverous/get-dotenv/commit/2753ab64bbb0a93b3ab2da6c1accf6832f4373dd))
- Improve authoring guides; add root helper and node -e argv tip ([9f510f1](https://github.com/karmaniverous/get-dotenv/commit/9f510f19fb5887577e379ec60ab2d3e8a6a4dc99))
- Improve authoring guides; add root helper and node -e argv tip ([22ba3f0](https://github.com/karmaniverous/get-dotenv/commit/22ba3f042dc61f2f673154325f8a292b16556d51))
- Sync guides with schema and fix shell intro ([7143f45](https://github.com/karmaniverous/get-dotenv/commit/7143f45d72861269d925098f4608534ef833a515))
- Sync config/shell/authoring/aws guides with code ([4bcf71d](https://github.com/karmaniverous/get-dotenv/commit/4bcf71d7744d6d17503bf6aea62cdf41facbd30f))
- Finish sync of authoring guides with current host ([90f3e11](https://github.com/karmaniverous/get-dotenv/commit/90f3e11ac0c0edea5a52b832c2d30b2232b6818c))
- Sync README and guides with current host and plugins ([0ec3bf4](https://github.com/karmaniverous/get-dotenv/commit/0ec3bf4afc0895a44f2fe025e3d6217afd9110ba))
- Document root visibility and redact; add E2E ([eb6540a](https://github.com/karmaniverous/get-dotenv/commit/eb6540ad59e18eded6061a302f2e3f62297b56dc))
- Unify root defaults via config.rootOptionDefaults and precedence ([abafbbb](https://github.com/karmaniverous/get-dotenv/commit/abafbbbbf68c736eefcd3e9f44a34053c4d1deef))
- *(dx)* Simplify examples to remove unnecessary typing and casts ([28732bb](https://github.com/karmaniverous/get-dotenv/commit/28732bbee26262abcb1feb357066d0e0a7a4a646))

### Testing

- Fix Vitest lint rules in E2E/schema tests ([c0f75f3](https://github.com/karmaniverous/get-dotenv/commit/c0f75f37b27cdf96eb877da2388eedad0721132c))
- Remove dynamic imports in aws exec mock; static typed mock ([1f19a46](https://github.com/karmaniverous/get-dotenv/commit/1f19a46da39c67e542f1cc56d422a91d4852523d))
- Fix aws exec mock to preserve shouldCapture export ([1069da5](https://github.com/karmaniverous/get-dotenv/commit/1069da513bcac13340ad4ae0509edbd5ad91fae0))
- Make redact help tests robust to wrapped output ([847a3a4](https://github.com/karmaniverous/get-dotenv/commit/847a3a4c85b12c0cce8f137df05d32051b0f251f))
- Add visibility and redact dynamic help tests ([a4ece61](https://github.com/karmaniverous/get-dotenv/commit/a4ece61b6407983b53daa4ffb2cadfa9faec8e85))
- Relax cmd alias conflict assertion to only check exit ([5c00fc7](https://github.com/karmaniverous/get-dotenv/commit/5c00fc7606a5e3ff04686fbe0499c17e64935771))
- Fix unit tests for runner argv, version duplication, and cmd conflict ([94a1479](https://github.com/karmaniverous/get-dotenv/commit/94a14793b7296577f9e33518e000e84c24191fb4))
- Refactor unit tests to use createCli and fix help capture ([f0bc359](https://github.com/karmaniverous/get-dotenv/commit/f0bc359331681b0b4960e265c13b85df81ea8f9a))
- *(cli)* Install plugins in unit tests before parse; fix unknown option and arg count errors ([2759f29](https://github.com/karmaniverous/get-dotenv/commit/2759f2990960d1351a4bfdaa594756ddadc65bbf))
- Suppress Commander exits in unit tests; keep help/version non-fatal ([1d65d51](https://github.com/karmaniverous/get-dotenv/commit/1d65d519fc4a4213e24ff080a80301d1ab62a81b))
- *(batch)* Install passOptions in batch tests for new readMergedOptions invariant ([bbc438e](https://github.com/karmaniverous/get-dotenv/commit/bbc438e05aedc97440356d810bd58e203724c758))

### Miscellaneous Tasks

- Release v6.0.0 ([ae3f564](https://github.com/karmaniverous/get-dotenv/commit/ae3f56429b3073c58f3cb91d6a449dd8abaf51c1))
- *(refactor)* Extract option interfaces and decompose GetDotenvCli ([13b191c](https://github.com/karmaniverous/get-dotenv/commit/13b191c537bc12def69a16cee6613c3b843d0442))
- Prune Next up in dev plan to only remaining work ([fac94c8](https://github.com/karmaniverous/get-dotenv/commit/fac94c83327c1f123c441558de2a5a7c4a5eef89))
- Update dev plan for config/CLI contract changes ([e92aecf](https://github.com/karmaniverous/get-dotenv/commit/e92aecf1272fa4ee4d7a4babfb7dc2c9264bdf2e))
- Fix final lint error in createCli help defaults ([5018184](https://github.com/karmaniverous/get-dotenv/commit/5018184498bbf3c0afd05d1e642f68179aeb3ac8))
- *(lint)* Satisfy require-await in resolveGetDotenvOptions ([ce0da8a](https://github.com/karmaniverous/get-dotenv/commit/ce0da8a244bbd0729c21509d0ae691051c96cf65))
- Break core↔cliHost cycle by using neutral defaults ([9e5cf6b](https://github.com/karmaniverous/get-dotenv/commit/9e5cf6b2deea447c5d1aa10b540d13f5b878f21e))
- Align template plugin/CLI; fix build and scripts ([d25b836](https://github.com/karmaniverous/get-dotenv/commit/d25b8364c5f744b42f4a2f32c25366487ad0ae7a))
- Prune completed Next up items in dev plan ([2dc2201](https://github.com/karmaniverous/get-dotenv/commit/2dc220194c2234df02813626c064d1be9caa79d7))
- Add GETDOTENV_DEBUG diagnostics for root/alias flows ([2b46f91](https://github.com/karmaniverous/get-dotenv/commit/2b46f9122b9b79d717af66514a54cfdb053634ab))
- Fix verify-bundle for @commander-js/extra-typings external ([f1c1d01](https://github.com/karmaniverous/get-dotenv/commit/f1c1d01dd319e4c6cd22fc8d25141bff56527705))
- Fix lint by removing non-null assertion and unused import ([53b156c](https://github.com/karmaniverous/get-dotenv/commit/53b156c62a902740ce91daeddbd8b3ae05c1b0cf))

### DRY

- Unify JS/TS loader, dynamic apply, batch argv, and verify lists ([ec3131c](https://github.com/karmaniverous/get-dotenv/commit/ec3131c7b3f90d990f8df3c4c02e05799042adbe))

### Build

- Suppress config-plugin TS warning; exclude templates in tsconfig ([a5b5040](https://github.com/karmaniverous/get-dotenv/commit/a5b50408bc2ac1f8a780f7ff89082b59ec04056b))
- Silence rollup TS warning by scoping program to src ([33879b8](https://github.com/karmaniverous/get-dotenv/commit/33879b8f4d640cd351cd3e819271544bcd906469))
- Exclude templates from TS, copy to dist; fix aliases ([85131e8](https://github.com/karmaniverous/get-dotenv/commit/85131e8650a412a9f3ea1fddb5b04d48d1c7edc6))
- Map "@/..." TS path alias for Rollup bundling ([84faa08](https://github.com/karmaniverous/get-dotenv/commit/84faa0860d3a02e77816e2678cfffb2eeb440ab7))

### CliHost

- Add getRootCommand; use in template hello plugin ([4649f25](https://github.com/karmaniverous/get-dotenv/commit/4649f25a372abe6ce9fb33ae336dd24608da10c0))

### CreateCli

- Compose-first API; return runner fn; precompose defaults ([503af64](https://github.com/karmaniverous/get-dotenv/commit/503af647eb6c3bdb2a6c14d1b97fb2521a732a94))

### Devplan

- Record decomposition plan for visibility/redact ([fb91f03](https://github.com/karmaniverous/get-dotenv/commit/fb91f03962963197bf86f3eeb683cbb81fc86baa))

### Dx

- *(cliHost)* Make readMergedOptions return a concrete bag (no undefined) ([08f599a](https://github.com/karmaniverous/get-dotenv/commit/08f599ad7224c2d5ea31b173a71771da8ef3002c))

### Init

- Inherit logger from base; remove logger option and unsafe opts cast ([1eac0d8](https://github.com/karmaniverous/get-dotenv/commit/1eac0d8c54c4be49ba4287c0969384bad9a7036b))

### Lint

- Drop unused generic from dynamicOption ([9e1c469](https://github.com/karmaniverous/get-dotenv/commit/9e1c4694dcf0f7cea72242de19e1581270845bd5))

### Plan

- Add implementation path for config.rootOptionDefaults ([faaa812](https://github.com/karmaniverous/get-dotenv/commit/faaa812bd708dfa74e886de98498aaad82324c2c))
- Add tasks to implement Commander generics end-to-end ([05a7e8a](https://github.com/karmaniverous/get-dotenv/commit/05a7e8aad818a5bf9ed461f1236f631602c4bc7c))

### Requirements

- Adopt namespace model + host-created mounts ([6642d4a](https://github.com/karmaniverous/get-dotenv/commit/6642d4a3a4c2f38c599b4c921b4089001b416fc0))

### Tsconfig

- Include templates & inherit paths; adjust init tests for template ([9528400](https://github.com/karmaniverous/get-dotenv/commit/9528400eb828233e40107abe4a0a15d1108bb0cb))

## [6.0.0-1](https://github.com/karmaniverous/get-dotenv/compare/v6.0.0-0...v6.0.0-1) - 2025-12-06

### Features

- Finalize plugin schema enforcement and DX polish ([43384d5](https://github.com/karmaniverous/get-dotenv/commit/43384d5e2e9346f43b03c2320f5b1de55b329efd))
- Strict default plugin schema and readonly config surfaces ([ec9edec](https://github.com/karmaniverous/get-dotenv/commit/ec9edecb5e133169f650a33b8e68bfd851a74ceb))
- *(host/plugins)* Materialize plugin config defaults; make readConfig non-optional ([ca3f719](https://github.com/karmaniverous/get-dotenv/commit/ca3f71908cd837e848e616cda88e622f9ce15b8b))
- *(plugins)* Schema-inferred config and no generics at call sites ([0fb4e94](https://github.com/karmaniverous/get-dotenv/commit/0fb4e94db56afe80906ee7f4a8b73393028c2073))
- *(aws)* Remove add-ctx; set-env follows root load-process; mirror only non-sensitive metadata ([6a39f94](https://github.com/karmaniverous/get-dotenv/commit/6a39f945f8f71cb4c0b8a0e7453c063fca4e1c5c))
- *(dx)* Adopt dynamic help in aws; unify vars sanitation ([120b1ea](https://github.com/karmaniverous/get-dotenv/commit/120b1ea9310c432d152ae934bcc48a82bb4bb2be))
- *(types)* Canonical options from Zod; typed config builder; generic getDotenv ([cfa2671](https://github.com/karmaniverous/get-dotenv/commit/cfa2671d3c3c749cde6ee37b76fef5da2a0e7976))
- Tighten typing requirements and loader docs ([b09901c](https://github.com/karmaniverous/get-dotenv/commit/b09901c8978a19823fdc258dfb505049ce027e7e))
- *(host/plugins)* Instance-bound plugin config; remove by-id accessor ([d0facab](https://github.com/karmaniverous/get-dotenv/commit/d0facabf91e2170588235ca2620d8dca699ca723))
- Typed config adoption in aws/batch + docs ([c5a4028](https://github.com/karmaniverous/get-dotenv/commit/c5a40286d20a94982ffcfe5742a0cb8513a00ceb))
- *(types)* Vars-aware defineDynamic and key-preserving overlayEnv ([653ab12](https://github.com/karmaniverous/get-dotenv/commit/653ab1269d8afd3527a58d4df3c1f21625daa6a7))

### Bug Fixes

- *(cmd/alias)* Preserve "" in Node -e payloads on Windows ([646d5be](https://github.com/karmaniverous/get-dotenv/commit/646d5be3187f07d78d383cd8553bc5f849a7359c))
- Revert alias Node execPath substitution (preserve argv) ([c231eb1](https://github.com/karmaniverous/get-dotenv/commit/c231eb1f6c6ccdd378a2ed178b61b534c82025a9))
- Windows alias Node eval uses process.execPath ([bb61ae9](https://github.com/karmaniverous/get-dotenv/commit/bb61ae9d0c59455989d2aae8f43e7c79efaa3814))
- Harden cmd alias env bag serialization ([3e46240](https://github.com/karmaniverous/get-dotenv/commit/3e462401e67a36eb36cad47f59cd9db3a92ff4e7))
- Lint errors in cmd alias executor ([22da0e6](https://github.com/karmaniverous/get-dotenv/commit/22da0e67a5aee1260950986dd2b519f9c15a0578))
- *(cmd/alias)* Resolve type/lint after decomposition ([e7c3851](https://github.com/karmaniverous/get-dotenv/commit/e7c3851ca9494fee35ffffc02f82feb7b6a6db8d))
- Resolve typecheck and lint for dynamic options and Zod v4 ([a956fcf](https://github.com/karmaniverous/get-dotenv/commit/a956fcf0b169be6b63758fadfb6c141a030a2dba))
- Resolve compile/lint issues for Zod v4 enforcement ([1cf3c06](https://github.com/karmaniverous/get-dotenv/commit/1cf3c06e72e6812311d42fa356a62a944192a4b6))
- *(types)* Satisfy InferPluginConfig constraint with GetDotenvOptions ([2c9382d](https://github.com/karmaniverous/get-dotenv/commit/2c9382d42713a51b2eb10f3bf7e2f92fc7752eb7))
- *(plugins/host)* Align dynamic option param type; remove redundant coalescing ([85ca94f](https://github.com/karmaniverous/get-dotenv/commit/85ca94f3a2962bb3cdd2d2af00323c8fd27fcfa1))
- *(types)* Remove duplicate param in createPluginDynamicOption ([238a3fe](https://github.com/karmaniverous/get-dotenv/commit/238a3fe5ae41777f7bc00239358ea6a1c0659789))
- *(plugins)* Solidify schema-inferred plugin config and clean AWS types ([357a325](https://github.com/karmaniverous/get-dotenv/commit/357a325b4b76e77484299c79769c86833e653e37))
- *(types)* Clarify Zod boundary and clean unused import ([b437aff](https://github.com/karmaniverous/get-dotenv/commit/b437aff455ca353acb531d912575e8b8b6617b87))
- *(alias)* Compat cast at converter boundary for exactOptionals ([25ad631](https://github.com/karmaniverous/get-dotenv/commit/25ad631044b146d664ff91d90da0c8fcea1b94dc))
- *(types)* Compat casts at converter boundaries; TSDoc cleanup ([9d96718](https://github.com/karmaniverous/get-dotenv/commit/9d96718ff96e7d453777f57e1fb8503f0f8f0f69))
- *(types)* ResolveCliOptions generics, scripts guard, docs escape ([62007d5](https://github.com/karmaniverous/get-dotenv/commit/62007d52ad2ccbda953ada3443a6f3e82f368b8c))
- *(types)* Overlay options, relax CLI resolver, and lint cleanups ([3a04aee](https://github.com/karmaniverous/get-dotenv/commit/3a04aee17178634959b074a8b6eb9960f9f1e82a))
- *(verify-types)* Robust fallback to source for overlayEnv ([f3ce748](https://github.com/karmaniverous/get-dotenv/commit/f3ce7488ab67d73d9a19c6b2511cc87a14d56953))
- *(verify-types)* Detect typed-const overlayEnv in d.ts ([e656aa1](https://github.com/karmaniverous/get-dotenv/commit/e656aa1140042243847eb2fa5c1e594f56ecba16))
- Verify-types chase and typedoc warning ([ab68ae3](https://github.com/karmaniverous/get-dotenv/commit/ab68ae373ed95534dd3120004f1dece643c98bdb))
- Make instance helpers required on definePlugin return; add duplicate ns guard ([c30dff0](https://github.com/karmaniverous/get-dotenv/commit/c30dff0f42ac7160e489b3d9e9bbf3d886f98290))
- *(cliHost/plugins)* Align plugin-config store typing and dynamic help fallback ([8e42b43](https://github.com/karmaniverous/get-dotenv/commit/8e42b43360645e263a0c834168a7872946dc9fa1))
- *(host/plugins)* Add instance-bound plugin helpers and dynamic option support ([32e212f](https://github.com/karmaniverous/get-dotenv/commit/32e212f03c1f474ff411cce5ba5e6c3a4d4c0cdd))
- *(types)* Correct overload implementations for defineDynamic and overlayEnv ([5b20c8d](https://github.com/karmaniverous/get-dotenv/commit/5b20c8d945ad36c6335ed970067febe98f4ddda7))
- *(types)* Add variadic defaultsDeep overload and assert ctx in readPluginConfig ([5d05cfb](https://github.com/karmaniverous/get-dotenv/commit/5d05cfb507f26eecde80bc87485ab9410105300f))
- *(types)* DefaultsDeep impl bound, ScriptsTable shell, and plugin config lint ([b60af8c](https://github.com/karmaniverous/get-dotenv/commit/b60af8c1864528438aea7fdbbd9443d2c32a0993))
- *(types,lint)* Cast deep-merge via unknown and drop redundant key check ([0f33473](https://github.com/karmaniverous/get-dotenv/commit/0f3347319276fc889af8c17bf34aa7f98ea49adc))
- *(types,lint)* Sanitize options and relax deep-merge typing ([78430ff](https://github.com/karmaniverous/get-dotenv/commit/78430ff748949d4046024316e4e44dc71bb2aebd))
- Type-safe dynamic help and help-time parity w/o casts ([702f35b](https://github.com/karmaniverous/get-dotenv/commit/702f35bcab037236cef49fda6d77f062211f19db))

### Refactor

- *(exec)* Prefer typeof string over Array.isArray for argv unions ([80a51e9](https://github.com/karmaniverous/get-dotenv/commit/80a51e9cf5c2633de891adf2b1847b9a7ee1b627))
- *(plugins)* Remove explicit generic args on plugin dynamic options for better DX ([4142765](https://github.com/karmaniverous/get-dotenv/commit/4142765a5d2736f542eef71badaa09fcb2c93a56))
- *(dxi)* Add omitUndefined/toHelpConfig helpers and apply ([ed2b209](https://github.com/karmaniverous/get-dotenv/commit/ed2b2093edd1122be471ff491888421d553f6542))
- *(requirements)* Adopt instance-bound plugin config, remove by-id ([d87d8a3](https://github.com/karmaniverous/get-dotenv/commit/d87d8a38928f8ab4bbda27c763bc85a1e0ccbc18))
- *(types)* Reduce redundant casts and rely on inference ([a6f0b43](https://github.com/karmaniverous/get-dotenv/commit/a6f0b433684b2e6d15f3dfd5b709c958a4377b06))
- Drop remaining casts; lean on inference for shells/env ([4e074e3](https://github.com/karmaniverous/get-dotenv/commit/4e074e326223f12275f11ae62ef343dbe8de19ad))
- Remove unnecessary env casts; return NodeJS.ProcessEnv ([f54c14b](https://github.com/karmaniverous/get-dotenv/commit/f54c14b3c470dd0fb1661d95977c508fa622061e))
- Remove unnecessary casts and explicit annotations for inference ([fc79987](https://github.com/karmaniverous/get-dotenv/commit/fc79987f24c6b508da8acc606a51a62024d35bcb))
- *(host)* Remove casts via WeakMaps, plugin generics, and explicit createCommand ([7b83677](https://github.com/karmaniverous/get-dotenv/commit/7b8367743263d059f64f05700863117bb5f25c80))

### Documentation

- *(typedoc)* Fix broken JSDoc links that caused warnings ([400edfa](https://github.com/karmaniverous/get-dotenv/commit/400edfabf5c6786601784cc0c290ab0a8fd9a4e8))
- *(build)* Make GetDotenvCliPublic an interface to fix TypeDoc routing ([cbf8eef](https://github.com/karmaniverous/get-dotenv/commit/cbf8eefe7ca9a53522fbaee51eeb8c85a6c955bb))
- Quick start and npx fix for copy‑paste readiness ([adb5ca0](https://github.com/karmaniverous/get-dotenv/commit/adb5ca0920864cc6502ae04980fa897afd5c2e36))
- *(dev-plan)* Prune Next up; log completed items ([e673964](https://github.com/karmaniverous/get-dotenv/commit/e6739648395f16cfc6bb4c50ea7b1fc5eadc075f))
- Remove by-id helper from shipped pages; add TS notes ([b49c213](https://github.com/karmaniverous/get-dotenv/commit/b49c21305e30d2999dd16719a9395e55a1024b0a))
- Migrate examples to instance-bound helpers and plugin-bound dynamic options ([6f1e4e0](https://github.com/karmaniverous/get-dotenv/commit/6f1e4e09307e93b4e762f74a17d8919cdeb03ee3))
- Add fence-hygiene reminder to project prompt ([f92cfc0](https://github.com/karmaniverous/get-dotenv/commit/f92cfc0d6e2407095e8cdbdd21e2accb1485ac32))
- Add compile-only samples and docs for Vars-aware dynamic and overlayEnv ([11df3a1](https://github.com/karmaniverous/get-dotenv/commit/11df3a1dd075163069df6180c2b8a343271aa795))
- Fix shipped plugins index typo (init link) ([a151ca0](https://github.com/karmaniverous/get-dotenv/commit/a151ca0a5a7bd608e59930ed83fe20b7579e058b))
- *(authoring)* Add typed plugin config accessor example ([bb5dec5](https://github.com/karmaniverous/get-dotenv/commit/bb5dec5684acc1c9ff10a4b163f09973be50fc72))

### Testing

- *(e2e)* Stop enabling GETDOTENV_DEBUG in Windows alias test ([e23f102](https://github.com/karmaniverous/get-dotenv/commit/e23f102a65bf3fcc906e2ddc41d710a548acfcbb))
- *(e2e)* Simulate alias transform; log eval string/quote counts ([c452ff3](https://github.com/karmaniverous/get-dotenv/commit/c452ff3d53646ff224327326eb0cd2cab49158bf))
- *(e2e)* Add diagnostics to Windows alias termination test ([9aa06c1](https://github.com/karmaniverous/get-dotenv/commit/9aa06c18a026ab7b22e89600c86aac72c368ee0c))
- *(e2e)* Add rich diagnostics to Windows alias test ([1cabe8b](https://github.com/karmaniverous/get-dotenv/commit/1cabe8b96bf8f7961a2ce573c0c7f58cf7da7c0f))
- Drop env-based per-step timeouts; rely on vitest ([fd4770d](https://github.com/karmaniverous/get-dotenv/commit/fd4770dac4589e08bde6e22640e808645cc4c8d0))

### Miscellaneous Tasks

- Release v6.0.0-1 ([37a127f](https://github.com/karmaniverous/get-dotenv/commit/37a127fcd3d242273604c640d2f966b649df6201))
- Fix template lint for number interpolation ([632943e](https://github.com/karmaniverous/get-dotenv/commit/632943e84097c5c460f0154ab66e2664d28e65cf))
- Lint and typecheck templates ([140878a](https://github.com/karmaniverous/get-dotenv/commit/140878a39a77491c3dab727116c02c509d37d1b3))
- *(dx)* Fix overloads and typing; clean up lint ([dc0ab85](https://github.com/karmaniverous/get-dotenv/commit/dc0ab858e3d62318ac4293a950b08f09cba2a3f5))
- *(dx)* Widen programmatic patterns + exports; minor typing polish ([b4db7ce](https://github.com/karmaniverous/get-dotenv/commit/b4db7ce41b20a7af8192a37c05aaa83f37ade3a8))
- Trim diagnostics from Windows alias E2E test ([7b5f85a](https://github.com/karmaniverous/get-dotenv/commit/7b5f85a3980564c4db3330403b0040e910703a09))
- Fix alias lint (remove unnecessary coalescing) ([417848d](https://github.com/karmaniverous/get-dotenv/commit/417848d53a1512bba8b9ffde6e1a7e586bc6ef5c))
- Clean up lints for dynamic options and imports ([7f2ec32](https://github.com/karmaniverous/get-dotenv/commit/7f2ec32b0758fac5f59fd90ac4449a0847aa2f3d))
- Fix lint issues in cliHost InferPluginConfig ([d1a4316](https://github.com/karmaniverous/get-dotenv/commit/d1a431633e435d6e287e21caeec1699c2e9f69f2))
- *(lint)* Silence false-positive generic lint in definePlugin ([6b88a79](https://github.com/karmaniverous/get-dotenv/commit/6b88a79a55efa6eaad7f3c90e52f8d5ed6b9dcc4))
- *(todo)* Prune Completed and set release tasks ([524fbd6](https://github.com/karmaniverous/get-dotenv/commit/524fbd641df338f4c5d41014317193edf6717b39))
- Expand dev plan for typing enhancements ([fb55360](https://github.com/karmaniverous/get-dotenv/commit/fb5536098d77487e12247cc3b2bbee3d0743b2cc))
- Fix lint (definePlugin generics) and bump test timeout ([c09abbc](https://github.com/karmaniverous/get-dotenv/commit/c09abbc0c62f0f79df2b5d730be40b0e138f3e66))
- *(plugins/host)* Fix lint/typecheck on plugin seam and batch import ([0fd1c2c](https://github.com/karmaniverous/get-dotenv/commit/0fd1c2c843c4885cd44a36c4c38c428266934bdc))
- *(todo)* Plan instance-bound config, remove by-id, migrate ([567609a](https://github.com/karmaniverous/get-dotenv/commit/567609a065627743067b4eaf6f2e1b9b445f0742))
- *(ci)* Fix TypeDoc and knip warnings ([93336aa](https://github.com/karmaniverous/get-dotenv/commit/93336aa103937be87cfbb83ef528f6fcfae7e347))
- *(verify)* Accept generic overlayEnv signature in types check ([c60c3c0](https://github.com/karmaniverous/get-dotenv/commit/c60c3c086f29bcaafcdacc967ebac0e0cf177b09))
- *(ci)* Fix verify-types lint by tracking selected files ([b6f3129](https://github.com/karmaniverous/get-dotenv/commit/b6f3129bf476a5c928d0a0dd0742e8ed4f798c03))
- *(verify)* Assert DynamicFn/DynamicMap and overlayEnv types ([7beaa8f](https://github.com/karmaniverous/get-dotenv/commit/7beaa8f2b21400da16688ca41888f4f0ba6e1c23))
- Prune Next up to build verification & release ([8795396](https://github.com/karmaniverous/get-dotenv/commit/8795396ab8b7771a43ae09b298fb81d903c0789b))
- *(lint)* Remove redundant vars filter in options converter ([defffc2](https://github.com/karmaniverous/get-dotenv/commit/defffc2733a2a2f7a227e3eea4906e34cbddd5b8))
- Align plugin generics, fix TS casts, and clean lint ([12385e9](https://github.com/karmaniverous/get-dotenv/commit/12385e9fe8137fc36c0c78643ebc85c7181cb9b7))
- Fix generic seam, tag cmd alias group, and clean lint ([44e6036](https://github.com/karmaniverous/get-dotenv/commit/44e60364a7983e94b1b20b257528382908637fa6))
- Remove legacy attachRootOptions opts and cut casts ([dea2792](https://github.com/karmaniverous/get-dotenv/commit/dea2792636d97eca0101bb2f5b3b57c0711bd287))

### Lint

- *(exec)* Inline pickResult to avoid unsafe assignment ([6de4e84](https://github.com/karmaniverous/get-dotenv/commit/6de4e840a66f56f53cb5b84b200afc303808fc4c))

### Scripts

- Verify-types now handles star & multi-hop re-exports ([825934e](https://github.com/karmaniverous/get-dotenv/commit/825934e7c779fb3384896af17777f01540d17e3f))
- Make verify-types chase env-overlay re-exports ([98e8282](https://github.com/karmaniverous/get-dotenv/commit/98e8282ee06d3d899b0c9db58de6ee42f225c07c))

## [6.0.0-0](https://github.com/karmaniverous/get-dotenv/compare/v5.2.6...v6.0.0-0) - 2025-12-03

### Features

- *(help)* Always end help output with a blank line; add E2E checks ([7fb24c4](https://github.com/karmaniverous/get-dotenv/commit/7fb24c46cf7fb6cb1b51dfdd8bf40c51df3708e5))
- *(batch)* Inject dotenv env into batch child processes ([01f8343](https://github.com/karmaniverous/get-dotenv/commit/01f83436bf29a924d5c8cc8f3c8c714e2ea84e22))
- *(batch)* Dynamic help for pkg-cwd/root-path/globs + test ([d835813](https://github.com/karmaniverous/get-dotenv/commit/d83581363f18f3ec7fcea93f1c140ba3dac9b157))
- [**breaking**] Drop generator path; host-typed root options with dynamic help ([5239202](https://github.com/karmaniverous/get-dotenv/commit/52392024629f98f4448e971d84e03e4020b2cd7e))
- *(cli)* Dynamic help for log and entropy-warn flags ([78426ed](https://github.com/karmaniverous/get-dotenv/commit/78426ed886f443a0a5b3befae4402a3f3f33cf6a))
- *(cli)* Dynamic help phase 1 (APIs + eval) ([d4fd4fe](https://github.com/karmaniverous/get-dotenv/commit/d4fd4fe04d1064ecc9e3463fa073c644cd03aa05))
- Dynamic option descriptions API and plan updates ([b156070](https://github.com/karmaniverous/get-dotenv/commit/b156070f6382ffd0bf3c5e36b43c45d4fd4c0a1b))

### Bug Fixes

- *(cmd)* Add Commander Command type import for TS/ESLint ([77f5892](https://github.com/karmaniverous/get-dotenv/commit/77f5892305cda7cc90f003eddc01a76181b7bf68))
- *(cmd)* Ensure help prints trailing blank line ([d478109](https://github.com/karmaniverous/get-dotenv/commit/d478109013bdf36096073bf353ead8a88e848fef))
- Normalize trailing newlines for subcommand help (recursive) ([c89b8d3](https://github.com/karmaniverous/get-dotenv/commit/c89b8d3eb87414fd0a63e6a769ef4a4b0a223dad))
- Ensure subcommand help ends with blank line via output hook ([138a9db](https://github.com/karmaniverous/get-dotenv/commit/138a9dbd5ad98951003ddcfd96cf94379e8c6070))
- Ensure help ends with blank line for E2E portability ([510cd68](https://github.com/karmaniverous/get-dotenv/commit/510cd681a13fae87a0ede2017f5eaa89b3ccadbd))
- *(help)* Remove self plugin group on subcommand help; keep child-injected ([69c2ef9](https://github.com/karmaniverous/get-dotenv/commit/69c2ef91b3a606b9dbf47c6a7c0008dc16ece01e))
- *(cli/help)* Subcommand -h prints subcommand help; reorder sections ([fb08190](https://github.com/karmaniverous/get-dotenv/commit/fb08190399185d1a68a5bf40085aec106b1ad455))
- *(batch)* Include dotenvEnv param and sanitize overlay for child env ([80e0459](https://github.com/karmaniverous/get-dotenv/commit/80e04598b6c389bee4f31c3ba568069e3beaa8b5))
- *(help)* Base-only options in root; show all options for subcommands ([f30768d](https://github.com/karmaniverous/get-dotenv/commit/f30768d92a691553f68bf5d87b23ba92ce32b319))
- Print help when GETDOTENV_STDIO=pipe to satisfy E2E ([edeb84e](https://github.com/karmaniverous/get-dotenv/commit/edeb84ecf11395675e89e65d888125449e8a546c))
- Drop generator imports; wire cliCore types; lint/doc cleanup ([d4f7ea0](https://github.com/karmaniverous/get-dotenv/commit/d4f7ea0368ffbef4496916a3ea9575cf7523d1dd))
- *(help)* Skip plugin afterResolve during top-level -h to avoid timeouts ([fb58fdf](https://github.com/karmaniverous/get-dotenv/commit/fb58fdfd400a8be1fdc535023709d445eb91f3e8))
- *(cli)* Resolve dynamic flag duplication; vitest typing; lint ([95fe7e9](https://github.com/karmaniverous/get-dotenv/commit/95fe7e998a7a0fbda5ac98dc8d9c22e698d30c20))

### Refactor

- *(demo)* Use buildSpawnEnv for child env normalization ([21731c0](https://github.com/karmaniverous/get-dotenv/commit/21731c0f5d7a816d0297e928bc70da047277fcbf))
- *(batch)* Simplify dynamic help defaults for root-path and globs ([93cde9d](https://github.com/karmaniverous/get-dotenv/commit/93cde9d7b339dbabf0173f2ab01170a72bcea27a))
- *(help)* Infer cfg in dynamic callbacks; test/help tweaks ([e5cbf34](https://github.com/karmaniverous/get-dotenv/commit/e5cbf34fcc3f7cb27a642c4a3260c737425664f0))
- *(help)* Infer cfg in dynamic callbacks; test/help tweaks ([e5d996f](https://github.com/karmaniverous/get-dotenv/commit/e5d996f2eea52aa16147160fc0cf3acfd638b9be))
- *(help)* Generic dynamicOption + inferred plugin slice; tag batch opts ([285e4ac](https://github.com/karmaniverous/get-dotenv/commit/285e4aca3028bc4afbf099a698d5aeb56d0daffb))

### Documentation

- Zod best-practices and cross-links between plugin config/dynamic help ([086734a](https://github.com/karmaniverous/get-dotenv/commit/086734abf8eca6883a20b16882b34580cd080e75))
- *(plan)* Prune completed generator-doc cleanup from Next up ([1389058](https://github.com/karmaniverous/get-dotenv/commit/138905894d4fefc8c1cfcd634bf23024e69cae02))
- Fix shipped plugins index typo and log in plan ([d79f435](https://github.com/karmaniverous/get-dotenv/commit/d79f435b30a0fb06472cf3a6f2fef4698c05e02f))
- *(help)* Add dynamic help authoring and plugin config notes ([be9d305](https://github.com/karmaniverous/get-dotenv/commit/be9d30582888eedad53f13dfcb0489538c9cee18))
- Persist follow-up build/docs/test tasks in TODO ([5b23216](https://github.com/karmaniverous/get-dotenv/commit/5b232165bfca3ca7fd97e31890f075247a08a405))

### Testing

- *(e2e)* Preserve trailing blank line by disabling execa strip ([f86a87a](https://github.com/karmaniverous/get-dotenv/commit/f86a87a45a8fbba5e5ac252694cbfa769d3b5d8a))
- *(e2e)* Relax help trailing-newline checks to avoid false negatives ([cf97c37](https://github.com/karmaniverous/get-dotenv/commit/cf97c37e487fd609014531def53d1f10e2863603))
- *(help)* Make trailing-blank-line assertions CRLF-safe and tolerant ([3e61688](https://github.com/karmaniverous/get-dotenv/commit/3e61688328e0cc3517619ab5d5fca105c961b1a0))
- *(help)* Resolve TS2353 in root dynamic help test ([55ed9c1](https://github.com/karmaniverous/get-dotenv/commit/55ed9c19ad64417cbbee81a6d858fe7a38bfc724))
- *(help)* Fix typecheck in root dynamic help test ([f009953](https://github.com/karmaniverous/get-dotenv/commit/f0099536ac5a74b686cd7deda897723185a9f8c1))
- *(help)* Add root dynamic help default-label checks ([5edb019](https://github.com/karmaniverous/get-dotenv/commit/5edb019b0ba25e7aff82783f86f225fef64e9290))
- Suppress stdout for passing tests; fix imports ([018a04a](https://github.com/karmaniverous/get-dotenv/commit/018a04a57c90a7f9597b25a16aa25928f3cfd87d))

### Miscellaneous Tasks

- Release v6.0.0-0 ([c1e2edf](https://github.com/karmaniverous/get-dotenv/commit/c1e2edf9696d5a15d1b6d9ecb1f49d5f0dd26cd3))
- Add optional tasks to dev plan; refresh date ([8161c1d](https://github.com/karmaniverous/get-dotenv/commit/8161c1df2a7d2f008f520bbadfa7afa5c8638fcd))
- *(plan)* Mark spawn-env normalization done and prune Next up ([a0900c6](https://github.com/karmaniverous/get-dotenv/commit/a0900c68a9adae475dbc6c492a44b9239f3022b9))
- *(plan)* Remove completed items from Next up ([da10122](https://github.com/karmaniverous/get-dotenv/commit/da1012278356d0fce49b9e9f1769d5a952bc0627))
- *(plan)* Prune completed items from Next up ([8128b28](https://github.com/karmaniverous/get-dotenv/commit/8128b28998ee3ef86388557234adab0ba80098ea))
- Prune plan and remove unused module (knip) ([efdda61](https://github.com/karmaniverous/get-dotenv/commit/efdda61c363798144fdecc089f7f6d2a7f59d110))
- *(todo)* Prune build-output sanity check from Next up ([35c893f](https://github.com/karmaniverous/get-dotenv/commit/35c893fce6beaeceb0428eb9c5bf8c6254643d1e))
- *(todo)* Prune completed dynamic-help and docs tasks ([01f638c](https://github.com/karmaniverous/get-dotenv/commit/01f638ce7d289cfe2f27d6fff915e027f63e6ad4))
- *(todo)* Prune completed items from Next up ([6c10225](https://github.com/karmaniverous/get-dotenv/commit/6c10225fb7e47a76d8ec4f7d67ea65b7e793fcb2))
- *(help)* Keep plugin options out of root help; assert via subcommand help ([9386791](https://github.com/karmaniverous/get-dotenv/commit/938679154a708bc6cda3a9d50baefb6980d19ef7))
- Requirements to drop generator; host dynamic help hardening ([6bc9dac](https://github.com/karmaniverous/get-dotenv/commit/6bc9dac6e2554cb80b21ab68828e4339c266e874))
- *(demo)* Silence afterResolve breadcrumb unless debugging ([68a98c8](https://github.com/karmaniverous/get-dotenv/commit/68a98c85b84fa59d4324e3497e0fdb07154469d7))
- *(test)* Satisfy vitest config lint rules ([1fb8a3a](https://github.com/karmaniverous/get-dotenv/commit/1fb8a3a71f0c7dc054053099324a745adc47e0bd))

### Build

- *(verify)* Add bundle sanity check for external commander ([50179aa](https://github.com/karmaniverous/get-dotenv/commit/50179aa8ea98f8eaee0a79379065e6b705bed590))

## [5.2.6](https://github.com/karmaniverous/get-dotenv/compare/v5.2.5...v5.2.6) - 2025-10-22

### Refactor

- Make root helpers real class methods; remove side-effect ([96e503a](https://github.com/karmaniverous/get-dotenv/commit/96e503a38e68e0ac62559ac8da2dd026a992ca09))

### Documentation

- Fix Shell guide link in shipped/aws; finalize refactor ([cf3fa16](https://github.com/karmaniverous/get-dotenv/commit/cf3fa16b84062e473dced6dc2d817394b7b0d11f))
- Refactor plugin docs; add exec guide; split authoring ([eee48d9](https://github.com/karmaniverous/get-dotenv/commit/eee48d97ec902c20be977e45e2ed7829d1524629))

### Testing

- Fix help.order.test after enhancer removal; satisfy lint ([de5f250](https://github.com/karmaniverous/get-dotenv/commit/de5f2507e69c43921aaa77a1de116579c1a2aec6))

### Miscellaneous Tasks

- Release v5.2.6 ([81a8287](https://github.com/karmaniverous/get-dotenv/commit/81a8287c8d41ad3938c09aff69eec8cf7b56510e))
- Release v5.2.6 ([c1ca443](https://github.com/karmaniverous/get-dotenv/commit/c1ca443c25107e50b2ae7d92812a520dd6cb8e89))
- Remove enhancer module and scrub obsolete imports ([d022068](https://github.com/karmaniverous/get-dotenv/commit/d02206854b70e4e13cf6b6bddb5f22764b029e7c))

## [5.2.5](https://github.com/karmaniverous/get-dotenv/compare/v5.2.4...v5.2.5) - 2025-10-22

### Features

- *(cliHost)* Make attachRootOptions/passOptions unconditional ([cd97b45](https://github.com/karmaniverous/get-dotenv/commit/cd97b45e93f3231e717944c22ebcafc53117e23a))

### Testing

- *(cliHost)* Fix helpers exposure test to import /cliHost entry ([32cecee](https://github.com/karmaniverous/get-dotenv/commit/32cecee817b280c331a628ddc878ab891289c153))

### Miscellaneous Tasks

- Release v5.2.5 ([92d9f5a](https://github.com/karmaniverous/get-dotenv/commit/92d9f5a9cdbfbfbb33d1d51addda5e67daeb2f0a))

## [5.2.4](https://github.com/karmaniverous/get-dotenv/compare/v5.2.3...v5.2.4) - 2025-10-22

### Features

- Public host interface + root spawn env export ([be4d19b](https://github.com/karmaniverous/get-dotenv/commit/be4d19ba821314e052a35383ecbe6025691a9e86))

### Bug Fixes

- Host/plugin seam casting and batch typing ([4a011e0](https://github.com/karmaniverous/get-dotenv/commit/4a011e0f5161b05c1df04a9a938d9252ea7d1703))
- Generic plugin seam + batch/cmd typing; cast host to public interface ([3294886](https://github.com/karmaniverous/get-dotenv/commit/3294886e6c3268e5e5e374be16a446d9f70e6da1))

### Miscellaneous Tasks

- Release v5.2.4 ([192104e](https://github.com/karmaniverous/get-dotenv/commit/192104edde5166b20ab8afdb4212b8a19e779d3b))

## [5.2.3](https://github.com/karmaniverous/get-dotenv/compare/v5.2.2...v5.2.3) - 2025-10-22

### Bug Fixes

- Resolve TS2307 in rollup; add knip entry; docs barrel ([2b073a9](https://github.com/karmaniverous/get-dotenv/commit/2b073a95b5e900f8c42cb82aa8055a863b9fbe0e))

### Documentation

- Sync guides with plugins barrel; add SMOZ interop response ([cdd3699](https://github.com/karmaniverous/get-dotenv/commit/cdd369977cd63a518c75c7999a869596f3fb8a02))

### Miscellaneous Tasks

- Release v5.2.3 ([b9f69b8](https://github.com/karmaniverous/get-dotenv/commit/b9f69b8bea9b347878a6786381b5b5d2526cd47c))

## [5.2.2](https://github.com/karmaniverous/get-dotenv/compare/v5.2.1...v5.2.2) - 2025-10-21

### Miscellaneous Tasks

- Release v5.2.2 ([c8c02be](https://github.com/karmaniverous/get-dotenv/commit/c8c02bebcefadd7f6a844547be9643524991e431))

### Build

- Publish cmd and demo plugin subpaths ([aa48cbd](https://github.com/karmaniverous/get-dotenv/commit/aa48cbdd858ce9809dd34b9e2264c3497f314bdc))

## [5.2.1](https://github.com/karmaniverous/get-dotenv/compare/v5.2.0...v5.2.1) - 2025-10-21

### Features

- *(cli)* Add canonical createCli export and refactor shipped CLI ([45c47cd](https://github.com/karmaniverous/get-dotenv/commit/45c47cdd3b04017d1f7b810bacba0a9678274d26))
- Switch to get-dotenv host; add cmd/batch; unify env/validation/diagnostics ([30ed52f](https://github.com/karmaniverous/get-dotenv/commit/30ed52fd0d1211c530912999d000a65509f3a19e))

### Bug Fixes

- *(interop)* Short-circuit help before branding to avoid ESM timeout ([e444c75](https://github.com/karmaniverous/get-dotenv/commit/e444c751d9f13fd13a847f052e71443b8718ed24))
- Short-circuit help in createCli.run to avoid exit in CJS ([756255b](https://github.com/karmaniverous/get-dotenv/commit/756255b6a69640851d432d5aebd24647ff133889))

### Documentation

- Docs update ([5acf984](https://github.com/karmaniverous/get-dotenv/commit/5acf9848db5bdc9792cfb143ae4c0c570533cd0c))

### Testing

- *(interop)* Short-circuit help under tests to avoid exit ([cf8362a](https://github.com/karmaniverous/get-dotenv/commit/cf8362ad9e69fea257d70e0f2b86c6306b3986c1))
- *(interop)* Set GETDOTENV_TEST for help override in createCli ([dba54e3](https://github.com/karmaniverous/get-dotenv/commit/dba54e3c1ff0e7ed7693301a603012cd3ee2d862))
- *(interop)* Avoid process.exit on help under Vitest ([0e25df0](https://github.com/karmaniverous/get-dotenv/commit/0e25df0afae0fe473a3b3a91e8adf724fced00a2))

### Miscellaneous Tasks

- Release v5.2.1 ([f6e62c8](https://github.com/karmaniverous/get-dotenv/commit/f6e62c85ad007ba3583ed6df74a953442f11cf8f))

### Docs

- Add wiring guide for included plugins in host CLI ([1c19e60](https://github.com/karmaniverous/get-dotenv/commit/1c19e60a7e7f69a4d2436e3a17b8e63de35c28b5))

## [5.2.0](https://github.com/karmaniverous/get-dotenv/compare/v5.1.0...v5.2.0) - 2025-10-19

### Features

- Spawn env normalization + help ordering polish ([a714efc](https://github.com/karmaniverous/get-dotenv/commit/a714efcdb4e2e1f6e06c5464076077465c2cb7b8))
- *(diagnostics)* Add redaction and entropy warnings with CLI flags ([2085ecb](https://github.com/karmaniverous/get-dotenv/commit/2085ecb29cc569e16c7517df275459d7becd6461))
- *(validation)* Add requiredKeys/schema config validation + --strict ([ba7cba0](https://github.com/karmaniverous/get-dotenv/commit/ba7cba02e6fe61b5c0d18609baab4d9047a8eec9))
- *(interpolation)* Add interpolateDeep; phase C and per-plugin wiring ([e47b598](https://github.com/karmaniverous/get-dotenv/commit/e47b598bbee86065a341f06a6ef58a24fb3f3a3a))

### Bug Fixes

- *(phase-c)* Resolve TS2379 under exactOptionalPropertyTypes ([cff46ad](https://github.com/karmaniverous/get-dotenv/commit/cff46adc03ae4b35811feeb0711bc96a21d65c2f))

### Documentation

- Add interpolation/validation/diagnostics; bump v5.2.0 ([cc1e509](https://github.com/karmaniverous/get-dotenv/commit/cc1e509465f501dad3dbf7ed6fcbc9f77343a6fb))
- Adopt SMOZ interop amendment; plan implementation ([20d47a2](https://github.com/karmaniverous/get-dotenv/commit/20d47a2b38b5c911761c603ed8d77297d9039322))
- Adopt SMOZ interop amendment; plan implementation ([7ca2a94](https://github.com/karmaniverous/get-dotenv/commit/7ca2a9460beafc0b0d7c9e406c71a2cd3c16b392))
- Partition project prompt into requirements and policies ([016433f](https://github.com/karmaniverous/get-dotenv/commit/016433f038a151f065cee230604b68dceef188f9))
- Partition project prompt into requirements and policies ([b90a636](https://github.com/karmaniverous/get-dotenv/commit/b90a63614abcb621bbbfa01ef1753402a043152e))

### Miscellaneous Tasks

- Release v5.2.0 ([51010f7](https://github.com/karmaniverous/get-dotenv/commit/51010f7262fbd47f314efa699f68b4ef182a12ce))
- *(docs+knip)* Fix TypeDoc warning and knip findings ([5fb4ee9](https://github.com/karmaniverous/get-dotenv/commit/5fb4ee9529bfd3a0fde3bbdc7933a3633d4764a3))
- *(facets)* Enable docs facet; plan full documentation sweep ([c4603b9](https://github.com/karmaniverous/get-dotenv/commit/c4603b98c239c893a0c7d7654b911572e78d16ec))
- *(todo)* Trim Next up; clarify release status ([149977b](https://github.com/karmaniverous/get-dotenv/commit/149977b4af933cfddcd06d65fbd770a0cce0a3f5))
- *(facets)* Add configs and vscode facets (inactive by default) ([d168f49](https://github.com/karmaniverous/get-dotenv/commit/d168f49c495512ce55a5ffb6bbfdc84a968cf562))
- *(facets)* Peel generator to reduce archive size ([0e69c53](https://github.com/karmaniverous/get-dotenv/commit/0e69c53ebf3cb3871d48b4afdc53337ccde0da10))
- *(facets)* Slim next archive with facet overlay and anchors ([fd8c8aa](https://github.com/karmaniverous/get-dotenv/commit/fd8c8aa44162e89224474a87fab264f2344e8551))

### Plan

- Prioritize interpolation, validation, diagnostics, and spawn-env ([2492c02](https://github.com/karmaniverous/get-dotenv/commit/2492c0292398677c6dc69bb7297cd669a32002b3))

## [5.1.0](https://github.com/karmaniverous/get-dotenv/compare/v5.0.0...v5.1.0) - 2025-09-22

### Features

- *(cli,docs)* Brand shipped CLI; add branding/app options docs ([ca56271](https://github.com/karmaniverous/get-dotenv/commit/ca562711a2b1b4f8b11b24d3acf3f83f78ad0041))
- *(host)* Grouped help sections and branding API ([e9fe52c](https://github.com/karmaniverous/get-dotenv/commit/e9fe52c7e8d7b73cdd93af6b46295e5d84240005))

### Bug Fixes

- *(cli)* Alias guard, help typing, and wrapper annotations ([5654a29](https://github.com/karmaniverous/get-dotenv/commit/5654a2915fdf4c86a2c0e66a4d7b5e0314ba928c))

### Refactor

- *(host)* Decouple from generator; fix type import lint ([ecfdb75](https://github.com/karmaniverous/get-dotenv/commit/ecfdb750b71ad968031f3c417afdbd20947a01f0))

### Miscellaneous Tasks

- Release v5.1.0 ([c4946a3](https://github.com/karmaniverous/get-dotenv/commit/c4946a3beac1d3813e337d5c5b2e303e09fcc2f4))

## [5.0.0](https://github.com/karmaniverous/get-dotenv/compare/v5.0.0-2...v5.0.0) - 2025-09-21

### Documentation

- Unwrap manual wrapping in guides (cascade, generated CLI) ([501245b](https://github.com/karmaniverous/get-dotenv/commit/501245b1767793fefc206d1e968ac944db537920))
- Fix README fences/typos, add guide links; add capture & scripts docs ([c2a0c3b](https://github.com/karmaniverous/get-dotenv/commit/c2a0c3b37667777e3ceec6fb01defea673049a79))

### Miscellaneous Tasks

- Release v5.0.0 ([3a622cd](https://github.com/karmaniverous/get-dotenv/commit/3a622cd7daf96fabb5057328d624c16daa03103d))

## [5.0.0-2](https://github.com/karmaniverous/get-dotenv/compare/v5.0.0-1...v5.0.0-2) - 2025-09-21

### Bug Fixes

- *(generator)* Avoid double exec for batch -c by early-return ([9f5dc3a](https://github.com/karmaniverous/get-dotenv/commit/9f5dc3a96b295a94bd8ec94269db303cb74c944e))
- *(generator)* Correct action signatures for variadic args ([b46f831](https://github.com/karmaniverous/get-dotenv/commit/b46f83191186298f85c440ae817ff94270fbbac6))
- *(generator)* Accept positional args for cmd subcommands ([39dfa9d](https://github.com/karmaniverous/get-dotenv/commit/39dfa9d5e62d6372de5c9c995a31997e0e4423ce))

### Testing

- *(generator)* Runtime parity for cmd and batch behaviors ([04d0ac9](https://github.com/karmaniverous/get-dotenv/commit/04d0ac9d89a98a43904a582006d8254da67fabaf))

### Miscellaneous Tasks

- Release v5.0.0-2 ([cee3f49](https://github.com/karmaniverous/get-dotenv/commit/cee3f49696f931e8890545182a093166a8af2904))

## [5.0.0-1](https://github.com/karmaniverous/get-dotenv/compare/v5.0.0-0...v5.0.0-1) - 2025-09-21

### Bug Fixes

- Lint error and stabilize E2E timeouts ([730c30b](https://github.com/karmaniverous/get-dotenv/commit/730c30ba81fd713f5859cbdad01106b3b8981496))
- *(converter)* Drop undefined vars; fix array check lint in paths ([8d7868e](https://github.com/karmaniverous/get-dotenv/commit/8d7868eb3b55f1dd1888bc724a08bbd5cf261e23))
- *(cli-compat)* Accept object vars/array paths; bump timeouts for stability ([8ea49ba](https://github.com/karmaniverous/get-dotenv/commit/8ea49bad1e5c7ef4c8015e129a5601474dcbe4c0))
- *(cli-compat)* Tolerate object vars and array paths in CLI defaults ([d8b1b67](https://github.com/karmaniverous/get-dotenv/commit/d8b1b678ae55ae075f4eff7831c6361f0a83a128))

### Miscellaneous Tasks

- Release v5.0.0-1 ([7c658d6](https://github.com/karmaniverous/get-dotenv/commit/7c658d6abaeca680e0ba663d6f5a4a4e963739b8))

## [5.0.0-0](https://github.com/karmaniverous/get-dotenv/compare/v4.6.0-0...v5.0.0-0) - 2025-09-21

### Features

- Relax Node engines to >=18 and add default-shell smoke ([c0ccb9b](https://github.com/karmaniverous/get-dotenv/commit/c0ccb9b276800bb658f24f4859d0dd2c4df912d6))
- *(requirements)* Add entropy warning design (no masking) ([0db5bc4](https://github.com/karmaniverous/get-dotenv/commit/0db5bc47631b22d5db382007ad30af4ba07c17b1))
- *(cli)* Add AWS subcommand and wire aws plugin ([99f0eef](https://github.com/karmaniverous/get-dotenv/commit/99f0eefa7f55d1fd23835b0fd3fc3d4206aa462a))
- *(exec,plugins)* Add captured exec helper and AWS base plugin (host-only) ([cd36fb0](https://github.com/karmaniverous/get-dotenv/commit/cd36fb04c44e2da61a694806049bfa35468efca3))
- *(cli)* Add demo plugin with annotated examples ([3d29c19](https://github.com/karmaniverous/get-dotenv/commit/3d29c19401f3f8481f055a1deeeec3580195b4ce))
- *(alias)* Add forced-exit guard; stabilize Windows alias test ([72796a0](https://github.com/karmaniverous/get-dotenv/commit/72796a09863cb09d52754a77638991845d89fe5e))
- *(trace)* Add --trace (optional keys) diagnostics for child env composition ([f52b1f5](https://github.com/karmaniverous/get-dotenv/commit/f52b1f524abc68ea5447b42326e1505d73f8fc63))
- *(cli)* Add --capture and GETDOTENV_STDIO=pipe to capture child stdio ([bb40415](https://github.com/karmaniverous/get-dotenv/commit/bb40415c19ce0361e218df56598b66878f0d1b17))
- *(cli/batch)* Support implicit positional command; adopt -c, --cmd alias ([d7dd419](https://github.com/karmaniverous/get-dotenv/commit/d7dd41917b71e418c38c87cdafd31d1ca5e71534))
- *(cmd)* Parent-level alias option and root preAction; fix batch regressions ([e79a4fb](https://github.com/karmaniverous/get-dotenv/commit/e79a4fb6f522ed288f0b572936ec2ea80a3fa65d))
- *(cli)* Chainable attachRootOptions/passOptions (adapter-layer) ([b7a493b](https://github.com/karmaniverous/get-dotenv/commit/b7a493bc8ddc27d4d992ce01f1fd1098a29d3efe))
- *(cli)* Add cmd plugin and make it default ([dd4e03b](https://github.com/karmaniverous/get-dotenv/commit/dd4e03b88fc13b4dba7caee48d8f3d51ca3cbc35))
- *(cli)* Always-on config loader + shared cliCore flags ([2467d1d](https://github.com/karmaniverous/get-dotenv/commit/2467d1d27f1705a79c8797d749c930e6a9ac2558))
- *(cache)* Trim old compiled dynamic TS cache files; fix tests ([c48a44a](https://github.com/karmaniverous/get-dotenv/commit/c48a44a4bc57634feda311b0a92636bf616ba2d3))
- *(init)* Scaffold configs and host CLI with templates ([61708ce](https://github.com/karmaniverous/get-dotenv/commit/61708cedd50b379e0d77162d6260626e7c072c84))
- *(cli)* Guarded config-loader flag and shared resolver ([5374715](https://github.com/karmaniverous/get-dotenv/commit/5374715fa3e999661ed3a3d1b8430f621b6afc2f))
- *(host)* Add --use-config-loader flag to demo CLI ([ba0ac52](https://github.com/karmaniverous/get-dotenv/commit/ba0ac5273ce8d689b365c5f38cb3c958bf34eb2d))
- Subpath exports, shared dynamic loader, and host demo CLI ([cbe2599](https://github.com/karmaniverous/get-dotenv/commit/cbe259918e327437c2efe30dff71b38d7fd9bc64))
- JS/TS config support and host integration flag ([5d68899](https://github.com/karmaniverous/get-dotenv/commit/5d68899e6a85377a9d411e0e64edd972e31ec8c0))
- Add config loader (JSON/YAML) and env overlay engine ([56f05b3](https://github.com/karmaniverous/get-dotenv/commit/56f05b39dd054c18a8259897fcd1fd94abdd2c6f))
- *(plugin)* Add batch plugin + parity tests ([11f2bfa](https://github.com/karmaniverous/get-dotenv/commit/11f2bfaadcfb755c7fa32a0a3ddbfaa3918797ac))
- *(host)* Strict schema validation + tests; silence docs warn ([3863312](https://github.com/karmaniverous/get-dotenv/commit/3863312f18eaf7c618d1fad8d81e56dec03290ed))
- *(host)* Add plugin-first CLI host skeleton ([6af8d44](https://github.com/karmaniverous/get-dotenv/commit/6af8d4426cf1a7faa7a41cdbeeeb729d73140ca9))
- *(schemas)* Add initial Zod schemas and packaged defaults ([72ccf90](https://github.com/karmaniverous/get-dotenv/commit/72ccf901c069ff247d693246796aa77fab3d9139))

### Bug Fixes

- *(verify)* Prefer files-field fallback before npm-packlist; fix expected list ([9311b1c](https://github.com/karmaniverous/get-dotenv/commit/9311b1c41ea4558292d48d5485cf2b7e13321056))
- *(verify)* Add files-field fallback to verify-tarball ([dccd89f](https://github.com/karmaniverous/get-dotenv/commit/dccd89fac2d304e583f4bf2613ed15413102698f))
- *(verify)* Make npm-packlist fallback robust (pass package.json) ([e8a3179](https://github.com/karmaniverous/get-dotenv/commit/e8a3179eaeac2b2cc99b702f20bc2d0b7ecad947))
- *(verify-tarball)* Remove TS casts; keep ESM .mjs ([44d26e0](https://github.com/karmaniverous/get-dotenv/commit/44d26e03bc16fe9709549303489d71852af129b3))
- Robust verify-tarball parsing for npm pack --json ([645948a](https://github.com/karmaniverous/get-dotenv/commit/645948a37d1ae8e8e22ee7158346494c73ac40f8))
- *(aws)* Correct subcommand arg parsing; relax E2E timeout ([24b4664](https://github.com/karmaniverous/get-dotenv/commit/24b4664ba607cfe29476a2fb890e791224673cae))
- *(aws)* Stabilize subcommand and tests; lint clean ([f25b070](https://github.com/karmaniverous/get-dotenv/commit/f25b070ef470b313b7f1a65be5fa0f6987d8916b))
- *(exec,aws)* Resolve TS/ESLint issues; harden parsing and optional fields ([8d4024a](https://github.com/karmaniverous/get-dotenv/commit/8d4024a80b9d6ee46b8f8dd4c476e14e8315eff8))
- *(init-test)* Assert config files to satisfy ESLint ([4a5f3dd](https://github.com/karmaniverous/get-dotenv/commit/4a5f3dd068a0d88326e4df396bf7fb13824b1dfa))
- *(alias)* Remove ?? and narrow tokens to satisfy TS/lint ([79647f3](https://github.com/karmaniverous/get-dotenv/commit/79647f3242159bcb9e30511df308687780266a64))
- *(alias)* TS guards and fallback detection for node -e ([b2ef363](https://github.com/karmaniverous/get-dotenv/commit/b2ef363bb11e169a3fc6d0cbe09caf8e48089f9c))
- Windows alias --cmd node -e termination and clean up ([2067dbb](https://github.com/karmaniverous/get-dotenv/commit/2067dbbe1cb0bf16c211182be3a80f32c8ff52a8))
- *(exec)* Exact-optional env/stdio and env sanitization ([e35a851](https://github.com/karmaniverous/get-dotenv/commit/e35a8516c8813a49bb53811c9eb35b9c0eb6378e))
- *(exec)* Conditionally include cwd in execa options ([1ae91e5](https://github.com/karmaniverous/get-dotenv/commit/1ae91e5df5a8fe36c044caef162d74a453dd61f9))
- *(exec)* Accept cwd in shared run helper ([c9a8569](https://github.com/karmaniverous/get-dotenv/commit/c9a8569e7ffa5294fc40e09ca1c76f4ae66c587a))
- *(cmd/alias)* Robust termination on success and error paths ([c10371d](https://github.com/karmaniverous/get-dotenv/commit/c10371d2377a9413eb83da148261a3f948129a1a))
- *(cmd/alias)* Always terminate alias-only runs outside tests ([fb08f07](https://github.com/karmaniverous/get-dotenv/commit/fb08f073dc61e7d184ddf4fbc6df08867a5445de))
- *(cmd/alias)* Suppress fallback exit under tests; docs update ([f7b4e50](https://github.com/karmaniverous/get-dotenv/commit/f7b4e5058e73b980d9437744646123f3731e1820))
- *(cmd/run)* Strip outer quotes from argv for shell-off execa ([572a845](https://github.com/karmaniverous/get-dotenv/commit/572a845877e3cb470af36312cdd4d09491b1315e))
- *(cmd)* Preserve argv array for --shell-off to avoid re-tokenization ([aaab254](https://github.com/karmaniverous/get-dotenv/commit/aaab254867f8ff708115cdc7c491e260ec01ab10))
- Honor individual exclude flags (-r) in tri-state resolver ([58b966e](https://github.com/karmaniverous/get-dotenv/commit/58b966ed661086808bf5c6f5707398ba034fb648))
- *(cmd)* Restore robust shell-off quoting and execaCommand typing ([c1cc73d](https://github.com/karmaniverous/get-dotenv/commit/c1cc73d75a121506214f0d95b9f684fa6536e47e))
- *(cmd)* Preserve argv when shell-off to avoid breaking node -e on Windows ([732860c](https://github.com/karmaniverous/get-dotenv/commit/732860c78c341642b3d007e5a5f5cad5acc63023))
- *(host)* Avoid process.env mutation in skeleton preSubcommand ([a809137](https://github.com/karmaniverous/get-dotenv/commit/a809137c2a27cc4b92a0d4782727cbe219cb3ff7))
- *(cli)* Make loadProcess OFF by default; lint alias; stabilize exclude-private ([fe73184](https://github.com/karmaniverous/get-dotenv/commit/fe731847e5cac15aebb1f39125dc8575817b04ed))
- *(cmd)* Pass ctx.dotenv to child env to honor exclusions ([2738f89](https://github.com/karmaniverous/get-dotenv/commit/2738f89298897e3a355a631d962dab0303e01400))
- *(cmd/alias)* Dedupe alias execution and fix hook typings ([c11163c](https://github.com/karmaniverous/get-dotenv/commit/c11163c863c2a1e22716cc21e68bdeafec0ddde0))
- *(cmd/alias)* Run alias-only path in preSubcommand too ([03088a9](https://github.com/karmaniverous/get-dotenv/commit/03088a9c844297c1e7c4fe2ead6b8c1bbf96f53d))
- *(cli)* Force exit on alias capture path when exitCode is NaN ([8e0e43c](https://github.com/karmaniverous/get-dotenv/commit/8e0e43c94df455016297f24ff620a6dda1c363c8))
- *(batch)* Treat -l/--list in default subcommand as list globs ([3c763fc](https://github.com/karmaniverous/get-dotenv/commit/3c763fc9c11a56991428085c6d3ba4fb0a214b6c))
- *(cmd)* Exit alias only for real runs; clean ESLint guards ([aef71c4](https://github.com/karmaniverous/get-dotenv/commit/aef71c4b8cb90d1be9c2c06f2eb8fff4eb381a0a))
- *(cmd)* Guard exitCode, skip process.exit under test; lint rule ([390c0af](https://github.com/karmaniverous/get-dotenv/commit/390c0afd2795e58cf119fc3abfa4f7bdae74fd99))
- *(cli)* Make --cmd alias exit with child code; stop Windows timeouts ([07ad8af](https://github.com/karmaniverous/get-dotenv/commit/07ad8af2d0a8c2c696c1427ece132a4c189f06dd))
- *(batch)* Honor -l with positional tokens under default subcommand ([478b95e](https://github.com/karmaniverous/get-dotenv/commit/478b95e07cf4bc856fdbbe2f19ea4ec88568d92f))
- *(cli)* Honor --shell-off with execa argv and stabilize batch globs ([4a4babe](https://github.com/karmaniverous/get-dotenv/commit/4a4babec4c1f7d2ef75b07faf0ec951e941b01bc))
- *(cli)* Stabilize cmd variadic args and batch globs parsing ([1a7f251](https://github.com/karmaniverous/get-dotenv/commit/1a7f25168cdd59c3f6f149da5857146536236df2))
- *(cmd)* Accept positional tokens to avoid Commander arg errors ([6a673d2](https://github.com/karmaniverous/get-dotenv/commit/6a673d20ffa44222d48cdc8f7d857373fad40ef1))
- *(batch)* Narrow exec command type and header rendering ([a19d816](https://github.com/karmaniverous/get-dotenv/commit/a19d816144fd2a5d2eee134c0d82a6d6dfad19e0))
- *(batch)* Allow list-only mode without command; improve headers ([7ebdb74](https://github.com/karmaniverous/get-dotenv/commit/7ebdb74a98de48ae23a22ed308ef6b0ac4dc3cd2))
- *(batch)* Resolve scripts/shell from merged CLI options; lint cleanup ([e24cc90](https://github.com/karmaniverous/get-dotenv/commit/e24cc90b4b27df6b1c81aecd1611776594f688ad))
- *(cli)* Repair attachRootOptions chain; ensure batch cmd consumes variadic args ([2695b0d](https://github.com/karmaniverous/get-dotenv/commit/2695b0dbca994cc5d1bc084a3419659af27b4b56))
- *(batch)* Support implicit positional command on parent ([68a33f1](https://github.com/karmaniverous/get-dotenv/commit/68a33f1da43e973151097b697ed655e9b0b311d6))
- *(batch)* Capture positional args in default cmd action ([f1a72be](https://github.com/karmaniverous/get-dotenv/commit/f1a72be68cbf93ba27ef52a36e6869cc8bbb4a38))
- *(cmd)* Type opts() usage to remove unsafe-any ([e272522](https://github.com/karmaniverous/get-dotenv/commit/e272522b6b34fdca4e90e5af77d77d6e83f6f6d6))
- *(cli)* TS/lint in cmd & batch; alias conflict test robustness ([20213f8](https://github.com/karmaniverous/get-dotenv/commit/20213f8ddffa60393716955971d290032715946c))
- *(cli)* Cmd plugin TS/lint; batch default-subcmd bridges list/--command ([d4141a0](https://github.com/karmaniverous/get-dotenv/commit/d4141a0f8962753abc36c0da842cf45ec5cd890a))
- *(batch)* Stabilize default cmd subcommand and flag access ([026d975](https://github.com/karmaniverous/get-dotenv/commit/026d97541b06fba7fbe813aea7689e2a3115ad6c))
- *(batch)* Accept positional args for default cmd; use typed scripts/shell ([de9f625](https://github.com/karmaniverous/get-dotenv/commit/de9f625876c602b1553f3392659066f3060c258c))
- *(cli)* Allow positional args for `batch` via default cmd subcommand; fix TS merge error ([b1c69c9](https://github.com/karmaniverous/get-dotenv/commit/b1c69c946b321202590122bda67bd80f70776feb))
- *(cli)* Avoid double logging with -l by suppressing base log in loader path ([34d8cc8](https://github.com/karmaniverous/get-dotenv/commit/34d8cc8d9db58b49d265305672ee1e4b2df5661d))
- Cast opts() to Partial<T>, drop redundant defaulting, and remove unused import ([256bb48](https://github.com/karmaniverous/get-dotenv/commit/256bb48035bc0a1f1f9b8c8c631c8117d8f11ce6))
- Parser error in preSubcommandHook and finalize typing/lint ([e87dd0f](https://github.com/karmaniverous/get-dotenv/commit/e87dd0ff74d1fe9a65df66df93945ba456667dd5))
- Complete generics pass, host typing, and lint cleanup ([78f9fa6](https://github.com/karmaniverous/get-dotenv/commit/78f9fa6d9a14c326efbbcb398da67ab7ac031e28))
- *(init)* Use captured command for opts() to stabilize action handler ([4516832](https://github.com/karmaniverous/get-dotenv/commit/45168329834577653be950969256d1f8d4b8e07d))
- *(init)* Commander opts binding, types, and template exclusions ([a56cf8a](https://github.com/karmaniverous/get-dotenv/commit/a56cf8a28d74a05863bff2e1589238f8eb01002f))
- *(batch,host,tests)* Typing/lint fixes and stabilize esbuild tests ([34d24d3](https://github.com/karmaniverous/get-dotenv/commit/34d24d326df989b034c516a10af8b403ea5b6aa9))
- Fixed readme ([468bc1e](https://github.com/karmaniverous/get-dotenv/commit/468bc1e4e3d5b1d2d28bf432246bdf85849e5ee3))
- Add useConfigLoader to GetDotenvOptions ([562baba](https://github.com/karmaniverous/get-dotenv/commit/562baba025d9d6b3ba7609f934afb2bc6b3a92b0))
- Restore abs declaration in config loader ([f753ce2](https://github.com/karmaniverous/get-dotenv/commit/f753ce258d6b8e2c56c3bbe933ff1849c5e6d714))
- Exact-optional and lint cleanups in host and loader ([6d6bb59](https://github.com/karmaniverous/get-dotenv/commit/6d6bb59ec8e34bece91f4f7365987cfafcf4e50c))
- Wire batch plugin via action; fix tests typing ([703d24c](https://github.com/karmaniverous/get-dotenv/commit/703d24c08b5ceb6231aa3605bb60dd3a39f0811b))
- Batch plugin tests, host parent options, and lint ([25d6f39](https://github.com/karmaniverous/get-dotenv/commit/25d6f391fa94a84ac2380221c97d4375dd9d0cea))
- *(batch)* Register plugin before parse; type-safe calls/tests ([e9726dc](https://github.com/karmaniverous/get-dotenv/commit/e9726dc556d62a59ac6ccf80834977d18041cf90))
- *(host)* ExactOptional casts and ctx storage ([075b063](https://github.com/karmaniverous/get-dotenv/commit/075b063f24b6c39c0d9f70fb4f8f546d682d9c53))
- *(host)* Complete tests and tsdoc example ([652482c](https://github.com/karmaniverous/get-dotenv/commit/652482caaf9b72811ec9640e7ce0a606f62bb256))

### Refactor

- *(exec)* Centralize run helper; harden tokenizer ([23c6456](https://github.com/karmaniverous/get-dotenv/commit/23c64561f864435b230ae7536ad50b3750eafed1))
- *(batch)* Split oversized handlers into actions modules ([efd790d](https://github.com/karmaniverous/get-dotenv/commit/efd790d20dd527fc64a5940003133eaa45442262))
- *(cli)* Split batch/cmd modules; wire init helpers; fix lint ([ace672a](https://github.com/karmaniverous/get-dotenv/commit/ace672afc6fdcdfa9bcc4a3cb8d12460b9587ef4))
- Accept unknown in resolveCliOptions to avoid call-site casts ([fcb6f80](https://github.com/karmaniverous/get-dotenv/commit/fcb6f80b21928329b1ff06d35829027522216e12))
- *(cliHost)* Extract computeContext and slim GetDotenvCli ([1f6d1f4](https://github.com/karmaniverous/get-dotenv/commit/1f6d1f4d9257e6c34245bc51ae3d14995817e960))
- *(cli)* Host-based shipped CLI, plugin configs, and neutral batch services ([fc03d0f](https://github.com/karmaniverous/get-dotenv/commit/fc03d0f220b772bf6d56ce558784baeb9a8cc68e))

### Documentation

- Plugin docs and guides index refinements ([764a1ce](https://github.com/karmaniverous/get-dotenv/commit/764a1cebc21d038d10a344c39abf37ec9cc5bfb8))
- Unify guides nav; add Generated CLI page; expose aws subpath ([9d3bdc4](https://github.com/karmaniverous/get-dotenv/commit/9d3bdc4306f92f11918c6b9cf6fa26786cc9c90a))
- Fix TypeDoc link, README formatting; dev plan newline ([db125b7](https://github.com/karmaniverous/get-dotenv/commit/db125b726f3f07ae4a343cc202a0f891e58ce7fc))
- *(typedoc)* Export DefineSpec, fix links; refresh guides and README ([40e7f79](https://github.com/karmaniverous/get-dotenv/commit/40e7f7953962fe725f844b662eee7545d6c68485))
- Add AWS base plugin requirements; plan next-up work ([9022c11](https://github.com/karmaniverous/get-dotenv/commit/9022c118d697c78f231183c980fa6989590c6e0b))
- Clarify loader as always-on; add roadmap & policy ([7f1e4ab](https://github.com/karmaniverous/get-dotenv/commit/7f1e4ab6200ccd9656d05843e5691869f5ec12a4))
- *(todo)* Tests green; focus next on argv/quoting tests and docs ([1158b95](https://github.com/karmaniverous/get-dotenv/commit/1158b9529eba98c3481054c6d205c5eeec36ed8f))
- *(plan)* Set next focus to E2E quoting tests; init finalized ([3992f44](https://github.com/karmaniverous/get-dotenv/commit/3992f44add29e4cceb161eb09b344bec2b359613))
- *(scaffold)* Add README section and plugin guide note ([78863ec](https://github.com/karmaniverous/get-dotenv/commit/78863ec56a0ade3371bff8c64f872bd81665d542))
- *(plan)* Record init scaffolding stabilization and next steps ([72da1f2](https://github.com/karmaniverous/get-dotenv/commit/72da1f200559a0fd99ae17e136f739312cab55c1))
- Add guides for config overlays and plugin host; wire into docs ([414c58b](https://github.com/karmaniverous/get-dotenv/commit/414c58b1d819c784e80ba33e4f7203761e8555c3))
- *(cli)* Document --use-config-loader in README help ([5916b43](https://github.com/karmaniverous/get-dotenv/commit/5916b43c92b1d00b96b6326ffa7183fa5edd2661))
- Add plugin-first host and schema plan; update TODO ([d63e9f1](https://github.com/karmaniverous/get-dotenv/commit/d63e9f1ea05cc6073752191e9b602e5dbdc6b1e6))

### Testing

- *(tokenize)* Align tests with doubled-quote semantics ([b62a9f1](https://github.com/karmaniverous/get-dotenv/commit/b62a9f1325b7231ab303c0daa12e34b8a0abe5af))
- Quote alias payload to prevent hang ([042e688](https://github.com/karmaniverous/get-dotenv/commit/042e688eef5efa462c97ae7a1a60c24991d8ba3f))
- *(e2e)* Make alias termination test exit under Vitest ([4baa4d1](https://github.com/karmaniverous/get-dotenv/commit/4baa4d1c81fc6ca8eb15bb3cd74bb36bbc9b49a8))
- *(e2e)* Add Windows alias termination vitest with timeout ([81a5ace](https://github.com/karmaniverous/get-dotenv/commit/81a5ace22643a65363b560806d54a0bd5571c0a6))
- *(cmd/alias)* Force stdio inherit under tests; suppress capture ([b64c340](https://github.com/karmaniverous/get-dotenv/commit/b64c3407525e5ea2868dc2006c404d832234197b))
- *(e2e)* Fix lint and stabilize Windows flows for output/secret ([692def8](https://github.com/karmaniverous/get-dotenv/commit/692def8dc7523c16d39c3fd9355f2ddb215df120))
- *(e2e)* Use positional `cmd` instead of alias to avoid Windows hang ([899a9a7](https://github.com/karmaniverous/get-dotenv/commit/899a9a7a82bad35dc11b1712469ed550d8bc9f7a))
- *(e2e)* Pass dataset tokens for ./test/full (dotenv/private) ([7187344](https://github.com/karmaniverous/get-dotenv/commit/718734404c81ca84c98f650106d608c48f317eaf))
- *(cmd)* Guard mocked execa result with optional chaining ([76270ca](https://github.com/karmaniverous/get-dotenv/commit/76270ca25dd50aeeaaadc34007c61acae77cd5de))
- *(e2e)* Add core CLI E2E suite (options/cmd/batch) ([35a4fc5](https://github.com/karmaniverous/get-dotenv/commit/35a4fc52bc29bc321ab1ddd45243be7c29b84528))
- *(e2e)* Add platform-guarded quoting tests for POSIX and PowerShell ([dc83871](https://github.com/karmaniverous/get-dotenv/commit/dc838711c144c35ea7670deec3cad9526c786679))
- Deflake dynamic TS fallback error-path with longer timeout ([e5a4491](https://github.com/karmaniverous/get-dotenv/commit/e5a44910f37a2edbcfdca2900d38c919e9ea5843))
- *(lint)* Fix require-await in schema gen opts test ([3451d33](https://github.com/karmaniverous/get-dotenv/commit/3451d334b3b077261699cb9fcfbbd275e45097fd))
- Add schema validation tests ([95debf8](https://github.com/karmaniverous/get-dotenv/commit/95debf8df38550605df7e12a5fc8fac420783fe6))

### Miscellaneous Tasks

- Release v5.0.0-0 ([04a9fde](https://github.com/karmaniverous/get-dotenv/commit/04a9fde61f6e7ab7a9d704a38eb5a091f8425815))
- *(test)* Narrow coverage to src and exclude non-source ([31f9b0c](https://github.com/karmaniverous/get-dotenv/commit/31f9b0c87b2ce60be44042de161412f66ea560a8))
- Migrate to Zod v4 and @vitest/eslint-plugin ([d6c3e98](https://github.com/karmaniverous/get-dotenv/commit/d6c3e985832d0a095f00e06a8df936d0713d681b))
- *(verify)* Fall back to npm-packlist when npm is unavailable ([4cef186](https://github.com/karmaniverous/get-dotenv/commit/4cef1866c3a1116bee74a9d22fba5bc660e8c703))
- *(verify)* Add rich diagnostics to verify-tarball ([1a972e7](https://github.com/karmaniverous/get-dotenv/commit/1a972e7aa93b6115e1cea7417ee7fbcdc29b7be5))
- Peg Node engines to >=20 and align esbuild targets ([808165a](https://github.com/karmaniverous/get-dotenv/commit/808165aeae894fff50bdf11ad481778901e743f1))
- Assert aws export in verify script; update plan ([6bbf7f4](https://github.com/karmaniverous/get-dotenv/commit/6bbf7f4e4f35137d191910a61d7c1c1615d035ba))
- Update stan.todo after aws test fixes ([01124a2](https://github.com/karmaniverous/get-dotenv/commit/01124a27bfdaea01c6ec4674b1c44398e0f150cc))
- Knip cleanup and update dev plan timestamp ([2b4fc4d](https://github.com/karmaniverous/get-dotenv/commit/2b4fc4d906cdd0274bb52694e1586bfe1b50fcb4))
- *(tools)* Add smoke script and stan wiring for manual suite ([49c6e3c](https://github.com/karmaniverous/get-dotenv/commit/49c6e3c7b2b4f6f96dc3ac95df5c46e39f364c09))
- *(lint)* Fix debug helpers in cmd alias/run; update plan ([22cec03](https://github.com/karmaniverous/get-dotenv/commit/22cec031fe188841e57325d3fbc3d3930bab7081))
- *(debug)* Instrument alias/run paths for E2E timeouts ([e9b5804](https://github.com/karmaniverous/get-dotenv/commit/e9b5804f7211d48969585c77e747df07a0144d53))
- *(knip)* Include host demo, disable duplicates, drop ignores ([9351a18](https://github.com/karmaniverous/get-dotenv/commit/9351a18be9d873ee45ea4d730d6ce866bbf99d2e))
- Refine knip scope to stop false unused deps ([5ea5d36](https://github.com/karmaniverous/get-dotenv/commit/5ea5d3619afb29757471906ad9ccd792292f117d))
- Add tarball verification and pack dry-run ([5d48a6e](https://github.com/karmaniverous/get-dotenv/commit/5d48a6e8be68669a5f9554c4dd6a94cd39ea14e2))
- *(templates/pkg)* Add env-aware dynamic examples and verify script ([cb20003](https://github.com/karmaniverous/get-dotenv/commit/cb20003c60b104bd9d0fa5151597322769b7c429))
- Fix TSDoc '>' escapes to satisfy lint ([5f557a1](https://github.com/karmaniverous/get-dotenv/commit/5f557a14ab2d744b5ecc594767e86e6077cf1a95))
- Fix lint in loader and overlay docs ([317194d](https://github.com/karmaniverous/get-dotenv/commit/317194d0685b5ba0c84b2b1e223afbaa27dd8aed))

### Batch

- *(exec)* Run array commands; array-only for node -e shell-off ([efe03a4](https://github.com/karmaniverous/get-dotenv/commit/efe03a47425a4245d22c2d4b595b5a9137c2b851))
- *(exec)* Fix TS for execaCommand; keep parent path string ([5f2acaa](https://github.com/karmaniverous/get-dotenv/commit/5f2acaa53b93a828a60df3716f61cde1411409fa))
- Preserve argv arrays for shell-off; fix E2E ([766a711](https://github.com/karmaniverous/get-dotenv/commit/766a711d24b456eabeceb404d030ce9dd45ae7cb))

### Cli

- Default omit root -c; generator opts in ([3306138](https://github.com/karmaniverous/get-dotenv/commit/3306138689269b04b7d0b2289ec5c2f4ab684382))

### E2e

- Use argv arrays to avoid Windows quoting; stabilize tests ([f1a634b](https://github.com/karmaniverous/get-dotenv/commit/f1a634b021af00c7a7c76a07b496ce1a9dd6ce22))

### Init

- Add local config patterns to .gitignore ([2c3f17f](https://github.com/karmaniverous/get-dotenv/commit/2c3f17f51aa77199b65dad9f34e2459bcfcac452))
- CI-aware non-interactive detection + docs ([c910ff5](https://github.com/karmaniverous/get-dotenv/commit/c910ff5d5717797cefba672101fea7a3e4f6c82c))

### Smoke

- Enforce per-step timeouts and capture outputs ([0be9143](https://github.com/karmaniverous/get-dotenv/commit/0be914350bfeae10ed0cff83b80c6533efd1a660))
- Emit trace diagnostics; collapse stacked quotes ([9f31793](https://github.com/karmaniverous/get-dotenv/commit/9f31793b3d7c94d5d04a255c980bcfec7c0ecde6))

## [4.6.0-0](https://github.com/karmaniverous/get-dotenv/compare/v4.5.2...v4.6.0-0) - 2025-09-16

### Features

- Adopt esbuild dev/peer, add fallback tests, update docs ([4b3ecd3](https://github.com/karmaniverous/get-dotenv/commit/4b3ecd3373793497237943c7cba60ab935b0c85f))
- *(dynamic)* TS-first DX with auto-compile and programmatic option ([221910d](https://github.com/karmaniverous/get-dotenv/commit/221910d1207a247b0d42faa11a5e2007cf0568e0))

### Bug Fixes

- Stabilize build/typecheck; externalize esbuild/typescript ([770b34d](https://github.com/karmaniverous/get-dotenv/commit/770b34d9211ac358a7a7446eac8c896f851ea1d5))
- *(cli)* Resolve TS2552 and strict lint in batch commands ([1c6cf19](https://github.com/karmaniverous/get-dotenv/commit/1c6cf19741badb1c705260ecf9e09d1d5f3532ef))
- *(cli)* Remove extra-typings import and harden CLI types ([8c62b79](https://github.com/karmaniverous/get-dotenv/commit/8c62b79c1b596772c42f479d8bdc5f00d81645fa))
- *(cli)* Use commander runtime imports to resolve ESM default error ([98c917d](https://github.com/karmaniverous/get-dotenv/commit/98c917d184534b5855d5ff4fda158f2772da954f))
- *(cli)* Exact-optional + shell write; clean typing ([dff116c](https://github.com/karmaniverous/get-dotenv/commit/dff116c81211353abc5de199b49d0e5f0058eff8))
- *(cli)* ExactOptionalPropertyTypes + lint hardening ([d55de03](https://github.com/karmaniverous/get-dotenv/commit/d55de03d7198319287b3ab18fa4629ebb46371b9))
- Clean TS optional-flag writes; add Node globals ([a3decc2](https://github.com/karmaniverous/get-dotenv/commit/a3decc21c15c23b3e462c2a5e69d3c232d86c63d))
- Clean typecheck and lint; rollup JSON import ([8b2060f](https://github.com/karmaniverous/get-dotenv/commit/8b2060fe8a58fcd8fc07dbf3b5ca56f3b7ea0841))
- Restore defaults layering, typed-lint scope, and build ([fc79964](https://github.com/karmaniverous/get-dotenv/commit/fc799646151de821f77b143eb729b09f92b8e446))

### Documentation

- *(test)* Keep internals visible, add guides and tests ([64fc020](https://github.com/karmaniverous/get-dotenv/commit/64fc02007aa794eb266450386a2259f3f8b70322))
- *(test)* Tighten docs and raise meaningful coverage ([a81e1c8](https://github.com/karmaniverous/get-dotenv/commit/a81e1c80d68a25180f8a3583294a7c988fcf2c83))
- Fix TypeDoc warnings; name options param; safe links ([aba9253](https://github.com/karmaniverous/get-dotenv/commit/aba9253796cc112b3d73c802a882d9d37ddb49af))
- Add rich TypeDoc comments across core modules ([e79645f](https://github.com/karmaniverous/get-dotenv/commit/e79645f060b15aaadcfcef2e0b65bbc425cbac42))

### Testing

- Fix fallback error test by ordering fs.writeFile spy ([6256035](https://github.com/karmaniverous/get-dotenv/commit/62560358cb4353352bef7f6b5414ab0f75626c12))
- Fix vi.mock typing; make TS fallback error deterministic ([c03c3f4](https://github.com/karmaniverous/get-dotenv/commit/c03c3f4db44fd01a1d22861931fbd51ccefc0254))

### Miscellaneous Tasks

- Release v4.6.0-0 ([9fc675d](https://github.com/karmaniverous/get-dotenv/commit/9fc675dabcb5020a1933c938eb12d08db4065452))
- *(todo)* Trim Next up; align docs/help tasks ([f0855c4](https://github.com/karmaniverous/get-dotenv/commit/f0855c4c45e2eb99705c73611a37d43cf56236c1))
- *(knip)* Simplify entry and ignore CLI runtime deps ([9f973c5](https://github.com/karmaniverous/get-dotenv/commit/9f973c54dd4bb962f107a42860790a7ecdd29182))
- *(lint)* Add vitest plugin for test files (flat config) ([9ce486b](https://github.com/karmaniverous/get-dotenv/commit/9ce486b368f39d08cecda74eeccc521b9544f6e9))
- Fix tsdoc lint and dynamic-delete rule ([0c04e8e](https://github.com/karmaniverous/get-dotenv/commit/0c04e8e657b33a2279ba99fc4b3ff393d4ac3971))
- Tsdoc lint, coverage excludes, and unit tests ([5488712](https://github.com/karmaniverous/get-dotenv/commit/5488712e6729f0e2d5549c724c212a8374827112))
- Fix Prettier ␍ errors on save and enforce LF ([68b7993](https://github.com/karmaniverous/get-dotenv/commit/68b7993d17b52a05b7283a94a05ed4c588634f1e))
- *(eslint)* Lint TS/JS/JSON; ignore caches; typed TS only ([0192a8a](https://github.com/karmaniverous/get-dotenv/commit/0192a8a282042dafc60a436f2f2a88e574da8e57))
- *(eslint)* Type-aware flat config + Prettier and cache ignores ([52582df](https://github.com/karmaniverous/get-dotenv/commit/52582df6a9eedffb31cff0107597c0c186cd119c))
- *(lint)* Type-aware ESLint config with Prettier ([0c240d2](https://github.com/karmaniverous/get-dotenv/commit/0c240d2084a8ee1801155fe016878c8080a7c045))
- Migrate to Vitest, ESLint 9, Node 22; drop lodash ([e90ad8f](https://github.com/karmaniverous/get-dotenv/commit/e90ad8f87b7f44589ae634165f927e36543e5b3b))

### Build

- Fix rollup ts outDir; tune TS unused-vars ([589a06b](https://github.com/karmaniverous/get-dotenv/commit/589a06b0896c6ec5fcbd3a0394fd36cb1bc9d2f2))

### Lint

- Default args to [] and drop redundant isArray guard ([b3e0af1](https://github.com/karmaniverous/get-dotenv/commit/b3e0af186bec718bedaa4b99f8bce65c4b73bbea))
- Remove unused var and tighten args length check ([0410934](https://github.com/karmaniverous/get-dotenv/commit/0410934d5bced066d7f96ac4512c786362193392))
- Guard command with explicit string check ([c079a25](https://github.com/karmaniverous/get-dotenv/commit/c079a25d2face6d3f1fb38d275dcc9ab6315fc49))
- Satisfy strictTypeChecked across code, keep semantics ([e6913ba](https://github.com/karmaniverous/get-dotenv/commit/e6913ba91246083cd9874d47759e24fe4e2d70bc))
- *(config)* Fix strict rules merge and ensure lint coverage ([91e70db](https://github.com/karmaniverous/get-dotenv/commit/91e70db79d581aea90fd155931e798d7e987c31b))
- Include eslint.config.ts and fix strict rules typing ([bc39072](https://github.com/karmaniverous/get-dotenv/commit/bc3907228fcdaa58d7e11626ce889daff425e29c))
- Enable strictTypeChecked for TypeScript files ([a95efd9](https://github.com/karmaniverous/get-dotenv/commit/a95efd9d2b8ccfea3999bf87a11c84ad088f7ded))

## [4.5.2](https://github.com/karmaniverous/get-dotenv/compare/v4.5.1...v4.5.2) - 2024-07-17

### Miscellaneous Tasks

- Release v4.5.2 ([46d569a](https://github.com/karmaniverous/get-dotenv/commit/46d569a3ddb6b8cf8a823d04b531a49cdcab01ca))

## [4.5.1](https://github.com/karmaniverous/get-dotenv/compare/v4.5.0...v4.5.1) - 2024-07-03

### Miscellaneous Tasks

- Release v4.5.1 ([9b8c3c9](https://github.com/karmaniverous/get-dotenv/commit/9b8c3c962e2dbbcdaf32c40f1cebf7ac2280b70f))

## [4.5.0](https://github.com/karmaniverous/get-dotenv/compare/v4.4.5...v4.5.0) - 2024-06-30

### Miscellaneous Tasks

- Release v4.5.0 ([eb914fc](https://github.com/karmaniverous/get-dotenv/commit/eb914fcf545f42a4c2337520f9c09592b8c4281e))

## [4.4.5](https://github.com/karmaniverous/get-dotenv/compare/v4.4.4...v4.4.5) - 2024-06-19

### Miscellaneous Tasks

- Release v4.4.5 ([0c3b4fc](https://github.com/karmaniverous/get-dotenv/commit/0c3b4fc9a71a3dc0771d799e8901271c6c484556))

## [4.4.4](https://github.com/karmaniverous/get-dotenv/compare/v4.4.3...v4.4.4) - 2024-06-19

### Miscellaneous Tasks

- Release v4.4.4 ([4026e15](https://github.com/karmaniverous/get-dotenv/commit/4026e158479a1f116a8898e1df5ffaaf1d87f45f))

## [4.4.3](https://github.com/karmaniverous/get-dotenv/compare/v4.4.2...v4.4.3) - 2024-06-06

### Documentation

- Doc typo ([64bc887](https://github.com/karmaniverous/get-dotenv/commit/64bc8870d98e88ce649b2ceb4bf773720c1a81e4))

### Miscellaneous Tasks

- Release v4.4.3 ([f9763de](https://github.com/karmaniverous/get-dotenv/commit/f9763dec11447aed143cd192808f85fc2154e7f9))

## [4.4.2](https://github.com/karmaniverous/get-dotenv/compare/v4.4.1...v4.4.2) - 2024-06-01

### Documentation

- Doc update ([2eb9cca](https://github.com/karmaniverous/get-dotenv/commit/2eb9cca4206bcdfe1120a22dcc2fd090d2b23b07))

### Miscellaneous Tasks

- Release v4.4.2 ([12e6614](https://github.com/karmaniverous/get-dotenv/commit/12e6614213d8643bea756794f61b5dccce5aed8a))

## [4.4.1](https://github.com/karmaniverous/get-dotenv/compare/v4.4.0...v4.4.1) - 2024-06-01

### Miscellaneous Tasks

- Release v4.4.1 ([645e780](https://github.com/karmaniverous/get-dotenv/commit/645e78003982ba3546addabfbab189d200952560))

## [4.4.0](https://github.com/karmaniverous/get-dotenv/compare/v4.3.2...v4.4.0) - 2024-05-31

### Miscellaneous Tasks

- Release v4.4.0 ([94c451c](https://github.com/karmaniverous/get-dotenv/commit/94c451cb2106fb8a2503f80fd10a2756bec554f4))

## [4.3.2](https://github.com/karmaniverous/get-dotenv/compare/v4.3.1...v4.3.2) - 2024-05-29

### Miscellaneous Tasks

- Release v4.3.2 ([9d40cc7](https://github.com/karmaniverous/get-dotenv/commit/9d40cc7c87b533b1028fdc91f30bad51cc72852e))

## [4.3.1](https://github.com/karmaniverous/get-dotenv/compare/v4.3.0...v4.3.1) - 2024-05-22

### Miscellaneous Tasks

- Release v4.3.1 ([61fc360](https://github.com/karmaniverous/get-dotenv/commit/61fc36057c4cf82f5678df3f7c76f24c0eae182c))

## [4.3.0](https://github.com/karmaniverous/get-dotenv/compare/v4.2.4...v4.3.0) - 2024-05-09

### Miscellaneous Tasks

- Release v4.3.0 ([26a8cde](https://github.com/karmaniverous/get-dotenv/commit/26a8cdec3fad5b432e7541c65a6118e303ef627c))

## [4.2.4](https://github.com/karmaniverous/get-dotenv/compare/v4.2.3...v4.2.4) - 2024-05-09

### Miscellaneous Tasks

- Release v4.2.4 ([e667c51](https://github.com/karmaniverous/get-dotenv/commit/e667c511c2c150487a37b29d97e6e01b06be213c))

## [4.2.3](https://github.com/karmaniverous/get-dotenv/compare/v4.2.2...v4.2.3) - 2024-05-09

### Miscellaneous Tasks

- Release v4.2.3 ([636a3b4](https://github.com/karmaniverous/get-dotenv/commit/636a3b41ede95dd5cafd1de6b54c480fe5422019))

## [4.2.2](https://github.com/karmaniverous/get-dotenv/compare/v4.2.1...v4.2.2) - 2024-05-09

### Miscellaneous Tasks

- Release v4.2.2 ([f9b9cee](https://github.com/karmaniverous/get-dotenv/commit/f9b9cee00e22557da8b6851f4aae1efccc3803cc))

## [4.2.1](https://github.com/karmaniverous/get-dotenv/compare/v4.2.0...v4.2.1) - 2024-05-08

### Miscellaneous Tasks

- Release v4.2.1 ([341d784](https://github.com/karmaniverous/get-dotenv/commit/341d7841865bfde8872e586ab4706f48a1a6594c))

## [4.2.0](https://github.com/karmaniverous/get-dotenv/compare/v4.1.0...v4.2.0) - 2024-05-08

### Miscellaneous Tasks

- Release v4.2.0 ([e4fa9b2](https://github.com/karmaniverous/get-dotenv/commit/e4fa9b2d4ac0581c135671578d0958576d5e0e8a))

## [4.1.0](https://github.com/karmaniverous/get-dotenv/compare/v4.0.0...v4.1.0) - 2024-05-08

### Miscellaneous Tasks

- Release v4.1.0 ([19ea20f](https://github.com/karmaniverous/get-dotenv/commit/19ea20f9f59b91277a3dff727d3a0e91c825c5a3))

## [4.0.0](https://github.com/karmaniverous/get-dotenv/compare/v4.0.0-3...v4.0.0) - 2024-05-06

### Miscellaneous Tasks

- Release v4.0.0 ([fb91db0](https://github.com/karmaniverous/get-dotenv/commit/fb91db0d5cdaa7a743f35ee7beb3e569d867f801))

## [4.0.0-3](https://github.com/karmaniverous/get-dotenv/compare/v4.0.0-2...v4.0.0-3) - 2024-05-06

### Miscellaneous Tasks

- Release v4.0.0-3 ([af56229](https://github.com/karmaniverous/get-dotenv/commit/af562295f4d6867afb46e7a86870ced03d2f9c46))

## [4.0.0-2](https://github.com/karmaniverous/get-dotenv/compare/v4.0.0-1...v4.0.0-2) - 2024-05-05

### Miscellaneous Tasks

- Release v4.0.0-2 ([955d981](https://github.com/karmaniverous/get-dotenv/commit/955d9816352caa5b1853d7234664e2c1a9224de0))

## [4.0.0-1](https://github.com/karmaniverous/get-dotenv/compare/v4.0.0-0...v4.0.0-1) - 2024-05-05

### Miscellaneous Tasks

- Release v4.0.0-1 ([fd7452f](https://github.com/karmaniverous/get-dotenv/commit/fd7452f1edf6d3d687e4c06127385746c2962814))

## [4.0.0-0](https://github.com/karmaniverous/get-dotenv/compare/v3.1.19...v4.0.0-0) - 2024-05-05

### Miscellaneous Tasks

- Release v4.0.0-0 ([bb93c20](https://github.com/karmaniverous/get-dotenv/commit/bb93c208769c5e50c3ec55e80c4f9ad058d0c1d0))

## [3.1.19](https://github.com/karmaniverous/get-dotenv/compare/v3.1.18...v3.1.19) - 2024-03-27

## [3.1.18](https://github.com/karmaniverous/get-dotenv/compare/v3.1.17...v3.1.18) - 2024-02-27

## [3.1.17](https://github.com/karmaniverous/get-dotenv/compare/v3.1.16...v3.1.17) - 2023-11-24

## [3.1.16](https://github.com/karmaniverous/get-dotenv/compare/v3.1.15...v3.1.16) - 2023-10-14

## [3.1.15](https://github.com/karmaniverous/get-dotenv/compare/v3.1.14...v3.1.15) - 2023-09-04

## [3.1.14](https://github.com/karmaniverous/get-dotenv/compare/v3.1.13...v3.1.14) - 2023-09-02

## [3.1.13](https://github.com/karmaniverous/get-dotenv/compare/v3.1.12...v3.1.13) - 2023-08-15

## [3.1.12](https://github.com/karmaniverous/get-dotenv/compare/v3.1.11...v3.1.12) - 2023-07-08

## [3.1.11](https://github.com/karmaniverous/get-dotenv/compare/v3.1.10...v3.1.11) - 2023-07-07

## [3.1.10](https://github.com/karmaniverous/get-dotenv/compare/v3.1.9...v3.1.10) - 2023-07-06

## [3.1.9](https://github.com/karmaniverous/get-dotenv/compare/v3.1.8...v3.1.9) - 2023-07-06

## [3.1.8](https://github.com/karmaniverous/get-dotenv/compare/v3.1.7...v3.1.8) - 2023-07-06

## [3.1.7](https://github.com/karmaniverous/get-dotenv/compare/v3.1.6...v3.1.7) - 2023-07-06

## [3.1.6](https://github.com/karmaniverous/get-dotenv/compare/v3.1.5...v3.1.6) - 2023-07-06

## [3.1.5](https://github.com/karmaniverous/get-dotenv/compare/v3.1.4...v3.1.5) - 2023-07-05

## [3.1.4](https://github.com/karmaniverous/get-dotenv/compare/v3.1.3...v3.1.4) - 2023-07-04

## [3.1.3](https://github.com/karmaniverous/get-dotenv/compare/v3.1.2...v3.1.3) - 2023-07-04

## [3.1.2](https://github.com/karmaniverous/get-dotenv/compare/v3.1.1...v3.1.2) - 2023-07-04

## [3.1.1](https://github.com/karmaniverous/get-dotenv/compare/v3.1.0...v3.1.1) - 2023-07-04

## [3.1.0](https://github.com/karmaniverous/get-dotenv/compare/v3.0.6...v3.1.0) - 2023-07-04

## [3.0.6](https://github.com/karmaniverous/get-dotenv/compare/v3.0.5...v3.0.6) - 2023-07-03

## [3.0.5](https://github.com/karmaniverous/get-dotenv/compare/v3.0.3...v3.0.5) - 2023-07-03

## [3.0.3](https://github.com/karmaniverous/get-dotenv/compare/v3.0.2...v3.0.3) - 2023-07-03

## [3.0.2](https://github.com/karmaniverous/get-dotenv/compare/v3.0.1...v3.0.2) - 2023-07-03

## [3.0.1](https://github.com/karmaniverous/get-dotenv/compare/v3.0.0...v3.0.1) - 2023-07-02

## [3.0.0](https://github.com/karmaniverous/get-dotenv/compare/v2.6.8...v3.0.0) - 2023-07-02

## [2.6.8](https://github.com/karmaniverous/get-dotenv/compare/v2.6.7...v2.6.8) - 2023-06-30

## [2.6.7](https://github.com/karmaniverous/get-dotenv/compare/v2.6.6...v2.6.7) - 2023-06-23

## [2.6.6](https://github.com/karmaniverous/get-dotenv/compare/v2.6.5...v2.6.6) - 2023-06-22

## [2.6.5](https://github.com/karmaniverous/get-dotenv/compare/v2.6.4...v2.6.5) - 2023-06-22

## [2.6.4](https://github.com/karmaniverous/get-dotenv/compare/v2.6.3...v2.6.4) - 2023-06-22

## [2.6.3](https://github.com/karmaniverous/get-dotenv/compare/v2.6.2...v2.6.3) - 2023-06-22

## [2.6.2](https://github.com/karmaniverous/get-dotenv/compare/v2.6.1...v2.6.2) - 2023-06-22

## [2.6.1](https://github.com/karmaniverous/get-dotenv/compare/v2.6.0...v2.6.1) - 2023-06-22

## [2.6.0](https://github.com/karmaniverous/get-dotenv/compare/v2.5.0...v2.6.0) - 2023-06-22

## [2.5.0](https://github.com/karmaniverous/get-dotenv/compare/v2.4.4...v2.5.0) - 2023-06-22

## [2.4.4](https://github.com/karmaniverous/get-dotenv/compare/v2.4.3...v2.4.4) - 2023-06-22

## [2.4.3](https://github.com/karmaniverous/get-dotenv/compare/v2.4.2...v2.4.3) - 2023-06-15

## [2.4.2](https://github.com/karmaniverous/get-dotenv/compare/v2.4.1...v2.4.2) - 2023-06-15

## [2.4.1](https://github.com/karmaniverous/get-dotenv/compare/v2.4.0...v2.4.1) - 2023-05-20

## [2.4.0](https://github.com/karmaniverous/get-dotenv/compare/v2.3.4...v2.4.0) - 2023-05-20

## [2.3.4](https://github.com/karmaniverous/get-dotenv/compare/v2.3.3...v2.3.4) - 2023-05-09

## [2.3.3](https://github.com/karmaniverous/get-dotenv/compare/v2.3.2...v2.3.3) - 2023-05-09

## [2.3.2](https://github.com/karmaniverous/get-dotenv/compare/v2.3.1...v2.3.2) - 2023-05-09

## [2.3.1](https://github.com/karmaniverous/get-dotenv/compare/v2.3.0...v2.3.1) - 2023-05-09

## [2.3.0](https://github.com/karmaniverous/get-dotenv/compare/v2.2.3...v2.3.0) - 2023-05-09

## [2.2.3](https://github.com/karmaniverous/get-dotenv/compare/v2.2.2...v2.2.3) - 2023-04-04

## [2.2.2](https://github.com/karmaniverous/get-dotenv/compare/v2.2.1...v2.2.2) - 2023-04-04

## [2.2.1](https://github.com/karmaniverous/get-dotenv/compare/v2.2.0...v2.2.1) - 2023-04-04

## [2.2.0](https://github.com/karmaniverous/get-dotenv/compare/v2.1.1...v2.2.0) - 2023-04-04

## [2.1.1](https://github.com/karmaniverous/get-dotenv/compare/v2.1.0...v2.1.1) - 2023-04-02

## [2.1.0](https://github.com/karmaniverous/get-dotenv/compare/v2.0.3...v2.1.0) - 2023-04-02

## [2.0.3](https://github.com/karmaniverous/get-dotenv/compare/v2.0.1...v2.0.3) - 2023-04-02

## [2.0.1](https://github.com/karmaniverous/get-dotenv/compare/v2.0.0...v2.0.1) - 2023-04-02

## [2.0.0](https://github.com/karmaniverous/get-dotenv/compare/v1.2.0...v2.0.0) - 2023-04-02

## [1.2.0](https://github.com/karmaniverous/get-dotenv/compare/v1.1.1...v1.2.0) - 2023-04-01

## [1.1.1](https://github.com/karmaniverous/get-dotenv/compare/v1.1.0...v1.1.1) - 2023-04-01

## [1.1.0](https://github.com/karmaniverous/get-dotenv/compare/v1.0.0...v1.1.0) - 2023-03-31

## [1.0.0](https://github.com/karmaniverous/get-dotenv/compare/v1.0.0-0...v1.0.0) - 2023-03-15

## [1.0.0-0](https://github.com/karmaniverous/get-dotenv/compare/v0.3.4...v1.0.0-0) - 2023-03-15

### Refactor

- Refactored dynamic processing ([fb178cc](https://github.com/karmaniverous/get-dotenv/commit/fb178cc29fac33c30a7dc39f34f0aa675b561da1))

## [0.3.4](https://github.com/karmaniverous/get-dotenv/compare/v0.3.4-3...v0.3.4) - 2023-03-14

## [0.3.4-3](https://github.com/karmaniverous/get-dotenv/compare/v0.3.4-2...v0.3.4-3) - 2023-03-14

## [0.3.4-2](https://github.com/karmaniverous/get-dotenv/compare/v0.3.4-1...v0.3.4-2) - 2023-03-14

### Bug Fixes

- Fixed cjs extension issue ([a350b62](https://github.com/karmaniverous/get-dotenv/commit/a350b624bf23e9ff66ec58236948234043095aa3))

## [0.3.4-1](https://github.com/karmaniverous/get-dotenv/compare/v0.3.4-0...v0.3.4-1) - 2023-03-14

## [0.3.4-0](https://github.com/karmaniverous/get-dotenv/compare/v0.3.3...v0.3.4-0) - 2023-03-14

## [0.3.3](https://github.com/karmaniverous/get-dotenv/compare/v0.3.2...v0.3.3) - 2023-03-13

### Bugfix

- Dotenv-expand syntax not working ([ccba9c9](https://github.com/karmaniverous/get-dotenv/commit/ccba9c98df948f7bcf83c21e15f7ed9607e20ecb))

## [0.3.2](https://github.com/karmaniverous/get-dotenv/compare/v0.3.1...v0.3.2) - 2023-02-27

### Documentation

- Doc update ([b697ef3](https://github.com/karmaniverous/get-dotenv/commit/b697ef35ce33c38c11b1c89b5c73704b92880762))

## [0.3.1](https://github.com/karmaniverous/get-dotenv/compare/v0.3.0...v0.3.1) - 2023-02-26

## [0.3.0](https://github.com/karmaniverous/get-dotenv/compare/v0.2.3...v0.3.0) - 2023-02-26

## [0.2.3](https://github.com/karmaniverous/get-dotenv/compare/v0.2.2...v0.2.3) - 2023-01-29

## [0.2.2](https://github.com/karmaniverous/get-dotenv/compare/v0.2.1...v0.2.2) - 2023-01-28

## [0.2.1](https://github.com/karmaniverous/get-dotenv/compare/v0.2.0...v0.2.1) - 2023-01-28

## [0.2.0](https://github.com/karmaniverous/get-dotenv/compare/v0.1.3...v0.2.0) - 2023-01-28

## [0.1.3](https://github.com/karmaniverous/get-dotenv/compare/v0.1.2...v0.1.3) - 2023-01-28

### Bugfix

- Detects empty argv as command ([ce2be00](https://github.com/karmaniverous/get-dotenv/commit/ce2be0046a0aa7c952d7d3d44d0590864e462336))

## [0.1.2](https://github.com/karmaniverous/get-dotenv/compare/v0.1.1...v0.1.2) - 2023-01-26

### Bug Fixes

- Fixed command processing ([f470795](https://github.com/karmaniverous/get-dotenv/commit/f470795b3fb10a68a53cf607a3031058ea8f5d5d))

## [0.1.1](https://github.com/karmaniverous/get-dotenv/compare/v0.1.0...v0.1.1) - 2023-01-04

### Documentation

- Doc update ([b2ba83e](https://github.com/karmaniverous/get-dotenv/commit/b2ba83e5ceafb529c28ca1c50d56c1784abff7ef))

## [0.1.0](https://github.com/karmaniverous/get-dotenv/compare/v0.0.2...v0.1.0) - 2023-01-04

### Bug Fixes

- Fixed shell command handling ([cdb739d](https://github.com/karmaniverous/get-dotenv/commit/cdb739d43d6d557ab9c47e4aeb657d95944da7c3))

## [0.0.2](https://github.com/karmaniverous/get-dotenv/compare/v0.0.1...v0.0.2) - 2023-01-03

## [0.0.1](https://github.com/karmaniverous/get-dotenv/compare/v0.0.0...v0.0.1) - 2023-01-03

## [0.0.0](https://github.com/karmaniverous/get-dotenv/compare/...v0.0.0) - 2023-01-03

