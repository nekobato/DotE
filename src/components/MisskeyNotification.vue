<script setup lang="ts">
import { ipcSend } from "@/utils/ipc";
import { parseMisskeyAttachments } from "@/utils/misskey";
import { Icon } from "@iconify/vue";
import type { MisskeyEntities, MisskeyNote } from "@shared/types/misskey";
import { computed, type PropType } from "vue";
import MisskeyNoteContent from "./MisskeyNoteContent.vue";
import PostAttachment from "./PostAttachment.vue";
import MisskeyNotificationContent from "./MisskeyNotificationContent.vue";

const props = defineProps({
  notification: {
    type: Object as PropType<MisskeyEntities.Notification>,
    required: true,
  },
  emojis: {
    type: Array as PropType<{ name: string; url: string }[]>,
    default: null,
  },
  lineStyle: {
    type: String as PropType<"all" | "line-1" | "line-2" | "line-3">,
    required: true,
  },
  currentInstanceUrl: {
    type: String as PropType<string>,
    required: false,
  },
  hideCw: {
    type: Boolean as PropType<boolean>,
    default: false,
    required: true,
  },
  theme: {
    type: String as PropType<"default">,
    default: "default",
  },
});

const emit = defineEmits(["openPost", "openUserPage", "refreshPost", "reaction", "newReaction"]);

const postAtttachments = computed(() => {
  if (props.notification.type !== "mention") return [];
  const files = props.notification.note.files?.length
    ? props.notification.note.files
    : props.notification.note.renote?.files?.length
      ? props.notification.note.renote.files
      : [];
  return files?.length ? parseMisskeyAttachments(files) : [];
});

const reactions = computed(() => {
  if (props.notification.type !== "reaction") return [];
  const reaction = props.notification.reaction;
  if (!/^:/.test(reaction)) return [{ name: reaction, url: undefined }];
  const reactionName = reaction.replace(/:|@\./g, "");
  return [
    {
      name: reaction,
      url:
        // local
        props.emojis.find((emoji) => emoji.name === reactionName)?.url ||
        // remote
        props.notification.note.reactionEmojis[reaction.replace(/:/g, "")] ||
        "",
    },
  ];
});

const note = computed(() => {
  switch (props.notification.type) {
    case "renote":
      return props.notification.note.renote;
    case "mention":
    case "reaction":
    case "reply":
    case "quote":
    case "pollEnded":
      return props.notification.note;
    default:
      return undefined;
  }
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
    case "receiveFollowRequest":
      return props.notification.user;
    case "pollEnded":
      return props.notification.note.user;
    default:
      return undefined;
  }
});

const openPost = () => {
  if (
    props.notification.type === "mention" ||
    props.notification.type === "reaction" ||
    props.notification.type === "reply" ||
    props.notification.type === "renote" ||
    props.notification.type === "quote"
  ) {
    ipcSend("open-url", { url: new URL(`/notes/${props.notification.note.id}`, props.currentInstanceUrl).toString() });
  }
};

const openUserPage = (user: MisskeyNote["user"]) => {
  const instanceUrl = user.host || props.currentInstanceUrl;
  ipcSend("open-url", {
    url: new URL(
      `/@${user.username}`,
      instanceUrl?.startsWith("https://") ? instanceUrl : `https://${instanceUrl}`,
    ).toString(),
  });
};
</script>

<template>
  <div class="dote-post">
    <div class="post-data-group">
      <MisskeyNoteContent
        v-if="note"
        :note="note"
        :originUser="user"
        :type="props.notification.type === 'renote' ? 'renoted' : props.notification.type"
        :lineStyle="props.lineStyle"
        :currentInstanceUrl="props.currentInstanceUrl"
        :hideCw="props.hideCw"
        :emojis="props.emojis"
        @openUserPage="openUserPage"
      />
      <MisskeyNotificationContent
        v-else
        :type="props.notification.type"
        :notification="props.notification"
        :currentInstanceUrl="props.currentInstanceUrl"
        :emojis="props.emojis"
        @openUserPage="openUserPage"
      />
    </div>
    <div class="attachments" v-if="postAtttachments">
      <PostAttachment v-for="attachment in postAtttachments" :attachment="attachment" />
    </div>
    <div class="reactions" v-if="reactions.length">
      <div class="reaction" v-for="reaction in reactions" :title="reaction.name.replace(/:/g, '')">
        <img :src="reaction.url" :alt="reaction.name" class="emoji" v-if="reaction.url" />
        <span class="emoji-default" v-else>{{ reaction.name }}</span>
      </div>
    </div>
    <div class="dote-post-actions">
      <button class="dote-post-action" @click="openPost">
        <Icon class="nn-icon size-xsmall" icon="mingcute:external-link-line" />
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.dote-post {
  position: relative;
  width: 100%;
  margin: 0;
  padding: 4px 8px;
  background-color: transparent;

  &.indent-1 {
    padding-left: 24px;
  }

  & + .dote-post {
    border-top: 1px solid var(--dote-color-white-t1);
  }
}

.attachments {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  width: 100%;
  margin-top: 4px;
}
.reactions {
  display: flex;
  gap: 4px;
  align-items: center;
  width: 100%;
  margin-top: 4px;
  overflow-x: scroll;
  overflow-y: hidden;
  border-radius: 4px;
  &::-webkit-scrollbar {
    display: none;
  }
  .reaction {
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    height: 24px;
    padding: 0 2px;
    background: transparent;
    border: none;
    border: 1px solid transparent;
    border-radius: 4px;
    &:not(.remote) {
      background-color: var(--dote-color-white-t1);
      cursor: pointer;
      &:hover {
        border: 1px solid var(--dote-color-white-t2);
      }
    }
    &.reacted {
      background-color: var(--dote-color-white-t2);
    }
    .emoji {
      height: 20px;
    }
    .emoji-default {
      color: #fff;
      font-size: 16px;
      line-height: 20px;
    }
    .count {
      margin-left: 4px;
      color: #fff;
      font-size: 12px;
      line-height: 20px;
    }
  }
}

.dote-post-actions {
  position: absolute;
  top: 4px;
  right: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 0 auto;
  padding: 0;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  visibility: hidden;
}

.dote-post:hover .dote-post-actions {
  visibility: visible;
}

.dote-post-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 20px;
  margin: 0 0 0 auto;
  padding: 0;
  color: var(---dote-color-white-t4);
  font-size: var(--post-action--font-size);
  line-height: var(--post-action--line-height);
  background-color: transparent;
  border: none;
  cursor: pointer;
  &:hover {
    background: var(--dote-color-white-t1);
    filter: brightness(0.9);
  }
  &.active {
    color: var(--post-action--active-color);
  }
  > .nn-icon {
    width: 16px;
    height: 16px;
    color: var(--dote-color-white);
  }
}
</style>
