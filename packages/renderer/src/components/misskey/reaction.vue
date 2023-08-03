<script setup lang="ts">
import { useStore } from "@/store";
import { ipcSend } from "@/utils/ipc";
import { PropType, computed, reactive } from "vue";

const store = useStore();

const props = defineProps({
  reaction: {
    type: Object as PropType<{ [key: string]: number }>,
    required: true,
  },
});

const emojiUrl = computed(() => {
  return store.state.timeline.misskeyEmojis;
});
</script>

<template>
  <div class="media-viewer" @click="$emit('reaction')">
    <img :src="state.media.url" />
  </div>
</template>
<style lang="scss" scoped>
.reaction {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 2px;
  img {
    width: 20px;
    height: 20px;
  }
}
</style>
