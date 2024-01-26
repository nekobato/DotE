<script setup lang="ts">
import { useTimelineStore } from "@/store/timeline";
import { ipcSend } from "@/utils/ipc";
import { Icon } from "@iconify/vue";
import { type PropType, computed, onMounted, onBeforeUnmount } from "vue";
import type { MisskeyNote } from "@shared/types/misskey";
import { emojisObject2Array, isMyReaction, parseMisskeyAttachments, parseMisskeyText } from "@/utils/misskey";
import PostAttachment from "./PostAttachment.vue";
import Mfm from "./misskey/Mfm.vue";
import { useStore } from "@/store";

const store = useStore();
const timelineStore = useTimelineStore();

const props = defineProps({
  note: {
    type: Object as PropType<MisskeyNote>,
    required: true,
  },
});

const renoteEmojis = computed(() => {
  const note = props.note as MisskeyNote;
  return note.user.host
    ? Object.keys(note.emojis).length
      ? emojisObject2Array(note.emojis)
      : []
    : timelineStore.currentInstance?.misskey?.emojis;
});

const renoteUsername = computed(() => {
  const note = props.note as MisskeyNote;
  if (!note?.user.name) return note?.user.username;
  if (note && renoteEmojis.value) {
    return parseMisskeyText(note.user.name, renoteEmojis.value);
  }
});

const openUserPage = (user: MisskeyNote["user"]) => {
  const instanceUrl = user.host || timelineStore.currentInstance?.url;
  ipcSend("open-url", {
    url: new URL(`/@${user.username}`, instanceUrl).toString(),
  });
};

const lineClass = computed(() => {
  switch (store.settings.postStyle) {
    case "all":
      return "line-all";
    case "line-1":
      return "line-1";
    case "line-2":
      return "line-2";
    case "line-3":
      return "line-3";
  }
});
</script>

<template>
  <div class="hazy-post-content">
    <div class="hazy-post-info">
      <span class="username" v-html="renoteUsername" @click="openUserPage(props.note.user)" />
    </div>
    <div class="hazy-post-body">
      <img class="hazy-avatar" :src="props.note.user.avatarUrl" alt="" @click="openUserPage(props.note.user)" />
      <div class="body-container" :class="[lineClass]">
        <Mfm
          class="cw"
          :text="props.note?.cw || ''"
          :emojis="renoteEmojis"
          :host="timelineStore.currentInstance?.url"
          :post-style="store.settings.postStyle"
        />
        <Mfm
          class="text"
          :text="props.note?.text || ''"
          :emojis="renoteEmojis"
          :host="timelineStore.currentInstance?.url"
          :post-style="store.settings.postStyle"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.username {
  display: block;
  color: var(--hazy-color-white-t5);
  font-weight: bold;
  font-size: var(--font-size-10);
  line-height: var(--font-size-10);
  white-space: nowrap;
}

.username,
.hazy-avatar {
  cursor: pointer;
}
</style>
