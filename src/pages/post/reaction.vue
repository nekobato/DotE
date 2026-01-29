<script setup lang="ts">
import type { MisskeyEntities } from "@shared/types/misskey";
import { PropType, onMounted, ref, watch } from "vue";
import { ipcSend } from "@/utils/ipc";
import EmojiPicker from "@/components/EmojiPicker.vue";

type PageProps = {
  instanceUrl: string;
  token: string;
  noteId: string;
  emojis: MisskeyEntities.EmojiSimple[];
};

const props = defineProps({
  data: {
    type: Object as PropType<PageProps>,
    required: true,
  },
});
const emojiPickerRef = ref<{
  focusSearch: () => void;
  resetSearch: () => void;
} | null>(null);

const close = () => {
  ipcSend("post:close");
};

const selectEmoji = async (emoji: MisskeyEntities.EmojiSimple) => {
  ipcSend("main:reaction", {
    postId: props.data.noteId,
    reaction: `:${emoji.name}@.:`,
  });
  close();
};

window.ipc?.on("post:reaction", () => {
  emojiPickerRef.value?.resetSearch();
});

watch(
  () => props.data.noteId,
  () => {
    if (!props.data.noteId) {
      close();
    }

    emojiPickerRef.value?.resetSearch();
    emojiPickerRef.value?.focusSearch();
  },
);

onMounted(() => {
  emojiPickerRef.value?.resetSearch();
  emojiPickerRef.value?.focusSearch();
});
</script>

<template>
  <div class="page">
    <EmojiPicker ref="emojiPickerRef" :emojis="props.data.emojis || []" @select="selectEmoji" />
  </div>
</template>

<style lang="scss" scoped>
.page {
  display: flex;
  flex-wrap: wrap;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
