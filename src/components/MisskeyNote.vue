<script setup lang="ts">
import { ipcSend } from "@/utils/ipc";
import { isMyReaction, parseMisskeyAttachments } from "@/utils/misskey";
import { Icon } from "@iconify/vue";
import type { MisskeyNote } from "@shared/types/misskey";
import { computed, onBeforeUnmount, onMounted, type PropType } from "vue";
import MisskeyNoteContent from "./MisskeyNoteContent.vue";
import PostAttachments from "./PostAttachments.vue";

const props = defineProps({
  post: {
    type: Object as PropType<MisskeyNote>,
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
  showReactions: {
    type: Boolean as PropType<boolean>,
    default: true,
  },
  theme: {
    type: String as PropType<"default">,
    default: "default",
  },
});

const emit = defineEmits(["openPost", "openUserPage", "refreshPost", "reaction", "newReaction"]);

const postType = computed(() => {
  if (props.post.renote) {
    if (props.post.text) {
      return "quote";
    } else {
      return "renote";
    }
  } else if (props.post.replyId) {
    return "reply";
  } else {
    return "note";
  }
});

const renoteType = computed(() => {
  if (props.post.text) {
    return "quoted";
  } else {
    return "renoted";
  }
});

const postAtttachments = computed(() => {
  return parseMisskeyAttachments(props.post);
});

const reactions = computed(() => {
  const reactions = props.post.renote && !props.post.text ? props.post.renote.reactions : props.post.reactions;
  return Object.keys(reactions)
    .map((key) => {
      if (!/^:/.test(key)) return { name: key, count: reactions[key] };
      const reactionName = key.replace(/:|@\./g, "");
      const localEmoji = props.emojis.find((emoji) => emoji.name === reactionName);
      return {
        name: key,
        url:
          localEmoji?.url ||
          props.post.reactionEmojis[reactionName] ||
          (props.post.renote as MisskeyNote)?.reactionEmojis[reactionName] ||
          "",
        count: reactions[key],
        isRemote: !localEmoji,
      };
    })
    .sort((a, b) => b.count - a.count);
});

const refreshPost = () => {
  emit("refreshPost", props.post.id);
};

const openPost = () => {
  ipcSend("open-url", { url: new URL(`/notes/${props.post.id}`, props.currentInstanceUrl).toString() });
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

const openReactionWindow = () => {
  emit("newReaction", props.post.id);
};

const onClickReaction = (postId: string, reaction: string) => {
  emit("reaction", { postId, reaction });
};

onMounted(() => {
  ipcSend("stream:sub-note", {
    postId: props.post.id,
  });
});

onBeforeUnmount(() => {
  ipcSend("stream:unsub-note", {
    postId: props.post.id,
  });
});
</script>

<template>
  <div class="dote-post">
    <div class="post-data-group">
      <MisskeyNoteContent
        :note="props.post"
        :type="postType"
        :lineStyle="props.lineStyle"
        :currentInstanceUrl="props.currentInstanceUrl"
        :hideCw="props.hideCw"
        :emojis="props.emojis"
        @openUserPage="openUserPage"
      />
      <MisskeyNoteContent
        v-if="props.post.renote"
        :note="props.post.renote"
        :originNote="props.post"
        :type="renoteType"
        :lineStyle="props.lineStyle"
        :currentInstanceUrl="props.currentInstanceUrl"
        :hideCw="props.hideCw"
        :emojis="props.emojis"
        @openUserPage="openUserPage"
      />
    </div>
    <div class="attachments" v-if="postAtttachments">
      <PostAttachments :attachments="postAtttachments" />
    </div>
    <div class="reactions" v-if="props.showReactions">
      <button
        class="reaction"
        v-for="reaction in reactions"
        :class="{
          remote: reaction.isRemote,
          reacted: isMyReaction(reaction.name, props.post.myReaction || props.post.renote?.myReaction),
        }"
        @click="onClickReaction(props.post.id, reaction.name)"
        :title="reaction.name.replace(/:/g, '')"
        :disabled="reaction.isRemote"
      >
        <img :src="reaction.url" :alt="reaction.name" class="emoji" v-if="reaction.url" />
        <span class="emoji-default" v-else>{{ reaction.name }}</span>
        <span class="count">{{ reaction.count }}</span>
      </button>
    </div>
    <div class="dote-post-actions">
      <button class="dote-post-action" @click="refreshPost">
        <Icon class="nn-icon size-xsmall" icon="mingcute:refresh-1-line" />
      </button>
      <button class="dote-post-action" @click="openReactionWindow">
        <Icon class="nn-icon size-xsmall" icon="mingcute:add-fill" />
      </button>
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
