<script setup lang="ts">
import { KeyboardArrowDownOutlined, SearchOutlined } from '@vicons/material';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

import { type PostSort } from '@/api';
import { XSelect } from '@novelia/web-kit';
import { useCategoryStore } from '@/stores/category';

const props = withDefaults(
  defineProps<{
    categoryId: number;
    query: string;
    tagIds?: number[];
    sort: PostSort;
  }>(),
  {
    tagIds: () => [],
  },
);

const emit = defineEmits<{
  apply: [filters: { query: string; tagIds: number[]; sort: PostSort }];
}>();
const categoryStore = useCategoryStore();

const queryInput = ref(props.query);
const tagIdsInput = ref<number[]>([...props.tagIds]);
const sortInput = ref<PostSort>(props.sort);
const isOpen = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

const tags = computed(() => categoryStore.tagsByCategoryId(props.categoryId));
const sortOptions = [
  { label: '最近活跃', value: 'active' },
  { label: '最新发布', value: 'newest' },
  { label: '最新更新', value: 'updated' },
  { label: '浏览最多', value: 'views' },
  { label: '评论最多', value: 'comments' },
];

const selectedTagLabel = computed(() => {
  if (tagIdsInput.value.length === 0) return '全部标签';
  const selectedTags = tags.value.filter((tag) =>
    tagIdsInput.value.includes(tag.id),
  );
  if (selectedTags.length === 1) return selectedTags[0].name;
  return `已选 ${selectedTags.length} 个标签`;
});

function toggleDropdown() {
  isOpen.value = !isOpen.value;
}

function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

function syncInputs() {
  queryInput.value = props.query;
  tagIdsInput.value = [...props.tagIds];
  sortInput.value = props.sort;
}

function apply() {
  emit('apply', {
    query: queryInput.value.trim(),
    tagIds: [...tagIdsInput.value],
    sort: sortInput.value,
  });
}

function clearTags() {
  tagIdsInput.value = [];
  apply();
}

watch(
  () => [props.query, props.tagIds, props.sort],
  syncInputs,
  { deep: true },
);
watch(
  () => props.categoryId,
  (_categoryId, previousCategoryId) => {
    if (previousCategoryId != null) {
      tagIdsInput.value = [];
      isOpen.value = false;
    }
  },
);
</script>

<template>
  <form
    class="flex min-w-0 flex-wrap gap-2 sm:flex-nowrap"
    role="search"
    @submit.prevent="apply"
  >
    <label class="relative w-full min-w-0 sm:flex-1">
      <span class="sr-only">搜索帖子</span>
      <SearchOutlined
        class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
        aria-hidden="true"
      />
      <input
        v-model="queryInput"
        type="search"
        enterkeyhint="search"
        class="min-h-10 w-full rounded-sm border border-border bg-transparent pr-3 pl-9 text-sm outline-none transition placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15 sm:pr-10"
        placeholder="搜索标题或正文"
      />
      <span
        class="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 text-sm text-muted/70 sm:block"
        aria-hidden="true"
      >
        ↵
      </span>
    </label>

    <div v-if="tags.length" ref="dropdownRef" class="relative min-w-0 flex-1 sm:w-36 sm:flex-none">
      <button
        type="button"
        class="flex min-h-10 w-full items-center justify-between gap-2 rounded-sm border border-border bg-surface px-3 py-2 text-sm font-medium text-ink outline-none transition hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/15 cursor-pointer"
        :aria-expanded="isOpen"
        aria-label="按标签过滤"
        @click="toggleDropdown"
      >
        <span class="truncate">{{ selectedTagLabel }}</span>
        <KeyboardArrowDownOutlined
          class="size-4 shrink-0 text-muted transition-transform duration-200"
          :class="{ 'rotate-180': isOpen }"
          aria-hidden="true"
        />
      </button>

      <div
        v-if="isOpen"
        class="absolute top-full left-0 z-30 mt-1 max-h-60 w-full min-w-44 overflow-y-auto rounded-md border border-border bg-surface p-2 shadow-lg"
      >
        <div class="mb-1.5 flex items-center justify-between border-b border-border/60 px-1 pb-1.5 text-xs font-semibold text-muted">
          <span>标签筛选</span>
          <button
            v-if="tagIdsInput.length > 0"
            type="button"
            class="text-xs text-primary hover:underline cursor-pointer"
            @click="clearTags"
          >
            清空
          </button>
        </div>
        <div class="flex flex-col gap-1">
          <label
            v-for="tag in tags"
            :key="tag.id"
            class="flex cursor-pointer select-none items-center gap-2 rounded px-2 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-surface-hover"
            :class="{ 'text-primary font-semibold': tagIdsInput.includes(tag.id) }"
          >
            <input
              v-model="tagIdsInput"
              type="checkbox"
              :value="tag.id"
              class="size-3.5 rounded border-border text-primary focus:ring-primary/20"
              @change="apply"
            />
            <span class="truncate">{{ tag.name }}</span>
          </label>
        </div>
      </div>
    </div>

    <XSelect
      v-model="sortInput"
      :options="sortOptions"
      aria-label="帖子排序"
      class="min-w-0 flex-1 sm:w-32 sm:flex-none"
      @change="apply"
    />
  </form>
</template>
