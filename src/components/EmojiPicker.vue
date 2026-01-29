<script setup lang="ts">
import { useStorage } from "@vueuse/core";
import type { MisskeyEntities } from "@shared/types/misskey";
import { computed, ref } from "vue";

const props = withDefaults(
  defineProps<{
    emojis: MisskeyEntities.EmojiSimple[];
    historiesKey?: string;
    maxHistories?: number;
    showCategories?: boolean;
  }>(),
  {
    emojis: () => [],
    historiesKey: "reaction-histories",
    maxHistories: 40,
    showCategories: true,
  },
);

const emit = defineEmits<{
  select: [emoji: MisskeyEntities.EmojiSimple];
}>();

const histories = useStorage<MisskeyEntities.EmojiSimple[]>(props.historiesKey, []);

const search = ref("");
const searchInput = ref<HTMLInputElement | null>(null);
const categoryFilter = ref<string[]>([]);

const categories = computed(() => {
  const result = new Set<string>();
  for (const emoji of props.emojis || []) {
    result.add(emoji.category || "");
  }
  return Array.from(result);
});

const filteredEmojis = computed(() => {
  return (
    props.emojis
      ?.filter((emoji) => {
        if (categoryFilter.value.length === 0) return true;
        return categoryFilter.value.includes(emoji.category || "");
      })
      .filter((emoji) => {
        if (search.value === "") return true;
        return emoji.name.includes(search.value);
      }) ?? []
  );
});

const selectCategory = (category: string) => {
  if (categoryFilter.value.includes(category)) {
    categoryFilter.value = categoryFilter.value.filter((current) => current !== category);
  } else {
    categoryFilter.value = [...categoryFilter.value, category];
  }
};

const updateHistories = (emoji: MisskeyEntities.EmojiSimple) => {
  const next = [emoji, ...histories.value.filter((item) => item.name !== emoji.name)];
  histories.value = next.slice(0, Math.max(0, props.maxHistories ?? 0));
};

const selectEmoji = (emoji: MisskeyEntities.EmojiSimple) => {
  updateHistories(emoji);
  emit("select", emoji);
};

const onInputSearchEmoji = () => {
  search.value = search.value.trim();
  if (search.value === "") return;
  categoryFilter.value = [];
};

const focusSearch = () => {
  searchInput.value?.focus();
};

const resetSearch = () => {
  search.value = "";
  categoryFilter.value = [];
};

defineExpose({
  focusSearch,
  resetSearch,
});
</script>

<template>
  <div class="emoji-picker">
    <ul class="category-list" v-if="props.showCategories">
      <li v-for="category in categories" :key="category">
        <button
          class="nn-button size-small"
          @click="selectCategory(category)"
          :class="{ selected: categoryFilter.includes(category) }"
        >
          <span>{{ category || "その他" }}</span>
        </button>
      </li>
    </ul>
    <div class="emojis-container">
      <div class="search-container">
        <input
          class="nn-text-field"
          type="search"
          placeholder="検索"
          v-model="search"
          @input="onInputSearchEmoji"
          ref="searchInput"
        />
      </div>
      <div class="emoji-list-group">
        <div class="history-list-container" v-if="histories.length">
          <ul class="emoji-list">
            <li v-for="emoji in histories" :key="emoji.name">
              <button class="nn-button size-small reaction-button" @click="selectEmoji(emoji)">
                <img :src="emoji.url" :alt="emoji.name" />
              </button>
            </li>
          </ul>
        </div>
        <ul class="emoji-list">
          <li v-for="emoji in filteredEmojis" :key="emoji.name">
            <button class="nn-button size-small reaction-button" @click="selectEmoji(emoji)">
              <img :src="emoji.url" :alt="emoji.name" />
            </button>
          </li>
          <li v-if="!filteredEmojis.length" class="emoji-empty">該当する絵文字がありません</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.emoji-picker {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.reaction-button {
  height: 32px;
  padding: 0;
  border-color: var(--dote-color-white-t1);
  > img {
    width: auto;
    height: 100%;
  }
  &:hover {
    border-color: var(--dote-color-white-t2);
  }
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 40%;
  height: 100%;
  margin: 0;
  padding: 8px;
  overflow-y: scroll;
  list-style: none;

  > li {
    display: inline-flex;
    padding: 0 4px;
    color: #343434;
    font-size: var(--font-size-14);

    .nn-button {
      justify-content: flex-start;
      font-size: var(--font-size-12);
      &.selected {
        color: #343434;
        background-color: #fff;
      }
      > span {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        border-right: 1px solid var(--dote-color-white-t1);
      }
      > img {
        width: auto;
        height: 24px;
      }
    }
  }
}

.emojis-container {
  display: flex;
  flex-direction: column;
  width: 60%;
  height: 100%;
  overflow-y: scroll;
}

.search-container {
  padding: 8px;
  border-bottom: 1px solid var(--dote-color-white-t1);
}

.emoji-list-group {
  display: flex;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
  overflow-y: scroll;
  list-style: none;
}

.emoji-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-content: flex-start;
  align-items: flex-start;
  justify-content: flex-start;
  width: 100%;
  > li {
    display: inline-flex;
    flex: 0 0 auto;
  }
}

.emoji-empty {
  padding: 8px;
  color: var(--dote-color-white-t3);
  font-size: var(--font-size-12);
}
</style>
