<script setup lang="ts">
import { SearchOutlined } from '@vicons/material';
import { computed, ref, watch } from 'vue';

import { type PostSort } from '@/api';
import { XSelect } from '@novelia/web-kit';
import { useCategoryStore } from '@/stores/category';

const props = defineProps<{
  categoryId: number;
  query: string;
  tagId?: number;
  sort: PostSort;
}>();

const emit = defineEmits<{
  apply: [
    filters: {
      category: string;
      query: string;
      tagId?: number;
      sort: PostSort;
    },
  ];
}>();
const categoryStore = useCategoryStore();

const ALL_TAGS = 'all';

const selectedCategory = computed(
  () =>
    categoryStore.categories.find(
      (category) => category.id === props.categoryId,
    )?.slug ?? categoryStore.defaultCategory.slug,
);
const categoryInput = ref(selectedCategory.value);
const categoryOptions = computed(() =>
  categoryStore.categories.map((category) => ({
    label: category.title,
    value: category.slug,
  })),
);
const queryInput = ref(props.query);
const tagInput = ref(props.tagId ? String(props.tagId) : ALL_TAGS);
const sortInput = ref<PostSort>(props.sort);
const tags = computed(() => categoryStore.tagsByCategoryId(props.categoryId));
const TAG_PREVIEW_LIMIT = 8;
const showAllTags = ref(false);
const visibleTags = computed(() =>
  tags.value.filter(
    (tag, index) =>
      showAllTags.value ||
      index < TAG_PREVIEW_LIMIT ||
      String(tag.id) === tagInput.value,
  ),
);

const tagOptions = computed(() => [
  { label: '全部', value: ALL_TAGS },
  ...visibleTags.value.map((tag) => ({
    label: tag.name,
    value: String(tag.id),
  })),
]);

function selectTag(value: string) {
  if (tagInput.value === value) return;
  tagInput.value = value;
  apply();
}
const sortOptions = [
  { label: '最近活跃', value: 'active' },
  { label: '最新发布', value: 'newest' },
  { label: '最新更新', value: 'updated' },
  { label: '浏览最多', value: 'views' },
  { label: '评论最多', value: 'comments' },
];

function syncInputs() {
  queryInput.value = props.query;
  tagInput.value = props.tagId ? String(props.tagId) : ALL_TAGS;
  sortInput.value = props.sort;
}

function apply() {
  const tagId = Number(tagInput.value);
  emit('apply', {
    category: categoryInput.value,
    query: queryInput.value.trim(),
    tagId: Number.isSafeInteger(tagId) && tagId > 0 ? tagId : undefined,
    sort: sortInput.value,
  });
}

function changeCategory() {
  tagInput.value = ALL_TAGS;
  apply();
}

watch(selectedCategory, (category) => {
  categoryInput.value = category;
});
watch(() => [props.query, props.tagId, props.sort], syncInputs);
watch(
  () => props.categoryId,
  (_categoryId, previousCategoryId) => {
    showAllTags.value = false;
    if (previousCategoryId != null) tagInput.value = ALL_TAGS;
  },
);
</script>

<template>
  <form class="min-w-0 space-y-3" role="search" @submit.prevent="apply">
    <div class="flex min-w-0 flex-wrap gap-2 sm:flex-nowrap">
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

      <XSelect
        v-model="categoryInput"
        :options="categoryOptions"
        aria-label="选择板块"
        class="min-w-0 flex-1 sm:w-32 sm:flex-none lg:hidden"
        @change="changeCategory"
      />

      <XSelect
        v-model="sortInput"
        :options="sortOptions"
        aria-label="帖子排序"
        class="min-w-0 flex-1 sm:w-32 sm:flex-none"
        @change="apply"
      />
    </div>

    <div
      v-if="tags.length"
      role="group"
      aria-label="按标签过滤"
      class="flex items-start gap-4 px-1"
    >
      <span
        class="shrink-0 py-2 text-xs leading-5 text-muted/70"
        aria-hidden="true"
      >
        标签
      </span>
      <div class="flex min-w-0 flex-wrap gap-x-5 gap-y-1">
        <button
          v-for="option in tagOptions"
          :key="option.value"
          type="button"
          :aria-pressed="tagInput === option.value"
          class="min-h-9 max-w-full rounded-sm py-2 text-sm leading-5 break-words decoration-2 underline-offset-8 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
          :class="
            tagInput === option.value
              ? 'font-medium text-primary underline'
              : 'text-muted hover:text-ink'
          "
          @click="selectTag(option.value)"
        >
          {{ option.label }}
        </button>
        <button
          v-if="tags.length > TAG_PREVIEW_LIMIT"
          type="button"
          :aria-expanded="showAllTags"
          class="min-h-9 rounded-sm py-2 text-xs leading-5 text-muted/70 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          @click="showAllTags = !showAllTags"
        >
          {{ showAllTags ? '收起' : '更多标签' }}
        </button>
      </div>
    </div>
  </form>
</template>
