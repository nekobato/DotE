<script setup lang="ts">
import { computed } from "vue";
import MisskeyNote from "@/components/PostItem/MisskeyNote.vue";
import MisskeyNotification from "@/components/PostItem/MisskeyNotification.vue";
import MastodonToot from "@/components/PostItem/MastodonToot.vue";
import MastodonNotification from "@/components/PostItem/MastodonNotification.vue";
import BlueskyPost from "@/components/PostItem/BlueskyPost.vue";
import BlueskyNotification from "@/components/PostItem/BlueskyNotification.vue";
import { resolveBlueskyFeedItemId, resolveBlueskyNotificationId } from "@/utils/bluesky";
import type { AppBskyFeedDefs } from "@atproto/api";
import type { BlueskyNotification as BlueskyNotificationType } from "@/types/bluesky";

interface Props {
  platform?: string;
  channel: string;
  posts: any[];
  notifications?: any[];
  config: {
    hideCw: boolean;
    showReactions: boolean;
    lineStyle: "all" | "line-1" | "line-2" | "line-3";
    currentInstanceUrl?: string;
  };
  emojis?: any[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  reaction: [payload: { postId: string; reaction: string }];
  newReaction: [noteId: string];
  refreshPost: [noteId: string];
  repost: [data: any];
  reply: [data: any];
  favourite: [payload: any];
  like: [payload: any];
  deleteLike: [payload: any];
}>();

const isNotificationChannel = computed(() => {
  return props.channel.includes("notifications");
});

const shouldShowMisskeyPosts = computed(() => {
  return props.platform === "misskey" && !isNotificationChannel.value;
});

const shouldShowMisskeyNotifications = computed(() => {
  return props.platform === "misskey" && isNotificationChannel.value;
});

const shouldShowMastodonPosts = computed(() => {
  return props.platform === "mastodon" && !isNotificationChannel.value;
});

const shouldShowMastodonNotifications = computed(() => {
  return props.platform === "mastodon" && isNotificationChannel.value;
});

const shouldShowBlueskyPosts = computed(() => {
  return props.platform === "bluesky" && !isNotificationChannel.value;
});

const shouldShowBlueskyNotifications = computed(() => {
  return props.platform === "bluesky" && isNotificationChannel.value;
});

const blueskyPosts = computed<AppBskyFeedDefs.FeedViewPost[]>(() => {
  if (!shouldShowBlueskyPosts.value) return [];
  return (props.posts as AppBskyFeedDefs.FeedViewPost[]) || [];
});

const blueskyNotifications = computed<BlueskyNotificationType[]>(() => {
  if (!shouldShowBlueskyNotifications.value) return [];
  return (props.notifications as BlueskyNotificationType[]) || [];
});
</script>

<template>
  <!-- Misskey Posts -->
  <MisskeyNote
    v-if="shouldShowMisskeyPosts"
    class="post-item"
    v-for="post in posts"
    :post="post"
    :emojis="emojis || []"
    :currentInstanceUrl="config.currentInstanceUrl"
    :hideCw="config.hideCw"
    :showReactions="config.showReactions"
    :lineStyle="config.lineStyle"
    theme="default"
    :key="post.id"
    @reaction="emit('reaction', $event)"
    @newReaction="emit('newReaction', $event)"
    @refreshPost="emit('refreshPost', $event)"
    @repost="emit('repost', $event)"
  />

  <!-- Misskey Notifications -->
  <MisskeyNotification
    v-if="shouldShowMisskeyNotifications && notifications"
    class="post-item"
    v-for="notification in notifications"
    :notification="notification"
    :emojis="emojis || []"
    :currentInstanceUrl="config.currentInstanceUrl"
    :hideCw="config.hideCw"
    :showReactions="config.showReactions"
    :lineStyle="config.lineStyle"
    :key="notification.id"
  />

  <!-- Mastodon Posts -->
  <MastodonToot
    v-if="shouldShowMastodonPosts"
    v-for="toot in posts"
    :key="toot.id"
    :post="toot"
    :instanceUrl="config.currentInstanceUrl"
    :lineStyle="config.lineStyle"
    @refreshPost="emit('refreshPost', $event)"
    @favourite="emit('favourite', $event)"
  />

  <!-- Mastodon Notifications -->
  <MastodonNotification
    v-if="shouldShowMastodonNotifications && notifications"
    v-for="notification in notifications"
    :key="notification.id"
    :type="notification.type"
    :by="notification.account"
    :post="notification.status"
    :lineStyle="config.lineStyle"
  />

  <!-- Bluesky Notifications -->
  <BlueskyNotification
    v-if="shouldShowBlueskyNotifications"
    v-for="notification in blueskyNotifications"
    :key="resolveBlueskyNotificationId(notification)"
    :notification="notification"
    :lineStyle="config.lineStyle"
    :currentInstanceUrl="config.currentInstanceUrl"
    @reply="emit('reply', $event)"
    @repost="emit('repost', $event)"
  />

  <!-- Bluesky Posts -->
  <BlueskyPost
    v-if="shouldShowBlueskyPosts"
    v-for="post in blueskyPosts"
    :key="resolveBlueskyFeedItemId(post)"
    :post="post"
    :lineStyle="config.lineStyle"
    :currentInstanceUrl="config.currentInstanceUrl"
    @reply="emit('reply', $event)"
    @repost="emit('repost', $event)"
    @like="emit('like', $event)"
    @deleteLike="emit('deleteLike', $event)"
  />
</template>
