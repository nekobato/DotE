<script setup lang="ts">
import { ipcSend } from "@/utils/ipc";
import { AppBskyEmbedRecord, AppBskyFeedDefs, AppBskyFeedPost } from "@atproto/api";
import { Icon } from "@iconify/vue";
import { computed, ComputedRef, type PropType } from "vue";
import PostAttachmentsContainer from "./PostAttachmentsContainer.vue";
import PostAttachments from "./PostAttachments.vue";
import { Attachment } from "@shared/types/post";
import BlueskyPostContent from "./BlueskyPostContent.vue";
import { BlueskyPostType } from "@/types/bluesky";

const bskyUrl = "https://bsky.app";

const props = defineProps({
  post: {
    type: Object as PropType<AppBskyFeedDefs.FeedViewPost>,
    required: true,
  },
  lineStyle: {
    type: String as PropType<"all" | "line-1" | "line-2" | "line-3">,
    required: true,
  },
  currentInstanceUrl: {
    type: String as PropType<string>,
    required: false,
  },
  showReactions: {
    type: Boolean as PropType<boolean>,
    default: true,
  },
  showActions: {
    type: Boolean as PropType<boolean>,
    default: true,
  },
  theme: {
    type: String as PropType<"default">,
    default: "default",
  },
});

const emit = defineEmits<{
  repost: [{ post: AppBskyFeedDefs.FeedViewPost }];
  like: [{ uri: string; cid: string }];
  deleteLike: [{ uri: string }];
}>();

const record = computed(() => {
  return props.post.post.record as AppBskyFeedPost.Record;
});

const postType = computed<BlueskyPostType[]>(() => {
  const embedRecord = props.post.post.embed?.record as AppBskyEmbedRecord.View["record"];

  if (embedRecord && (embedRecord.value as any)?.$type === "app.bsky.feed.post") {
    if (record.value.text) {
      return ["quote", "quoted"];
    } else {
      return ["repost", "reposted"];
    }
  } else if (props.post.reply) {
    return ["reply", "replied"];
  } else {
    return ["post"];
  }
});

const originAuthor = computed(() => {
  const embedRecord = props.post.post.embed?.record as AppBskyEmbedRecord.ViewRecord;
  return embedRecord?.author;
});

const isLiked = computed(() => {
  return props.post.post.viewer?.like ? true : false;
});

const postAtttachments: ComputedRef<Attachment[]> = computed(() => {
  let attachments: Attachment[] = [];
  const embed = props.post.post.embed;
  // images
  if ((embed?.$type as string).startsWith("app.bsky.embed.images")) {
    attachments.push(
      ...(embed as any).images.map((image: any) => ({
        type: "image",
        url: image.fullsize,
        thumbnailUrl: image.thumb,
        size: {
          width: image.aspectRatio.width,
          height: image.aspectRatio.height,
        },
      })),
    );
  }

  // URL
  if ((embed?.$type as string).startsWith("app.bsky.embed.external")) {
    attachments.push({
      type: "url",
      url: (embed?.external as any).uri,
    });
  }
  return attachments;
});

const openPost = () => {
  const postId = props.post.post.uri.split("/").pop();
  // https://[instanceUrl]/profile/[author.handle]/post/[post.id]
  // TODO: どうやってWebUIのURLを取得するの
  ipcSend("open-url", {
    url: new URL(`/profile/${props.post.post.author.handle}/post/${postId}`, bskyUrl).toString(),
  });
};

const openUserPage = () => {
  ipcSend("open-url", {
    url: new URL(`/profile/${props.post.post.author.handle}`, bskyUrl).toString(),
  });
};

const openRepostWindow = () => {
  emit("repost", { post: props.post });
};

const toggleLike = () => {
  if (props.post.post.viewer?.like) {
    deleteLike();
  } else {
    like();
  }
};

const like = () => {
  emit("like", { uri: props.post.post.uri, cid: props.post.post.cid });
};

const deleteLike = () => {
  if (props.post.post.viewer?.like) {
    emit("deleteLike", { uri: props.post.post.viewer.like });
  }
};
</script>

<template>
  <div class="dote-post">
    <div class="post-data-group">
      <div class="post-content" :class="[]">
        <BlueskyPostContent
          :type="postType[0]"
          :author="props.post.post.author"
          :originAuthor="originAuthor"
          :record="record"
          :lineStyle="props.lineStyle"
          :currentInstanceUrl="props.currentInstanceUrl"
          @openUserPage="openUserPage"
        />
        <BlueskyPostContent
          v-if="post.post.embed?.record"
          :type="postType[1]"
          :author="props.post.post.author"
          :originAuthor="originAuthor"
          :record="record"
          :embedRecord="record.embed?.record as AppBskyEmbedRecord.View"
          :lineStyle="props.lineStyle"
          :currentInstanceUrl="props.currentInstanceUrl"
          @openUserPage="openUserPage"
        />
      </div>
    </div>
    <PostAttachmentsContainer class="attachments" v-if="post.post.embed">
      <PostAttachments :attachments="postAtttachments" />
    </PostAttachmentsContainer>
    <div class="reactions" v-if="props.showReactions">
      <button
        class="reaction"
        :class="{
          reacted: isLiked,
        }"
        @click="toggleLike"
        :title="`Favourites: ${props.post.post.likeCount}`"
      >
        <Icon class="star-icon" icon="mingcute:star-fill" />
        <span class="count">{{ props.post.post.likeCount }}</span>
      </button>
    </div>
    <div class="dote-post-actions">
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

.dote-avatar {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  margin: 0 0 auto 0;
  object-fit: cover;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 50%;
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
  color: #efefef;
  font-size: 0.6rem;
  line-height: 0.8rem;
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
