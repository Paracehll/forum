<script setup lang="ts">
import { ChatBubbleOutlineOutlined } from '@vicons/material';

import { XButton } from '@novelia/web-kit';

import type { PostComment } from '@/api';
import { formatCount } from '@/utils/formatCount';
import { XAsyncContent } from '@novelia/web-kit';
import { XPagination } from '@novelia/web-kit';

import CommentThread from './CommentThread.vue';

defineProps<{
  comments: PostComment[];
  highlighted?: boolean;
  highlightVersion?: number;
  loading: boolean;
  error?: string;
  page: number;
  commentsCount: number;
  totalPages: number;
  locked: boolean;
  postId: number;
  composing: boolean;
  replyToId?: number;
}>();

const emit = defineEmits<{
  retry: [];
  comment: [];
  changePage: [page: number];
  reply: [comment: PostComment];
  cancelReply: [];
  created: [comment: PostComment];
  statusChanged: [id: number, status: number];
  authorCommentsDeleted: [];
}>();
</script>

<template>
  <section class="mt-5 border-t border-divider" aria-live="polite">
    <header
      :class="[
        'flex items-center justify-between gap-4 py-4',
        { 'border-b border-divider': !composing },
      ]"
    >
      <h2
        :key="highlightVersion"
        class="comments-title text-lg font-semibold text-ink"
        :class="{ 'comments-title-highlighted': highlighted }"
      >
        评论
        <span class="text-muted">{{ formatCount(commentsCount) }}</span>
      </h2>
      <XButton
        size="sm"
        aria-controls="comment-composer"
        :aria-expanded="composing"
        @click="emit('comment')"
      >
        <ChatBubbleOutlineOutlined class="size-4" aria-hidden="true" />
        {{ composing ? '取消评论' : '发表评论' }}
      </XButton>
    </header>

    <slot name="composer" />

    <XAsyncContent
      :loading="loading"
      :error="error"
      :empty="!comments.length"
      size="compact"
      error-title=""
      :error-icon="false"
      retry-label="重新加载评论"
      empty-title="还没有评论"
      empty-description="这里暂时安安静静的。"
      @retry="emit('retry')"
    >
      <template #loading>
        <div class="divide-y divide-divider" aria-label="正在加载评论">
          <div v-for="index in 3" :key="index" class="py-4">
            <div class="h-3 w-28 animate-pulse rounded-sm bg-border" />
            <div class="mt-3 h-4 w-full animate-pulse rounded-sm bg-divider" />
            <div class="mt-2 h-4 w-2/3 animate-pulse rounded-sm bg-divider" />
          </div>
        </div>
      </template>

      <template #empty-icon>
        <div
          class="mx-auto grid size-11 place-items-center rounded-full bg-paper text-muted"
          aria-hidden="true"
        >
          <ChatBubbleOutlineOutlined class="size-5" />
        </div>
      </template>

      <div class="divide-y divide-divider">
        <CommentThread
          v-for="comment in comments"
          :key="comment.id"
          :comment="comment"
          :locked="locked"
          :post-id="postId"
          :reply-to-id="replyToId"
          @reply="emit('reply', $event)"
          @cancel-reply="emit('cancelReply')"
          @created="emit('created', $event)"
          @status-changed="(id, status) => emit('statusChanged', id, status)"
          @author-comments-deleted="emit('authorCommentsDeleted')"
        />
      </div>
    </XAsyncContent>

    <XPagination
      v-if="!loading && !error && totalPages > 1"
      :page="page"
      :total-pages="totalPages"
      @change="emit('changePage', $event)"
    />
  </section>
</template>

<style scoped>
.comments-title,
.comments-title span {
  transition: color 350ms ease-out;
}

.comments-title-highlighted {
  color: var(--color-warning);
  animation: comments-title-blink 600ms ease-in-out 2;
}

.comments-title-highlighted span {
  color: var(--color-warning);
}

@keyframes comments-title-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

@media (prefers-reduced-motion: reduce) {
  .comments-title,
  .comments-title span {
    transition: none;
  }

  .comments-title-highlighted {
    animation: none;
  }
}
</style>
