/**
 * Preload (`node --import`) for child-process baseline cases: records the
 * options bag and writes it to `$BASELINE_RECORD_FILE` when the process exits.
 */
import { writeFileSync } from 'node:fs';

import { takeBag } from './bagRecorder';

const file = process.env.BASELINE_RECORD_FILE;
if (file) {
  process.on('exit', () => {
    writeFileSync(file, JSON.stringify({ bag: takeBag() }));
  });
}
