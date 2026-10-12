import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';
import { computed, effectScope, nextTick, reactive, ref, watch } from 'vue';

const source = readFileSync(
  new URL('../src/views/post-list/PostFilters.vue', import.meta.url),
  'utf8',
);
const script = source.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1];
const setup = new Function(
  'defineProps',
  'defineEmits',
  'useCategoryStore',
  'computed',
  'ref',
  'watch',
  stripTypeScriptTypes(script.replace(/^import .*;\n/gm, '')) +
    '\nreturn { tagInput, tagOptions, showAllTags, selectTag };',
);

function fixture(tagId) {
  const props = reactive({ categoryId: 1, query: '', tagId, sort: 'active' });
  const events = [];
  const store = {
    categories: [
      { id: 1, slug: 'novel' },
      { id: 2, slug: 'feedback' },
    ],
    defaultCategory: { slug: 'novel' },
    tagsByCategoryId: (id) =>
      id === 1
        ? Array.from({ length: 12 }, (_, i) => ({
            id: i + 1,
            name: `标签${i + 1}`,
          }))
        : [{ id: 20, name: '反馈' }],
  };
  const scope = effectScope();
  const filters = scope.run(() =>
    setup(
      () => props,
      () =>
        (...args) =>
          events.push(args),
      () => store,
      computed,
      ref,
      watch,
    ),
  );
  return { props, events, filters, stop: () => scope.stop() };
}

test('tag preview limits options and keeps a selected overflow tag visible', () => {
  const f = fixture(12);
  try {
    assert.equal(f.filters.tagOptions.value.length, 10);
    assert.equal(f.filters.tagOptions.value.at(-1).value, '12');
    f.filters.showAllTags.value = true;
    assert.equal(f.filters.tagOptions.value.length, 13);
    f.filters.showAllTags.value = false;
    assert.equal(f.filters.tagOptions.value.at(-1).value, '12');
  } finally {
    f.stop();
  }
});

test('selecting a tag applies immediately and all clears the tag', () => {
  const f = fixture();
  try {
    f.filters.selectTag('3');
    assert.deepEqual(f.events[0], [
      'apply',
      { category: 'novel', query: '', tagId: 3, sort: 'active' },
    ]);
    f.filters.selectTag('3');
    assert.equal(f.events.length, 1);
    f.filters.selectTag('all');
    assert.equal(f.events[1][1].tagId, undefined);
  } finally {
    f.stop();
  }
});

test('route updates sync the selected tag and category changes collapse options', async () => {
  const f = fixture();
  try {
    f.props.tagId = 11;
    await nextTick();
    assert.equal(f.filters.tagInput.value, '11');
    assert.ok(
      f.filters.tagOptions.value.some((option) => option.value === '11'),
    );
    f.filters.showAllTags.value = true;
    f.props.categoryId = 2;
    f.props.tagId = undefined;
    await nextTick();
    assert.equal(f.filters.showAllTags.value, false);
    assert.equal(f.filters.tagInput.value, 'all');
    assert.deepEqual(
      f.filters.tagOptions.value.map((option) => option.value),
      ['all', '20'],
    );
  } finally {
    f.stop();
  }
});
