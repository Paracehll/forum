import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import ts from 'typescript';
import MarkdownIt from 'markdown-it';

const source = await readFile(
  new URL('../src/markdown-editor.ts', import.meta.url),
  'utf8',
);
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
});
const { createMarkdownLink, handleMarkdownLinkPaste } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
);

test('escaped labels and URL parentheses survive Markdown parsing', () => {
  const label = String.raw`名称 [附录] \ 路径`;
  const link = createMarkdownLink(
    label,
    '  HTTPS://example.com/a(b)?x=1&y=2  ',
  );
  const tokens = new MarkdownIt().parseInline(link, {})[0].children;
  assert.equal(tokens[0].type, 'link_open');
  assert.equal(
    tokens[0].attrGet('href'),
    'https://example.com/a%28b%29?x=1&y=2',
  );
  assert.equal(tokens[1].content, label);
  assert.equal(tokens[2].type, 'link_close');
});

test('invalid URLs, empty selections and multiline selections are ignored', () => {
  for (const url of [
    'javascript:alert(1)',
    'ftp://example.com',
    'https://',
    'https://a b',
    'plain text',
  ]) {
    assert.equal(createMarkdownLink('文字', url), null);
  }
  for (const selection of ['', 'a\nb', 'a\rb']) {
    assert.equal(createMarkdownLink(selection, 'https://example.com'), null);
  }
});

test('a URL selection is never linkified', () => {
  for (const selection of [
    'https://old.example',
    '  HTTPS://old.example/a(b)  ',
  ]) {
    assert.equal(createMarkdownLink(selection, 'https://new.example'), null);
  }
  // A URL pasted over non-URL text is still a normal Markdown link.
  assert.equal(
    createMarkdownLink('文字', 'https://new.example'),
    '[文字](https://new.example/)',
  );
});

function editor({
  success = true,
  nativeInput = true,
  throws = false,
  value = '前文字后',
  selectionStart = 1,
  selectionEnd = 3,
  clipboard = 'https://example.com',
} = {}) {
  const element = Object.assign(new EventTarget(), {
    value,
    selectionStart,
    selectionEnd,
    maxLength: -1,
    disabled: false,
    readOnly: false,
  });
  let inputCount = 0;
  const commands = [];
  element.addEventListener('input', () => inputCount++);
  element.ownerDocument = {
    activeElement: element,
    defaultView: { Event },
    execCommand(command, showUI, text) {
      commands.push(command);
      assert.equal(command, 'insertText');
      assert.equal(showUI, false);
      if (throws) throw new Error('Unavailable');
      if (!success) return false;
      const start = element.selectionStart;
      element.value =
        element.value.slice(0, start) +
        text +
        element.value.slice(element.selectionEnd);
      element.selectionStart = start;
      element.selectionEnd = start + text.length;
      if (nativeInput)
        element.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    },
  };
  const event = Object.assign(new Event('paste', { cancelable: true }), {
    clipboardData: {
      getData: (type) => (type === 'text/plain' ? clipboard : ''),
    },
  });
  return {
    element,
    event,
    inputs: () => inputCount,
    commands: () => commands,
  };
}

for (const nativeInput of [true, false]) {
  test(`successful insertion syncs the model exactly once (native input: ${nativeInput})`, () => {
    const state = editor({ nativeInput });
    assert.equal(handleMarkdownLinkPaste(state.event, state.element), true);
    assert.equal(state.element.value, '前[文字](https://example.com/)后');
    assert.equal(state.event.defaultPrevented, true);
    assert.equal(state.inputs(), 1);
  });
}

test('a URL pasted over a selected URL replaces it instead of creating a link', () => {
  const oldUrl = 'https://old.example/path';
  for (const nativeInput of [true, false]) {
    const state = editor({
      nativeInput,
      value: oldUrl,
      selectionStart: 0,
      selectionEnd: oldUrl.length,
      clipboard: 'https://new.example/',
    });
    assert.equal(handleMarkdownLinkPaste(state.event, state.element), true);
    assert.equal(state.element.value, 'https://new.example/');
    assert.equal(state.event.defaultPrevented, true);
    assert.deepEqual(state.commands(), ['insertText']);
    assert.equal(state.inputs(), 1);
  }
});

test('a non-URL paste over a URL selection keeps native paste', () => {
  const oldUrl = 'https://old.example';
  const state = editor({
    value: oldUrl,
    selectionStart: 0,
    selectionEnd: oldUrl.length,
    clipboard: '普通文字',
  });
  assert.equal(handleMarkdownLinkPaste(state.event, state.element), false);
  assert.equal(state.event.defaultPrevented, false);
  assert.deepEqual(state.commands(), []);
});

for (const options of [{ success: false }, { throws: true }]) {
  test(`failed insertion leaves native paste available: ${JSON.stringify(options)}`, () => {
    const state = editor(options);
    assert.equal(handleMarkdownLinkPaste(state.event, state.element), false);
    assert.equal(state.event.defaultPrevented, false);
    assert.equal(state.element.value, '前文字后');
    assert.equal(state.inputs(), 0);
  });
}

test('readonly, disabled, unfocused, empty and over-limit selections never invoke insertion', () => {
  for (const setup of [
    ({ element }) => {
      element.readOnly = true;
    },
    ({ element }) => {
      element.disabled = true;
    },
    ({ element }) => {
      element.ownerDocument.activeElement = null;
    },
    ({ element }) => {
      element.selectionEnd = element.selectionStart;
    },
    ({ element }) => {
      element.maxLength = 4;
    },
    ({ event }) => {
      event.clipboardData = null;
    },
    ({ event }) => {
      event.preventDefault();
    },
  ]) {
    const state = editor();
    setup(state);
    const prevented = state.event.defaultPrevented;
    assert.equal(handleMarkdownLinkPaste(state.event, state.element), false);
    assert.deepEqual(state.commands(), []);
    assert.equal(state.event.defaultPrevented, prevented);
  }
  assert.equal(handleMarkdownLinkPaste(editor().event, null), false);
});

test('a link that exactly fits maxlength is accepted', () => {
  const state = editor();
  state.element.maxLength = '前[文字](https://example.com/)后'.length;
  assert.equal(handleMarkdownLinkPaste(state.event, state.element), true);
});
