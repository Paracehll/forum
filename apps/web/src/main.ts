import { createWebKit } from '@novelia/web-kit';
import { PiniaColada } from '@pinia/colada';
import { createApp } from 'vue';

import App from './App.vue';
import { initializeApi } from './api';
import router from './router';
import { initializeSession } from './session';
import { pinia } from './stores';
import { useCategoryStore } from './stores/category';
import './styles.css';

migrateWebKitStorage();

const webKit = createWebKit({
  auth: {
    app: 'f',
    url: __AUTH_URL__,
  },
  brand: '论坛',
  repository: {
    url: 'https://github.com/auto-novel/forum',
    buildTime: __BUILD_TIME__,
    commitSha: __COMMIT_SHA__,
  },
});
initializeSession(webKit);
initializeApi(
  webKit.createClient(new URL('/api/v1/', window.location.origin).toString()),
);

createApp(App)
  .use(webKit)
  .use(pinia)
  .use(PiniaColada, {
    queryOptions: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
    },
  })
  .use(router)
  .mount('#app');

void useCategoryStore().initialize();

// 2026-10-11：迁移旧主题和会话，不覆盖新设置，并清理旧存储键。
function migrateWebKitStorage() {
  for (const name of ['theme', 'session']) {
    try {
      const oldKey = `forum:${name}:v1`;
      const newKey = `web-kit:${name}:v1`;
      const value = localStorage.getItem(oldKey);
      if (value !== null && localStorage.getItem(newKey) === null) {
        if (name === 'session') {
          localStorage.setItem(newKey, value);
        } else if (value === 'light' || value === 'dark') {
          localStorage.setItem(newKey, JSON.stringify(value));
        }
      }
      localStorage.removeItem(oldKey);
    } catch {
      // 存储不可用或写入失败时保留旧值，继续初始化。
    }
  }
}
