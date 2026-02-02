<script setup lang="ts">
import { parseMisskeyText } from "@/utils/misskey";
import type { MisskeyEntities, MisskeyNote } from "@shared/types/misskey";
import { computed, type PropType } from "vue";

const props = defineProps({
  user: {
    type: Object as PropType<MisskeyNote["user"]>,
    required: false,
  },
  type: {
    type: String as PropType<MisskeyEntities.Notification["type"] | "renoted" | "quoted">,
    required: true,
  },
  notification: {
    type: Object as PropType<MisskeyEntities.Notification>,
    required: true,
  },
  currentInstanceUrl: {
    type: String as PropType<string>,
    required: false,
  },
  emojis: {
    type: Array as PropType<{ name: string; url: string }[]>,
    default: {},
    required: true,
  },
  lineStyle: {
    type: String as PropType<"all" | "line-1" | "line-2" | "line-3">,
    required: false,
    default: "all",
  },
});

const emit = defineEmits(["openUserPage"]);

const noteEmojis = computed(() => {
  const localEmojis = props.emojis || [];
  return [...localEmojis];
});

const user = computed(() => {
  switch (props.notification.type) {
    case "follow":
    case "followRequestAccepted":
    case "renote":
    case "quote":
    case "mention":
    case "reaction":
    case "reply":
    case "note":
    case "pollEnded":
    case "receiveFollowRequest":
      return props.notification.user;
    default:
      return undefined;
  }
});

const parseUsername = (name?: string | null) => {
  if (!name) return "";
  if (noteEmojis.value) {
    return parseMisskeyText(name, noteEmojis.value);
  } else {
    return name;
  }
};

const openUserPage = (user: MisskeyNote["user"]) => {
  emit("openUserPage", user);
};
</script>

<template>
  <div class="note-content">
    <div class="dote-post-content" :class="[props.lineStyle]">
      <img class="dote-avatar" v-if="user" :src="user.avatarUrl || ''" alt="" @click="openUserPage(user)" />
      <div class="text-container">
        <p v-if="props.notification.type === 'follow'">{{ parseUsername(user?.name) }}があなたをフォローしました</p>
        <p v-if="props.notification.type === 'followRequestAccepted'">
          {{ parseUsername(user?.name) }}があなたのフォローリクエストを承認しました
        </p>
        <p v-if="props.notification.type === 'achievementEarned'">
          {{ props.notification.achievement }}の実績を獲得しました
        </p>
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
}
.post-type-mark {
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  color: #adadad;
}
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

.dote-avatar {
  flex-shrink: 0;
  width: var(--post-avatar-size);
  height: var(--post-avatar-size);
  margin: 0 0 auto 0;
  object-fit: cover;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 50%;
  &.mini {
    position: relative;
    top: var(--post-avatar-mini-offset);
    z-index: 1;
    width: var(--post-avatar-mini-size);
    height: var(--post-avatar-mini-size);
  }

  & + * {
    margin-left: 8px;
  }
}

.dote-post-content {
  display: flex;
  width: 100%;

  > .dote-avatar {
    flex-shrink: 0;
  }
}
.dote-post-info {
  display: flex;
  align-items: flex-start;
  .renoted-by,
  .mentioned-by,
  .reacted-by {
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
  width: var(--post-avatar-mini-size);
  height: var(--post-avatar-mini-size);
}

.text-container {
  display: flex;
  align-items: center;
  min-height: calc(0.8rem * 2);
  overflow: hidden;
  color: #efefef;
  font-size: 0.6rem;
  line-height: 1rem;
}

.line-all {
  display: block;
  .cw,
  .text {
    display: block;
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
}
.line-3 {
  line-clamp: 3;
}
</style>
