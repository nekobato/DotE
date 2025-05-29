<script setup lang="ts">
import { Icon } from "@iconify/vue";
import type { MisskeyNote, MisskeyNoteProps } from "@shared/types/misskey";
import { toRef } from "vue";
import { useMisskeyNote } from "@/composables/useMisskeyNote";
import { useMisskeyReactions } from "@/composables/useMisskeyReactions";
import { usePostActions } from "@/composables/usePostActions";
import MisskeyNoteContent from "./MisskeyNoteContent.vue";
import PostAttachments from "./PostAttachments.vue";
import PostAttachmentsContainer from "./PostAttachmentsContainer.vue";

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
    <div class="dote-post-actions">
      <button class="dote-post-action" @click="refreshPost" v-if="props.showActions">
        <Icon class="nn-icon size-xsmall" icon="mingcute:refresh-1-fill" />
      </button>
      <button class="dote-post-action" @click="openReactionWindow" v-if="props.showActions">
        <Icon class="nn-icon size-xsmall" icon="mingcute:add-fill" />
      </button>
      <button class="dote-post-action" @click="openRepostWindow" v-if="props.showActions">
        <Icon class="nn-icon size-xsmall" icon="mingcute:repeat-fill" />
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
