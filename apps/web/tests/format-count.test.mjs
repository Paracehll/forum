import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';

const source = readFileSync(
  new URL('../src/utils/formatCount.ts', import.meta.url),
  'utf8',
);
const { formatCount } = await import(
  `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString('base64')}`
);

test('small counts retain their exact integer value', () => {
  for (const value of [0, 1, 99, 999]) {
    assert.equal(formatCount(value), String(value));
  }
});

test('large counts use lowercase compact units with at most one decimal', () => {
  for (const [value, expected] of [
    [1000, '1k'],
    [1200, '1.2k'],
    [1234, '1.2k'],
    [10000, '10k'],
    [1000000, '1m'],
    [1200000, '1.2m'],
    [1000000000, '1b'],
  ]) {
    assert.equal(formatCount(value), expected);
  }
});
