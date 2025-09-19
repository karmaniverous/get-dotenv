// Minimal tokenizer for shell-off execution:
// Splits by whitespace while preserving quoted segments (single or double quotes).
export const tokenize = (command: string): string[] => {
  const out: string[] = [];
  let cur = '';
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < command.length; i++) {
    const c = command.charAt(i);
    if (quote) {
      if (c === quote) {
        // Support doubled quotes inside a quoted segment (Windows/PowerShell style):
        // "" -> " and '' -> '
        const next = command.charAt(i + 1);
        if (next === quote) {
          cur += quote;
          i += 1; // skip the second quote
        } else {
          // end of quoted segment
          quote = null;
        }
      } else {
        cur += c;
      }
    } else {
      if (c === '"' || c === "'") {
        quote = c;
      } else if (/\s/.test(c)) {
        if (cur) {
          out.push(cur);
          cur = '';
        }
      } else {
        cur += c;
      }
    }
  }
  if (cur) out.push(cur);
  return out;
};
