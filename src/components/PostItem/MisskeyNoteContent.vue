<script setup lang="ts">
import { Icon } from "@iconify/vue";
import type { MisskeyNoteContentProps } from "@shared/types/misskey";
import { computed, toRef } from "vue";
import { useMisskeyNoteContent } from "@/composables/useMisskeyNoteContent";
import Mfm from "../misskey/Mfm.vue";

const props = withDefaults(defineProps<MisskeyNoteContentProps>(), {
  emojis: () => [],
  noParent: false,
});

const emit = defineEmits<{
  openUserPage: [user: MisskeyNoteContentProps["note"]["user"]];
}>();

// Composables
const noteRef = toRef(props, "note");
const emojisRef = toRef(props, "emojis");
const originNoteRef = toRef(props, "originNote");
const originUserRef = toRef(props, "originUser");

const { noteEmojis, resolvedOriginUser, originUsername, host, getUsername, readAll, isTextHide } =
  useMisskeyNoteContent(noteRef, emojisRef, originNoteRef, originUserRef, props.currentInstanceUrl, props.hideCw);

const isContentVisible = computed(() => {
  return props.type !== "renote";
});

const openUserPage = (user: MisskeyNoteContentProps["note"]["user"]) => {
  emit("openUserPage", user);
};

const lineClass = computed(() => {
  switch (props.lineStyle) {
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
  <div class="note-content" :class="[props.type, { 'no-parent': props.noParent }]">
    <div class="dote-post-info" v-if="isContentVisible">
      <span class="username" v-html="getUsername(props.note.user)" @click="openUserPage(props.note.user)" />
      <div class="acted-by" v-if="resolvedOriginUser">
        <Icon icon="mingcute:refresh-3-line" v-if="props.type === 'renoted'" />
        <Icon icon="mingcute:left-fill" v-if="props.type === 'mention'" />
        <Icon icon="mingcute:star-fill" v-if="props.type === 'reaction'" />
        <Icon icon="mingcute:chart-horizontal-line" v-if="props.type === 'pollEnded'" />
        <span
          class="username origin"
          v-if="resolvedOriginUser"
          v-html="originUsername"
          @click="openUserPage(resolvedOriginUser)"
        />
      </div>
    </div>
    <div class="dote-post-content">
      <Icon icon="mingcute:refresh-3-line" class="post-type-mark" v-if="props.type === 'quoted'" />
      <img
        class="dote-avatar"
        :class="{ mini: props.type === 'renote', 'line-1': props.lineStyle === 'line-1' }"
        :src="props.note.user.avatarUrl || ''"
        alt=""
        @click="openUserPage(props.note.user)"
      />
      <img
        class="dote-avatar origin-user"
        v-if="resolvedOriginUser"
        :src="resolvedOriginUser?.avatarUrl || ''"
        alt=""
        @click="openUserPage(resolvedOriginUser)"
      />
      <div class="text-container" :class="[lineClass]" v-if="isContentVisible">
        <Mfm
          class="cw"
          :text="props.note?.cw || ''"
          :emojis="noteEmojis"
          :host="host"
          :post-style="props.lineStyle"
          v-if="props.note?.cw"
        />
        <button class="nn-button size-xsmall read-all" v-if="isTextHide" @click="readAll">続きを見る</button>
        <Mfm
          class="text"
          :text="props.note?.text || ''"
          :emojis="noteEmojis"
          :host="host"
          :post-style="props.lineStyle"
          v-show="!isTextHide"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.username {
  img.emoji {
    height: var(--font-size-12);
    margin-bottom: -2px;
  }
}
</style>

<style lang="scss" scoped>
.username {
  display: flex;
  align-items: center;
  height: 12px;
  color: var(--dote-color-white-t5);
  font-weight: bold;
  font-size: var(--font-size-10);
  line-height: var(--font-size-10);
  white-space: nowrap;
}

.username,
.dote-avatar {
  cursor: pointer;
}

.note-content {
  &.renote {
    height: 0;
  }
  &.quoted:not(.no-parent) {
    margin-top: 4px;
    padding-top: 4px;
    /* dashed boarder */
    background-image: linear-gradient(
      to right,
      var(--dote-color-white-t2),
      var(--dote-color-white-t2) 4px,
      transparent 4px,
      transparent 6px
    );
    background-repeat: repeat-x;
    background-size: 8px 1px;
  }
  &.quoted .username {
    margin-left: 16px;
  }
}
.post-type-mark {
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  color: #adadad;
}

.dote-avatar {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  margin: 0 0 auto 0;
  object-fit: cover;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 50%;
  &.line-1 {
    width: 20px;
    height: 20px;

    &.mini {
      top: 24px;
      width: 16px;
      height: 16px;
    }
  }
  &.mini {
    position: relative;
    top: 28px;
    z-index: 1;
    width: 20px;
    height: 20px;
  }

  &.origin-user {
    position: absolute;
    top: 12px;
    left: 0;
    width: 20px;
    height: 20px;
    margin-left: 0;
  }

  & + * {
    margin-left: 8px;
  }
}

.dote-post-content {
  position: relative;
  display: flex;
  width: 100%;

  > .dote-avatar {
    flex-shrink: 0;
  }
}
.dote-post-info {
  display: flex;
  align-items: flex-start;
  .acted-by {
    display: inline-flex;
    align-items: center;
    margin-left: 4px;
    opacity: 0.6;
    > svg {
      height: var(--font-size-12);
    }
    > .username {
      margin-left: 4px;
    }
  }

  & + .dote-post-content {
    margin-top: 4px;
  }
}
.dote-post-info .renote > .dote-post-body > .dote-avatar {
  width: 20px;
  height: 20px;
}

.text-container {
  min-height: calc(0.8rem * 2);
  overflow: hidden;
  color: var(--dote-color-white);
  font-size: 0.6rem;
  line-height: 1rem;
}

.read-all {
  font-size: 0.5rem;
}

.line-all {
  display: block;
  .cw,
  .text {
    display: block;
  }

  .read-all {
    margin-top: 4px;
  }
}
.line-1,
.line-2,
.line-3 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  .cw,
  .text {
    display: inline;
  }

  .cw + * {
    margin-left: 8px;
  }
}
.line-1 {
  min-height: 0.8rem;
  white-space: nowrap;
  line-clamp: 1;
}
.line-2 {
  line-clamp: 2;
  .read-all {
    margin-top: 4px;
  }
}
.line-3 {
  line-clamp: 3;
  .read-all {
    margin-top: 4px;
  }
}
</style>
