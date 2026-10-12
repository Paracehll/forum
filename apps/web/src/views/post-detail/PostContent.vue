<script setup lang="ts">
import { XTime } from '@novelia/web-kit';
import { computed } from 'vue';

import type { Post } from '@/api';
import MarkdownContent from '@/components/markdown/MarkdownContent.vue';
import { formatCount } from '@/utils/formatCount';

const props = defineProps<{
  post: Post;
}>();

const hasBeenUpdated = computed(
  () =>
    new Date(props.post.updatedAt).getTime() >
    new Date(props.post.createdAt).getTime(),
);
</script>

<template>
  <article class="pb-3">
    <h1
      class="text-2xl leading-snug font-bold tracking-tight text-ink wrap-anywhere"
    >
      {{ post.title }}
    </h1>

    <div
      class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted"
    >
      <span class="text-sm font-bold text-ink">
        {{ post.authorUsername }}
      </span>
      <span v-if="hasBeenUpdated">
        更新于
        <XTime :time="post.updatedAt" preset="relative" />
      </span>
      <span v-else>
        发布于
        <XTime :time="post.createdAt" preset="relative" />
      </span>
      <span>{{ formatCount(post.viewsCount) }} 次浏览</span>
    </div>

    <div v-if="$slots.actions" class="mt-4">
      <slot name="actions" />
    </div>
    <div class="my-4 h-px bg-divider" />
    <MarkdownContent mode="article" :source="post.content" />
  </article>
</template>
