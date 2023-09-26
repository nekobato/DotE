<script setup lang="ts">
import { MisskeyEntities } from "~/types/misskey";
import { Instance, Timeline } from "~/types/store";

type PageProps = {
  instanceUrl: string;
  token: string;
  noteId: string;
  emojis: MisskeyEntities.CustomEmoji[];
};

const props = defineProps({
  data: {
    type: Object as PropType<PageProps>,
    required: true,
  },
});

const categoryFilter = ref<string[]>([]);

const categories = computed(() => {
  const categories = new Set<string>();
  for (const emoji of props.data.emojis || []) {
    categories.add(emoji.category);
  }
  return Array.from(categories);
});

const filteredEmojis = computed(() => {
  return props.data.emojis?.filter((emoji) => {
    if (categoryFilter.value.length === 0) return true;
    return categoryFilter.value.includes(emoji.category);
  });
});

const selectCategory = (category: string) => {
  if (categoryFilter.value.includes(category)) {
    categoryFilter.value = categoryFilter.value.filter((c) => c !== category);
  } else {
    categoryFilter.value.push(category);
  }
};

const selectEmoji = async (emoji: MisskeyEntities.CustomEmoji) => {
  await ipcInvoke("api", {
    method: "misskeyCreateReaction",
    instanceUrl: props.data.instanceUrl,
    token: props.data.token,
    noteId: props.data.noteId,
    reaction: emoji.name,
  });
  window.ipc.send("post:close");
};
</script>

<template>
  <div class="reaction">
    <ul class="category-list">
      <li v-for="category in categories">
        <button
          class="nn-button size-small"
          @click="selectCategory(category)"
          :class="{ selected: categoryFilter.includes(category) }"
        >
          <span>{{ category }}</span>
        </button>
      </li>
    </ul>
    <ul class="emoji-list">
      <li v-for="emoji in filteredEmojis">
        <button class="nn-button size-small" @click="selectEmoji(emoji)">
          <img :src="emoji.url" :alt="emoji.name" />
        </button>
      </li>
    </ul>
  </div>
</template>

<style lang="scss" scoped>
.reaction {
  display: flex;
  background-color: var(--hazy-background-color);
}
.category-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 50%;
  height: 100vh;
  margin: 0;
  padding: 0;
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
      > img {
        width: auto;
        height: 24px;
      }
    }
  }
}

.emoji-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-content: flex-start;
  align-items: flex-start;
  justify-content: flex-start;
  width: 50%;
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow-y: scroll;
  list-style: none;
  > li {
    display: inline-flex;
    flex: 0 0 auto;
    > .nn-button {
      width: auto;
      height: 32px;
      padding: 0;
      border-color: var(--hazy-color-white-t1);
    }
  }
}
</style>
