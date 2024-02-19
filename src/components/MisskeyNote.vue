<script setup lang="ts">
import { useTimelineStore } from "@/store/timeline";
import { ipcSend } from "@/utils/ipc";
import { isMyReaction, parseMisskeyAttachments } from "@/utils/misskey";
import { Icon } from "@iconify/vue";
import type { MisskeyNote } from "@shared/types/misskey";
import { computed, onBeforeUnmount, onMounted, type PropType } from "vue";
import MisskeyNoteContent from "./MisskeyNoteContent.vue";
import PostAttachment from "./PostAttachment.vue";

const timelineStore = useTimelineStore();

const props = defineProps({
  post: {
    type: Object as PropType<MisskeyNote>,
    required: true,
  },
});

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

const postAtttachments = computed(() => {
  if (props.post.files?.length) {
    return parseMisskeyAttachments(props.post.files);
  } else if (props.post.renote?.files?.length) {
    return parseMisskeyAttachments(props.post.renote.files);
  }
  return undefined;
});

const reactions = computed(() => {
  const reactions = props.post.renote && !props.post.text ? props.post.renote.reactions : props.post.reactions;
  return Object.keys(reactions)
    .map((key) => {
      const reactionName = key.replace(/:|@\./g, "");
      const localEmoji = timelineStore.currentInstance?.misskey?.emojis.find((emoji) => emoji.name === reactionName);
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
  timelineStore.updatePost({ postId: props.post.id });
};

const openPost = () => {
  ipcSend("open-url", { url: new URL(`/notes/${props.post.id}`, timelineStore.currentInstance?.url).toString() });
};

const openReactionWindow = () => {
  ipcSend("post:reaction", {
    instanceUrl: timelineStore.currentInstance?.url,
    token: timelineStore.currentUser?.token,
    noteId: props.post.renote?.id,
    emojis: timelineStore.currentInstance?.misskey?.emojis,
  });
};

const onClickReaction = (postId: string, reaction: string) => {
  ipcSend("main:reaction", {
    postId,
    reaction,
  });
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
  <div class="hazy-post" :class="[postType]">
    <div class="post-data-group">
      <div class="post-data">
        <MisskeyNoteContent :note="props.post" :type="postType" />
      </div>
      <div class="renote-data" v-if="props.post.renote">
        <MisskeyNoteContent :note="props.post.renote" type="renoted" />
      </div>
    </div>
    <div class="attachments" v-if="postAtttachments">
      <PostAttachment v-for="attachment in postAtttachments" :attachment="attachment" />
    </div>
    <div class="reactions">
      <button
        class="reaction"
        v-for="reaction in reactions"
        :class="{
          remote: reaction.isRemote,
          reacted: isMyReaction(reaction.name, props.post.myReaction || props.post.renote?.myReaction),
        }"
        @click="onClickReaction(props.post.id, reaction.name)"
        :title="reaction.name.replace(/:/g, '')"
      >
        <img :src="reaction.url" :alt="reaction.name" class="emoji" v-if="reaction.url" />
        <span class="emoji-default" v-else>{{ reaction.name }}</span>
        <span class="count">{{ reaction.count }}</span>
      </button>
    </div>
    <div class="hazy-post-actions">
      <button class="hazy-post-action" @click="refreshPost">
        <Icon class="nn-icon size-xsmall" icon="mingcute:refresh-1-line" />
      </button>
      <button class="hazy-post-action" @click="openReactionWindow">
        <Icon class="nn-icon size-xsmall" icon="mingcute:add-fill" />
      </button>
      <button class="hazy-post-action" @click="openPost">
        <Icon class="nn-icon size-xsmall" icon="mingcute:external-link-line" />
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.post-data,
.renote-data {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.hazy-post.renote {
  .post-data {
    position: absolute;
    .hazy-avatar {
      width: 20px;
      height: 20px;
    }
  }
  .renote-data {
    margin-top: 4px;
    padding-left: 12px;
    .username {
      margin-left: -12px;
    }
  }
}
.hazy-post.quote {
  .renote-data {
    margin-top: 4px;
    padding-left: 12px;
  }
}
.attachments {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  width: 100%;
  margin-top: 4px;
}
.hazy-text-container {
  display: flex;
  flex-direction: column;
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
    border-radius: 4px;
    &:not(.remote) {
      background-color: var(--hazy-color-white-t1);
      cursor: pointer;
      &:hover {
        background-color: var(--hazy-color-white-t2);
      }
    }
    &.reacted {
      background-color: var(--hazy-color-white-t2);
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
</style>
