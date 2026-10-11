import assert from 'node:assert/strict';
import test from 'node:test';

function parseTagIds(raw) {
  if (!raw) return [];
  const parts = Array.isArray(raw) ? raw : [raw];
  const ids = [];
  for (const part of parts) {
    if (part == null) continue;
    for (const item of String(part).split(',')) {
      const value = Number(item.trim());
      if (Number.isSafeInteger(value) && value > 0 && !ids.includes(value)) {
        ids.push(value);
      }
    }
  }
  return ids;
}

function formatTagParam(tagIds) {
  return tagIds && tagIds.length ? tagIds.join(',') : undefined;
}

test('parseTagIds handles single, multiple comma-separated, and array query params', () => {
  assert.deepEqual(parseTagIds('1'), [1]);
  assert.deepEqual(parseTagIds('1,2,3'), [1, 2, 3]);
  assert.deepEqual(parseTagIds(['1', '2']), [1, 2]);
  assert.deepEqual(parseTagIds(['1,2', '3']), [1, 2, 3]);
  assert.deepEqual(parseTagIds('1,2,1,invalid,-5,0'), [1, 2]);
  assert.deepEqual(parseTagIds(undefined), []);
});

test('formatTagParam formats tagIds array as comma-separated string', () => {
  assert.equal(formatTagParam([1, 2]), '1,2');
  assert.equal(formatTagParam([5]), '5');
  assert.equal(formatTagParam([]), undefined);
});
