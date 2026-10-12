import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { compile, createSSRApp, h } from 'vue';
import { renderToString } from 'vue/server-renderer';

const source = readFileSync(
  new URL('../src/views/post-list/PostListView.vue', import.meta.url),
  'utf8',
);
const template = source.slice(
  source.indexOf('<template>') + 10,
  source.lastIndexOf('</template>'),
);
const render = compile(template);
const passthrough = {
  setup(_, { slots }) {
    return () => h('div', [slots.default?.(), slots.actions?.()]);
  },
};

for (const mode of ['mobile', 'tablet', 'desktop']) {
  test(`post list uses web-kit viewport for ${mode} navigation and publish label`, async () => {
    assert.match(source, /const \{ isDesktop \} = useWebKitViewport\(\)/);
    const app = createSSRApp({
      render,
      setup: () => ({
        isDesktop: mode === 'desktop',
        selectedCategory: 'novel',
        selectedCategoryItem: { id: 1, title: '小说' },
        categoryStore: {
          categories: [{ slug: 'novel', title: '小说' }],
          canPublish: () => true,
        },
        searchQuery: '',
        selectedSort: 'updated',
        selectedTagId: undefined,
        applyFilters() {},
        RouterLink: passthrough,
        posts: [],
        postsLoading: false,
        postsError: undefined,
        page: 1,
        totalPages: 1,
        hasFilters: false,
        loadPosts() {},
        changePage() {},
      }),
    });
    for (const name of ['RouterLink', 'PostFilters', 'XButton']) {
      app.component(name, passthrough);
    }
    for (const name of ['AddOutlined', 'PostList']) {
      app.component(name, { render: () => null });
    }
    const html = await renderToString(app);
    assert.equal(html.includes('<h1'), mode === 'desktop');
    assert.equal(html.includes('aria-label="帖子板块"'), mode !== 'desktop');
    assert.ok(
      html.includes(`<span>${mode === 'desktop' ? '发表帖子' : '发帖'}</span>`),
    );
  });
}
