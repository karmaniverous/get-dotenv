/**
 * Process entry for the `vc` fixture host, used by child-process baseline
 * cases (the counterpart of `src/cli/getdotenv/index.ts` for `getdotenv`).
 */
import { createVcHost } from './hosts';

await createVcHost()();
