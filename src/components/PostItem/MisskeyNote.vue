<script setup lang="ts">
import type { MisskeyNote, MisskeyNoteProps } from "@shared/types/misskey";
import { computed, toRef } from "vue";
import { useMisskeyNote } from "@/composables/useMisskeyNote";
import { useMisskeyReactions } from "@/composables/useMisskeyReactions";
import { usePostActions } from "@/composables/usePostActions";
import MisskeyNoteContent from "./MisskeyNoteContent.vue";
import PostAttachments from "./PostAttachments.vue";
import PostAttachmentsContainer from "./PostAttachmentsContainer.vue";
import PostActionDropdown from "./PostActionDropdown.vue";

const props = withDefaults(defineProps<MisskeyNoteProps>(), {
  emojis: () => [],
  showReactions: true,
  showActions: true,
  theme: "default",
});

const emit = defineEmits<{
  openPost: [postId: string];
  openUserPage: [user: MisskeyNote["user"]];
  refreshPost: [postId: string];
  reaction: [data: { postId: string; reaction: string }];
  newReaction: [postId: string];
  repost: [data: { post: MisskeyNote; emojis: { name: string; url: string }[] }];
  reply: [post: MisskeyNote];
}>();

// Composables
const postRef = toRef(props, "post");
const emojisRef = toRef(props, "emojis");

const { postType, renoteType, postAttachments, setupStreamSubscription } = useMisskeyNote(
  postRef,
  props.currentInstanceUrl,
);

const { reactions, isReacted } = useMisskeyReactions(postRef, emojisRef);

const {
  openPost: openPostAction,
  openUserPage: openUserPageAction,
  refreshPost: refreshPostAction,
  openReactionWindow: openReactionWindowAction,
  openRepostWindow: openRepostWindowAction,
  onClickReaction: onClickReactionAction,
} = usePostActions(props.currentInstanceUrl);

// Event handlers
const refreshPost = () => {
  refreshPostAction(props.post.id, emit);
};

const openPost = () => {
  openPostAction(props.post.id);
};

const openUserPage = (user: MisskeyNote["user"]) => {
  openUserPageAction(user);
};

const openReactionWindow = () => {
  openReactionWindowAction(props.post.id, emit);
};

const openRepostWindow = () => {
  openRepostWindowAction(props.post, props.emojis, emit);
};

const onClickReaction = (postId: string, reaction: string) => {
  onClickReactionAction(postId, reaction, emit);
};

/**
 * Emit reply action for this note.
 */
const replyToPost = () => {
  emit("reply", props.post);
};

const postActions = computed(() => [
  ...(props.showActions
    ? [
        { command: "refresh", icon: "mingcute:refresh-1-fill", label: "更新" },
        { command: "reply", icon: "mingcute:message-2-line", label: "返信" },
        { command: "reaction", icon: "mingcute:add-fill", label: "リアクション" },
        { command: "repost", icon: "mingcute:repeat-fill", label: "リポスト" },
      ]
    : []),
  { command: "open", icon: "mingcute:external-link-line", label: "投稿を開く" },
]);

/**
 * Run a selected Misskey post action from the dropdown command.
 */
const runPostAction = (command: string) => {
  switch (command) {
    case "refresh":
      refreshPost();
      return;
    case "reply":
      replyToPost();
      return;
    case "reaction":
      openReactionWindow();
      return;
    case "repost":
      openRepostWindow();
      return;
    case "open":
      openPost();
      return;
    default:
      return;
  }
};

// Setup stream subscription
setupStreamSubscription();
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
        :note="props.post.renote as MisskeyNote"
        :originNote="props.post"
        :type="renoteType"
        :lineStyle="props.lineStyle"
        :currentInstanceUrl="props.currentInstanceUrl"
        :hideCw="props.hideCw"
        :emojis="props.emojis"
        @openUserPage="openUserPage"
      />
    </div>
    <PostAttachmentsContainer v-if="postAttachments?.length" class="attachments">
      <PostAttachments :attachments="postAttachments" />
    </PostAttachmentsContainer>
    <div class="reactions" v-if="props.showReactions && reactions.length">
      <button
        class="reaction"
        v-for="reaction in reactions"
        :class="{
          remote: reaction.isRemote,
          reacted: isReacted(reaction.name),
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
    <PostActionDropdown :actions="postActions" @select="runPostAction" />
  </div>
</template>

<style lang="scss" scoped>
.dote-post {
  position: relative;
  width: 100%;
  margin: 0;
  padding: 8px;
  background-color: transparent;

  &.indent-1 {
    padding-left: 24px;
  }

  & + .dote-post {
    border-top: 1px solid var(--dote-color-white-t1);
  }
}

.attachments {
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
</style>
