<script setup lang="ts">
import { MisskeyEntities } from "~/types/misskey";
import { Instance, Timeline } from "~/types/store";
import { ipcInvoke } from "~/utils/ipc";

const instance = ref<Instance>();
const meta = ref<MisskeyEntities.DetailedInstanceMetadata>();

const categoryFilter = ref<string[]>([]);

const categories = computed(() => {
  const categories = new Set<string>();
  for (const emoji of meta.value?.emojis ?? []) {
    categories.add(emoji.category);
  }
  return Array.from(categories);
});

const filteredEmojis = computed(() => {
  return meta.value?.emojis?.filter((emoji) => {
    if (categoryFilter.value.length === 0) return true;
    return categoryFilter.value.includes(emoji.category);
  });
});

onMounted(async () => {
  instance.value = await ipcInvoke("pipe:current-instance");
  meta.value = await ipcInvoke("api", {
    method: "misskey:getMeta",
  });
});
</script>

<template>
  <div class="reaction">
    <ul>
      <li v-for="category in categories">
        <span>{{ category }}</span>
      </li>
      <ul>
        <li v-for="emoji in filteredEmojis">
          <img :src="emoji.url" :alt="emoji.name" width="24" height="24" />
        </li>
      </ul>
    </ul>
  </div>
</template>

<style lang="scss" scoped></style>
