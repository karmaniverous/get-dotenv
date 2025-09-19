import { describe, expect, it } from 'vitest';

import { tokenize } from './tokenize';

describe('plugins/cmd/tokenize', () => {
  it('splits plain unquoted whitespace', () => {
    expect(tokenize('echo OK')).toEqual(['echo', 'OK']);
    expect(tokenize('a  b\tc')).toEqual(['a', 'b', 'c']);
  });

  it('preserves double-quoted segment as a single token (strips quotes)', () => {
    expect(tokenize('say "hello world"')).toEqual(['say', 'hello world']);
    expect(tokenize('node -e "console.log(1+2)"')).toEqual([
      'node',
      '-e',
      'console.log(1+2)',
    ]);
  });

  it('preserves single-quoted segment as a single token (strips quotes)', () => {
    expect(tokenize("say 'hello world'")).toEqual(['say', 'hello world']);
    expect(tokenize("node -e 'console.log(1+2)'")).toEqual([
      'node',
      '-e',
      'console.log(1+2)',
    ]);
  });

  it('Windows-style doubled quotes inside double-quoted segment -> literal "', () => {
    // PowerShell style: "" inside "..." becomes a literal " in the token
    const input = 'node -e "console.log(""x"")"';
    expect(tokenize(input)).toEqual(['node', '-e', 'console.log("x")']);
  });

  it("Windows-style doubled single quotes inside single-quoted segment -> literal '", () => {
    // PowerShell style: '' inside '...' becomes a literal ' in the token
    const input = "node -e 'console.log(''x'')'"; // tokenize should return a single-quoted payload with inner ' preserved once
    expect(tokenize(input)).toEqual(['node', '-e', "console.log('x')"]);
  });

  it('handles a representative node -e payload with nested JSON braces', () => {
    // Use doubled quotes around "y" so tokenizer collapses them to a single " in the token
    const code = 'console.log(JSON.stringify({a:1,b:""y""}))';
    const input = `node -e "${code}"`;
    expect(tokenize(input)).toEqual([
      'node',
      '-e',
      'console.log(JSON.stringify({a:1,b:"y"}))',
    ]);
  });
});
