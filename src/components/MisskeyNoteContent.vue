<script setup lang="ts">
import { useStore } from "@/store";
import { useTimelineStore } from "@/store/timeline";
import { ipcSend } from "@/utils/ipc";
import { emojisObject2Array, parseMisskeyText } from "@/utils/misskey";
import type { MisskeyNote } from "@shared/types/misskey";
import { computed, ref, type PropType } from "vue";
import Mfm from "./misskey/Mfm.vue";

const store = useStore();
const timelineStore = useTimelineStore();

const props = defineProps({
  note: {
    type: Object as PropType<MisskeyNote>,
    required: true,
  },
  type: {
    type: String as PropType<"note" | "reply" | "renote" | "renoted" | "quote">,
    required: true,
  },
});

const noteEmojis = computed(() => {
  const remoteEmojis = emojisObject2Array(props.note.reactionEmojis);
  const localEmojis = timelineStore.currentInstance?.misskey?.emojis || [];
  return [...remoteEmojis, ...localEmojis];
});

const renoteUsername = computed(() => {
  const note = props.note as MisskeyNote;
  if (!note?.user.name) return note?.user.username;
  if (note && noteEmojis.value) {
    return parseMisskeyText(note.user.name, noteEmojis.value);
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

const canReadAll = ref(false);

const isTextVisible = () => {
  return !props.note?.cw || !store.settings.misskey.hideCw || canReadAll.value;
};
</script>

<template>
  <div :class="[props.type]">
    <div class="hazy-post-info">
      <span
        class="username"
        v-html="renoteUsername"
        @click="openUserPage(props.note.user)"
        v-if="props.type !== 'renote'"
      />
    </div>
    <div class="hazy-post-content">
      <img
        class="hazy-avatar"
        :class="{ mini: props.type === 'renote' }"
        :src="props.note.user.avatarUrl"
        alt=""
        @click="openUserPage(props.note.user)"
      />
      <div class="text-container" :class="[lineClass]">
        <Mfm
          class="cw"
          :text="props.note?.cw || ''"
          :emojis="noteEmojis"
          :host="timelineStore.currentInstance?.url"
          :post-style="store.settings.postStyle"
          v-if="props.note?.cw"
        />
        <button class="nn-button size-xsmall read-all" v-if="props.note?.cw">続きを見る</button>
        <Mfm
          class="text"
          :text="props.note?.text || ''"
          :emojis="noteEmojis"
          :host="timelineStore.currentInstance?.url"
          :post-style="store.settings.postStyle"
          v-show="isTextVisible"
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

.hazy-avatar {
  &.mini {
    width: 20px;
    height: 20px;
  }

  & + * {
    margin-left: 8px;
  }
}

.hazy-post-content {
  display: flex;
  width: 100%;

  > .hazy-avatar {
    flex-shrink: 0;
  }
}

.renote > .hazy-post-body > .hazy-avatar {
  width: 20px;
  height: 20px;
}

.text-container {
  display: -webkit-box;
  min-height: calc(var(--post-body--line-height) * 2);
  overflow: hidden;
  color: var(--post-body-color);
  font-size: var(--post-body--font-size);
  line-height: var(--post-body--line-height);
}

.line-all {
  -webkit-line-clamp: unset;
  -webkit-box-orient: unset;
}
.line-1 {
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  .cw,
  .text {
    white-space: nowrap;
  }
}
.line-2 {
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.line-3 {
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}
</style>
