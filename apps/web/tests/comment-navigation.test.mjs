import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { parse } from 'vue/compiler-sfc';

const detail = readFileSync(
  new URL('../src/views/post-detail/PostDetailView.vue', import.meta.url),
  'utf8',
);
const { descriptor } = parse(detail);
// Execute the actual navigation implementation with a non-scrolling DOM and
// deterministic timers, without mounting unrelated API-dependent components.
const navigation = descriptor.scriptSetup.content.slice(
  descriptor.scriptSetup.content.indexOf('const commentsHighlighted'),
  descriptor.scriptSetup.content.indexOf('function changeCommentPage'),
);

function setup({ reducedMotion = false, missingTarget = false } = {}) {
  const timers = new Map();
  const calls = [];
  let nextTimer = 0;
  let onPostChange, dispose;
  const target = {
    focus: (options) => calls.push(['focus', options]),
    scrollIntoView: (options) => calls.push(['scroll', options]),
  };
  const api = runInNewContext(
    stripTypeScriptTypes(navigation) +
      '\n({ commentsHighlighted, commentsHighlightVersion, jumpToComments, clearCommentsHighlight });',
    {
      ref: (value) => ({ value }),
      postId: {},
      watch: (_, callback) => {
        onPostChange = callback;
      },
      onScopeDispose: (callback) => {
        dispose = callback;
      },
      document: {
        getElementById: (id) => {
          assert.equal(id, 'comments');
          return missingTarget ? null : target;
        },
      },
      window: {
        matchMedia: (query) => {
          assert.equal(query, '(prefers-reduced-motion: reduce)');
          return { matches: reducedMotion };
        },
      },
      setTimeout: (callback, delay) => {
        const id = ++nextTimer;
        timers.set(id, { callback, delay });
        return id;
      },
      clearTimeout: (id) => timers.delete(id),
    },
  );
  return {
    api,
    timers,
    calls,
    changePost: () => onPostChange(),
    dispose: () => dispose(),
  };
}

test('short pages highlight even when scrolling cannot move the viewport', () => {
  const { api, timers, calls } = setup();
  api.jumpToComments();
  assert.equal(api.commentsHighlighted.value, true);
  assert.equal(calls[0][0], 'focus');
  assert.equal(calls[0][1].preventScroll, true);
  assert.equal(calls[1][1].behavior, 'smooth');
  assert.equal(calls[1][1].block, 'start');
  const timer = [...timers.values()][0];
  assert.equal(timer.delay, 1200);
  timer.callback();
  assert.equal(api.commentsHighlighted.value, false);
  assert.equal(timers.size, 0);
});

test('repeated clicks restart the highlight timeout', () => {
  const { api, timers } = setup();
  api.jumpToComments();
  const oldId = [...timers.keys()][0];
  const oldVersion = api.commentsHighlightVersion.value;
  api.jumpToComments();
  assert.equal(api.commentsHighlightVersion.value, oldVersion + 1);
  assert.equal(timers.has(oldId), false);
  assert.equal(timers.size, 1);
  assert.equal(api.commentsHighlighted.value, true);
  [...timers.values()][0].callback();
  assert.equal(api.commentsHighlighted.value, false);
});

test('reduced motion keeps feedback but disables smooth scrolling and CSS animation', () => {
  const { api, calls } = setup({ reducedMotion: true });
  api.jumpToComments();
  assert.equal(api.commentsHighlighted.value, true);
  assert.equal(calls[1][1].behavior, 'auto');
  const list = readFileSync(
    new URL('../src/views/post-detail/CommentList.vue', import.meta.url),
    'utf8',
  );
  assert.match(
    list,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none/,
  );
  assert.match(list, /'comments-title-highlighted': highlighted/);
  assert.match(list, /:key="highlightVersion"/);
  assert.match(list, /animation: comments-title-blink 600ms ease-in-out 2/);
  assert.match(
    list,
    /\.comments-title,\s*\.comments-title span\s*\{\s*transition: color 350ms ease-out/,
  );
  assert.match(
    list,
    /\.comments-title-highlighted span\s*\{\s*color: var\(--color-warning\)/,
  );
  assert.match(
    list,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*transition: none/,
  );
  assert.doesNotMatch(list, /background-color:/);
  assert.match(detail, /:highlighted="commentsHighlighted"/);
});

test('post changes and disposal clear pending feedback', () => {
  for (const action of ['changePost', 'dispose']) {
    const context = setup();
    context.api.jumpToComments();
    context[action]();
    assert.equal(context.api.commentsHighlighted.value, false);
    assert.equal(context.timers.size, 0);
  }
});

test('missing comment target is a safe no-op', () => {
  const { api, timers, calls } = setup({ missingTarget: true });
  api.jumpToComments();
  assert.equal(api.commentsHighlighted.value, false);
  assert.equal(timers.size, 0);
  assert.equal(calls.length, 0);
});
