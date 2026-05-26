<script setup lang="ts">
import type { BlueskyNotification as BlueskyNotificationType } from "@/types/bluesky";
import { ipcSend } from "@/utils/ipc";
import { AppBskyFeedDefs, AppBskyFeedPost } from "@atproto/api";
import { Icon } from "@iconify/vue";
import { computed, type PropType } from "vue";
import BlueskyPost from "./BlueskyPost.vue";

const bskyUrl = "https://bsky.app";

const props = defineProps({
  notification: {
    type: Object as PropType<BlueskyNotificationType>,
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
});

const emit = defineEmits<{
  reply: [post: AppBskyFeedDefs.FeedViewPost];
  repost: [{ post: AppBskyFeedDefs.PostView }];
}>();

const authorName = computed(() => props.notification.author.displayName || props.notification.author.handle);

const reasonLabel = computed(() => {
  switch (props.notification.reason) {
    case "like":
      return "が投稿をいいねしました";
    case "repost":
      return "が投稿をリポストしました";
    case "follow":
      return "がフォローしました";
    case "mention":
      return "がメンションしました";
    case "reply":
      return "が返信しました";
    case "quote":
      return "が引用しました";
    case "starterpack-joined":
      return "がスターターパックに参加しました";
    case "verified":
      return "が認証されました";
    case "unverified":
      return "の認証が解除されました";
    case "like-via-repost":
      return "がリポスト経由でいいねしました";
    case "repost-via-repost":
      return "がリポスト経由でリポストしました";
    case "subscribed-post":
      return "が新しい投稿をしました";
    case "contact-match":
      return "が連絡先から見つかりました";
    default:
      return `の通知: ${props.notification.reason}`;
  }
});

const reasonIcon = computed(() => {
  switch (props.notification.reason) {
    case "like":
    case "like-via-repost":
      return "mingcute:star-fill";
    case "repost":
    case "repost-via-repost":
      return "mingcute:repeat-fill";
    case "follow":
    case "contact-match":
      return "mingcute:user-add-fill";
    case "mention":
    case "reply":
      return "mingcute:message-2-line";
    case "quote":
      return "mingcute:quote-left-fill";
    case "verified":
      return "mingcute:certificate-fill";
    case "unverified":
      return "mingcute:certificate-line";
    default:
      return "mingcute:notification-line";
  }
});

const notificationPost = computed<AppBskyFeedDefs.FeedViewPost | undefined>(() => {
  if (!AppBskyFeedPost.isRecord(props.notification.record)) return undefined;

  return {
    post: {
      uri: props.notification.uri,
      cid: props.notification.cid,
      author: {
        ...props.notification.author,
        $type: "app.bsky.actor.defs#profileViewBasic",
      },
      record: props.notification.record,
      indexedAt: props.notification.indexedAt,
      replyCount: 0,
      repostCount: 0,
      likeCount: 0,
      quoteCount: 0,
      viewer: {},
    },
  };
});

const openUserPage = () => {
  ipcSend("open-url", {
    url: new URL(`/profile/${props.notification.author.handle}`, bskyUrl).toString(),
  });
};
</script>

<template>
  <div class="dote-post bluesky-notification" :class="{ unread: !props.notification.isRead }">
    <button class="notification-summary" type="button" @click="openUserPage">
      <img class="notification-avatar" :src="props.notification.author.avatar || ''" alt="" />
      <Icon class="notification-icon" :icon="reasonIcon" />
      <span class="notification-text">
        <span class="username">{{ authorName }}</span>
        <span>{{ reasonLabel }}</span>
      </span>
    </button>
    <BlueskyPost
      v-if="notificationPost"
      class="notification-post"
      :post="notificationPost"
      :lineStyle="props.lineStyle"
      :currentInstanceUrl="props.currentInstanceUrl"
      :showReactions="false"
      @reply="emit('reply', $event)"
      @repost="emit('repost', $event)"
    />
  </div>
</template>

<style lang="scss" scoped>
.bluesky-notification {
  position: relative;
  width: 100%;
  margin: 0;
  padding: 8px;
  background-color: transparent;

  &.unread {
    background-color: var(--dote-color-white-t1);
  }

  & + .dote-post {
    border-top: 1px solid var(--dote-color-white-t1);
  }
}

.notification-summary {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  min-height: 24px;
  padding: 0;
  color: var(--dote-color-white-t5);
  text-align: left;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.notification-avatar {
  flex: 0 0 20px;
  width: 20px;
  height: 20px;
  object-fit: cover;
  border-radius: 50%;
}

.notification-icon {
  flex: 0 0 14px;
  width: 14px;
  height: 14px;
  color: var(--dote-color-white-t5);
}

.notification-text {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
  font-size: var(--font-size-10);
  line-height: 1.4;
}

.username {
  color: var(--dote-color-white);
  font-weight: bold;
}

.notification-post {
  margin-top: 6px;
  padding: 0;
}
</style>
