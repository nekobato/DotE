<script setup lang="ts">
// Vue関連
import { computed, nextTick, reactive, ref, onBeforeUnmount, onMounted, watch } from "vue";

// 外部ライブラリ
import { AppBskyFeedDefs } from "@atproto/api";
import { ElDialog } from "element-plus";

// コンポーネント - 共通
import ErrorPost from "@/components/PostItem/ErrorPost.vue";
import PostList from "@/components/PostList.vue";
import ReadMore from "@/components/Readmore.vue";
import TimelineHeader from "@/components/TimelineHeader.vue";
import DoteKiraKiraLoading from "@/components/common/DoteKirakiraLoading.vue";
import ScrollToTop from "@/components/ScrollToTop.vue";

// コンポーネント - プラットフォーム固有
import BlueskyPost from "@/components/PostItem/BlueskyPost.vue";
import BlueskyNotification from "@/components/PostItem/BlueskyNotification.vue";
import MastodonNotification from "@/components/PostItem/MastodonNotification.vue";
import MastodonToot from "@/components/PostItem/MastodonToot.vue";
import MisskeyNote from "@/components/PostItem/MisskeyNote.vue";
import MisskeyNotification from "@/components/PostItem/MisskeyNotification.vue";
import MisskeyAdCarousel from "@/components/misskey/MisskeyAdCarousel.vue";

// Store関連
import { useStore } from "@/store";
import { useTimelineStore } from "@/store/timeline";
import { useBlueskyStore } from "@/store/bluesky";
import { useMastodonStore } from "@/store/mastodon";
import { useMisskeyStore } from "@/store/misskey";

// 型定義
import type {
  MastodonNotification as MastodonNotificationType,
  MastodonToot as MastodonTootType,
} from "@/types/mastodon";
import type { BlueskyNotification as BlueskyNotificationType } from "@/types/bluesky";
import { MisskeyEntities, type MisskeyNote as MisskeyNoteType } from "@shared/types/misskey";

// ユーティリティ
import {
  extractRepostReason,
  resolveBlueskyFeedItemId,
  resolveBlueskyNotificationId,
  resolveBlueskyReplyRef,
} from "@/utils/bluesky";
import { ipcSend } from "@/utils/ipc";

// Composables
import { useTimelineState } from "@/composables/useTimelineState";

const store = useStore();
const timelineStore = useTimelineStore();
const mastodonStore = useMastodonStore();
const misskeyStore = useMisskeyStore();
const blueskyStore = useBlueskyStore();

// Composables
const { scrollPosition, hazeSettings, scrollState, platformData } = useTimelineState();
const READ_INTERSECTION_RATIO = 0.3;

/**
 * Misskeyの投稿更新をトリガーします。
 */
const onMisskeyRefreshPost = (postId: string) => {
  void misskeyStore.updatePost({ postId });
};

/**
 * Misskeyのリアクション追加ウィンドウを開きます。
 */
const onMisskeyNewReaction = (postId: string) => {
  const instanceUrl = timelineStore.currentInstance?.url;
  const token = timelineStore.currentUser?.token;
  if (!instanceUrl || !token) {
    console.warn("Misskeyのリアクションウィンドウに必要な情報が不足しています", {
      instanceUrl,
      hasToken: Boolean(token),
    });
    return;
  }
  ipcSend("post:reaction", {
    instanceUrl,
    token,
    noteId: postId,
    emojis: emojis.value || [],
  });
};

/**
 * Misskeyのリアクション操作を行います。
 */
const onMisskeyReaction = (payload: { postId: string; reaction: string }) => {
  ipcSend("main:reaction", payload);
};

/**
 * Misskeyのリポストウィンドウを開きます。
 */
const onMisskeyRepost = (payload: { post: MisskeyNoteType; emojis: { name: string; url: string }[] }) => {
  ipcSend("post:repost", {
    ...payload,
    ...currentPostTargetPayload(),
  });
};

/**
 * Misskeyの返信ウィンドウを開きます。
 */
const onMisskeyReply = (note: MisskeyNoteType) => {
  ipcSend("post:create", {
    post: note,
    emojis: emojis.value,
    mode: "reply",
    replyToId: note.id,
    ...currentPostTargetPayload(),
  });
};

/**
 * Mastodonの返信ウィンドウを開きます。
 */
const onMastodonReply = (toot: MastodonTootType) => {
  ipcSend("post:create", {
    post: toot,
    mode: "reply",
    replyToId: toot.id,
    ...currentPostTargetPayload(),
  });
};

/**
 * MastodonのBoost確認画面を開きます。
 */
const onMastodonBoost = (toot: MastodonTootType) => {
  ipcSend("post:repost", {
    post: toot,
    mode: "boost",
    ...currentPostTargetPayload(),
  });
};

/**
 * Blueskyのリポスト/引用投稿ウィンドウを開きます。
 */
const onBlueskyRepost = (payload: { post: AppBskyFeedDefs.PostView }) => {
  ipcSend("post:repost", {
    ...payload,
    ...currentPostTargetPayload(),
  });
};

/**
 * Blueskyの返信ウィンドウを開きます。
 */
const onBlueskyReply = (post: AppBskyFeedDefs.FeedViewPost) => {
  ipcSend("post:create", {
    post: post.post,
    mode: "reply",
    blueskyReplyTo: resolveBlueskyReplyRef(post),
    ...currentPostTargetPayload(),
  });
};

const timelineContainer = ref<HTMLDivElement | null>(null);

// Computed values from composables
const hazeOpacity = computed(() => hazeSettings.value.opacity);
const isHazeMode = computed(() => hazeSettings.value.isEnabled);
const canScrollToTop = computed(() => scrollState.value.canScrollToTop);
const canReadMore = computed(() => scrollState.value.canReadMore);
const pendingNewPostsCount = computed(() => timelineStore.pendingNewPostsCount);
const hasPendingNewPosts = computed(() => pendingNewPostsCount.value > 0);
const emojis = computed(() => platformData.value.emojis);
const ads = computed(() => platformData.value.ads);
const timelineStyle = computed(() => ({
  opacity: hazeOpacity.value,
  ...(store.settings.font.family ? { fontFamily: store.settings.font.family } : {}),
}));

/**
 * Build the currently selected timeline target for post-window actions.
 */
const currentPostTargetPayload = () => ({
  timelineId: timelineStore.current?.id,
  userId: timelineStore.currentUser?.id,
});

type PostDeleteTarget =
  | {
      platform: "misskey";
      userId: string;
      postId: string;
    }
  | {
      platform: "mastodon";
      userId: string;
      postId: string;
      targetId: string;
      isReblog: boolean;
    }
  | {
      platform: "bluesky";
      userId: string;
      feedItemId: string;
      uri: string;
      isRepost: boolean;
    };

type TimelinePostIdSource = MisskeyNoteType | MastodonTootType | AppBskyFeedDefs.FeedViewPost;

/**
 * Resolve a stable post id across platforms.
 */
const resolvePostId = (post: TimelinePostIdSource) => {
  if ("post" in post && post.post?.uri) return resolveBlueskyFeedItemId(post);
  if ("id" in post && post.id) return post.id;
  return "";
};

/**
 * Resolve post creation time across platforms.
 */
const resolvePostCreatedAt = (post: TimelinePostIdSource) => {
  if ("createdAt" in post && typeof post.createdAt === "string") return post.createdAt;
  if ("created_at" in post && typeof post.created_at === "string") return post.created_at;
  if ("post" in post && post.post) {
    if (typeof post.post.indexedAt === "string") return post.post.indexedAt;
    const record = post.post.record as { createdAt?: string } | undefined;
    if (record?.createdAt) return record.createdAt;
  }
  return "";
};

const postIndexMap = computed(() => {
  const posts = (timelineStore.current?.posts ?? []) as TimelinePostIdSource[];
  return new Map(posts.map((post, index) => [resolvePostId(post), index]));
});

const postIdsKey = computed(() => {
  const posts = (timelineStore.current?.posts ?? []) as TimelinePostIdSource[];
  return posts.map((post) => resolvePostId(post)).join("|");
});

const lastReadIndex = computed(() => {
  const lastReadId = timelineStore.current?.lastReadId;
  if (!lastReadId) return -1;
  const index = postIndexMap.value.get(lastReadId);
  return index ?? -1;
});

/**
 * Check if a post is the current latest read marker.
 */
const isLatestReadPost = (post: TimelinePostIdSource) => {
  const postId = resolvePostId(post);
  if (!postId) return false;
  return postId === timelineStore.current?.lastReadId;
};

/**
 * Resolve CSS classes that express read state on a post.
 */
const readPostClasses = (post: TimelinePostIdSource) => {
  const isLatestRead = isLatestReadPost(post);

  return {
    "is-read": isLatestRead,
    "is-latest-read": isLatestRead,
  };
};

const deleteDialogVisible = ref(false);
const postDeleteTarget = ref<PostDeleteTarget | null>(null);
const isDeletingPost = ref(false);

/**
 * Check if this Misskey note belongs to the active account.
 */
const canDeleteMisskeyPost = (post: MisskeyNoteType) => {
  const currentUser = timelineStore.currentUser;
  const authorHost = (post.user as { host?: string | null }).host;
  return (
    timelineStore.currentInstance?.type === "misskey" &&
    Boolean(currentUser?.name) &&
    post.user.username === currentUser?.name &&
    !authorHost
  );
};

/**
 * Check if this Mastodon timeline item belongs to the active account.
 */
const canDeleteMastodonPost = (post: MastodonTootType) => {
  const currentUser = timelineStore.currentUser;
  const accountName = post.account.acct || post.account.username;
  return (
    timelineStore.currentInstance?.type === "mastodon" &&
    Boolean(currentUser?.name) &&
    accountName === currentUser?.name
  );
};

/**
 * Check if this Bluesky feed item represents my post or my repost activity.
 */
const canDeleteBlueskyPost = (post: AppBskyFeedDefs.FeedViewPost) => {
  const currentDid = timelineStore.currentUser?.blueskySession?.did;
  if (!currentDid || timelineStore.currentInstance?.type !== "bluesky") return false;

  const repostReason = extractRepostReason(post);
  if (repostReason) {
    return repostReason.by.did === currentDid && Boolean(repostReason.uri);
  }

  return post.post.author.did === currentDid;
};

/**
 * Open the post delete confirmation dialog.
 */
const openPostDeleteDialog = (target: PostDeleteTarget) => {
  postDeleteTarget.value = target;
  deleteDialogVisible.value = true;
};

/**
 * Cancel pending post deletion.
 */
const cancelPostDelete = () => {
  if (isDeletingPost.value) return;
  deleteDialogVisible.value = false;
  postDeleteTarget.value = null;
};

/**
 * Request deletion for a Misskey note.
 */
const onMisskeyDeleteRequest = (post: MisskeyNoteType) => {
  const userId = timelineStore.currentUser?.id;
  if (!userId) return;
  openPostDeleteDialog({
    platform: "misskey",
    userId,
    postId: post.id,
  });
};

/**
 * Request deletion for a Mastodon status or boost wrapper.
 */
const onMastodonDeleteRequest = (payload: { postId: string; targetId: string; isReblog: boolean }) => {
  const userId = timelineStore.currentUser?.id;
  if (!userId) return;
  openPostDeleteDialog({
    platform: "mastodon",
    userId,
    ...payload,
  });
};

/**
 * Request deletion for a Bluesky post or repost activity.
 */
const onBlueskyDeleteRequest = (payload: { feedItemId: string; uri: string; isRepost: boolean }) => {
  const userId = timelineStore.currentUser?.id;
  if (!userId) return;
  openPostDeleteDialog({
    platform: "bluesky",
    userId,
    ...payload,
  });
};

/**
 * Delete the selected post after confirmation.
 */
const confirmPostDelete = async () => {
  const target = postDeleteTarget.value;
  if (!target || isDeletingPost.value) return;

  isDeletingPost.value = true;
  try {
    const succeeded =
      target.platform === "misskey"
        ? await misskeyStore.deleteNote({ postId: target.postId, userId: target.userId })
        : target.platform === "mastodon"
          ? await mastodonStore.deleteStatus({
              postId: target.postId,
              targetId: target.targetId,
              userId: target.userId,
              isReblog: target.isReblog,
            })
          : await blueskyStore.deletePost({
              uri: target.uri,
              feedItemId: target.feedItemId,
              userId: target.userId,
              isRepost: target.isRepost,
            });

    if (succeeded) {
      deleteDialogVisible.value = false;
      postDeleteTarget.value = null;
    }
  } finally {
    isDeletingPost.value = false;
  }
};

const postObserver = ref<IntersectionObserver | null>(null);
const observedPostIds = new Set<string>();

/**
 * Reset post observer state (e.g. when switching timelines).
 */
const resetPostObserver = () => {
  postObserver.value?.disconnect();
  postObserver.value = null;
  observedPostIds.clear();
};

/**
 * Observe visible posts to update last read id.
 */
const observePosts = () => {
  if (!timelineContainer.value) return;
  if (!postObserver.value) {
    postObserver.value = new IntersectionObserver(
      (entries) => {
        const visibleIndices: number[] = [];
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < READ_INTERSECTION_RATIO) continue;
          const targetEl = entry.target as HTMLElement;
          const postId = targetEl.dataset?.postId;
          if (!postId) continue;
          const index = postIndexMap.value.get(postId);
          if (typeof index === "number") {
            visibleIndices.push(index);
          }
        }

        if (visibleIndices.length === 0) return;
        const newestVisibleIndex = Math.min(...visibleIndices);
        const currentReadIndex = lastReadIndex.value;
        if (currentReadIndex === -1 || newestVisibleIndex < currentReadIndex) {
          const posts = (timelineStore.current?.posts ?? []) as TimelinePostIdSource[];
          const target = posts[newestVisibleIndex];
          const targetId = target ? resolvePostId(target) : "";
          const targetCreatedAt = target ? resolvePostCreatedAt(target) : "";
          if (targetId) {
            timelineStore.setLastReadId(targetId, targetCreatedAt);
          }
        }
      },
      { root: timelineContainer.value, threshold: 0.3 },
    );
  }

  timelineContainer.value.querySelectorAll<HTMLElement>("[data-post-id]").forEach((element) => {
    const postId = element.dataset?.postId;
    if (!postId || observedPostIds.has(postId)) return;
    observedPostIds.add(postId);
    postObserver.value?.observe(element);
  });
};

const state = reactive({
  isAdding: false,
  isEmpty: false,
});

const onScroll = () => {
  scrollPosition.value = timelineContainer.value?.scrollTop || 0;
};

const scrollToTop = () => {
  timelineContainer.value?.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};

/**
 * Apply queued new posts while readmore is active.
 */
const applyPendingNewPosts = () => {
  timelineStore.applyPendingNewPosts();
};

timelineStore.$onAction((action) => {
  if (action.name === "addNewPost") {
    nextTick(() => {
      if (store.$state.settings.mode === "haze") {
        timelineContainer.value?.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
    });
  }
});

onMounted(() => {
  ipcSend("init-shortcuts");
});

watch(
  () => [timelineStore.currentIndex, postIdsKey.value] as const,
  async ([nextIndex], prevValue) => {
    const prevIndex = prevValue?.[0];
    if (prevIndex !== undefined && nextIndex !== prevIndex) {
      resetPostObserver();
    }
    await nextTick();
    observePosts();
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  resetPostObserver();
});
</script>

<template>
  <div class="page-container" :class="{ haze: isHazeMode }" :style="timelineStyle">
    <TimelineHeader v-show="!isHazeMode" class="header" />
    <div class="dote-timeline-container" v-if="store.errors.length">
      <div class="dote-post-list">
        <ErrorPost class="post-item" v-for="(error, index) in store.errors" :error="{ ...error, index }" />
      </div>
    </div>
    <div
      class="timeline-container"
      ref="timelineContainer"
      @scroll="onScroll"
      :class="{
        'is-adding': state.isAdding,
      }"
    >
      <PostList v-if="timelineStore.current?.posts?.length || timelineStore.current?.notifications.length">
        <button v-if="hasPendingNewPosts" class="pending-posts-button nn-button" @click="applyPendingNewPosts">
          読み込む
          <span class="pending-count">({{ pendingNewPostsCount }}件)</span>
        </button>
        <MisskeyNote
          v-if="
            timelineStore.currentInstance?.type === 'misskey' &&
            timelineStore.current.channel !== 'misskey:notifications'
          "
          v-for="post in timelineStore.current.posts"
          :class="['post-item', readPostClasses(post)]"
          :data-post-id="resolvePostId(post)"
          :post="post as MisskeyNoteType"
          :emojis="emojis"
          :currentInstanceUrl="timelineStore.currentInstance?.url"
          :hideCw="store.settings.misskey.hideCw"
          :showReactions="store.settings.misskey.showReactions"
          :lineStyle="store.settings.postStyle"
          :canDelete="canDeleteMisskeyPost(post as MisskeyNoteType)"
          theme="default"
          :key="post.id"
          @reaction="onMisskeyReaction"
          @newReaction="onMisskeyNewReaction"
          @refreshPost="onMisskeyRefreshPost"
          @repost="onMisskeyRepost"
          @reply="onMisskeyReply"
          @requestDelete="onMisskeyDeleteRequest"
        />
        <MisskeyNotification
          v-if="timelineStore.current.channel === 'misskey:notifications'"
          class="post-item"
          v-for="notification in timelineStore.current.notifications as MisskeyEntities.Notification[]"
          :notification="notification"
          :emojis="emojis"
          :currentInstanceUrl="timelineStore.currentInstance?.url"
          :hideCw="store.settings.misskey.hideCw"
          :showReactions="store.settings.misskey.showReactions"
          :lineStyle="store.settings.postStyle"
          :key="notification.id"
        />
        <MastodonToot
          v-if="
            timelineStore.currentInstance?.type === 'mastodon' &&
            timelineStore.current.channel !== 'mastodon:notifications'
          "
          v-for="toot in timelineStore.current?.posts"
          :data-post-id="resolvePostId(toot)"
          :key="toot.id"
          :class="['post-item', readPostClasses(toot)]"
          :post="toot as MastodonTootType"
          :instanceUrl="timelineStore.currentInstance?.url"
          :lineStyle="store.settings.postStyle"
          :canDelete="canDeleteMastodonPost(toot as MastodonTootType)"
          @refreshPost="mastodonStore.updatePost"
          @favourite="mastodonStore.toggleFavourite"
          @boost="onMastodonBoost"
          @reply="onMastodonReply"
          @requestDelete="onMastodonDeleteRequest"
        />
        <MastodonNotification
          v-if="timelineStore.current.channel === 'mastodon:notifications'"
          v-for="notification in timelineStore.current?.notifications as MastodonNotificationType[]"
          :key="notification.id"
          :type="notification.type"
          :by="notification.account"
          :post="notification.status"
          :lineStyle="store.settings.postStyle"
        />
        <BlueskyNotification
          v-if="timelineStore.current.channel === 'bluesky:notifications'"
          v-for="notification in timelineStore.current.notifications as BlueskyNotificationType[]"
          :key="resolveBlueskyNotificationId(notification)"
          :notification="notification"
          :lineStyle="store.settings.postStyle"
          :currentInstanceUrl="timelineStore.currentInstance?.url"
          @reply="onBlueskyReply"
          @repost="onBlueskyRepost"
        />
        <BlueskyPost
          v-if="
            timelineStore.currentInstance?.type === 'bluesky' &&
            timelineStore.current.channel !== 'bluesky:notifications'
          "
          v-for="post in timelineStore.current.posts as AppBskyFeedDefs.FeedViewPost[]"
          :data-post-id="resolvePostId(post)"
          :key="resolvePostId(post)"
          :class="['post-item', readPostClasses(post)]"
          :post="post"
          :lineStyle="store.settings.postStyle"
          :currentInstanceUrl="timelineStore.currentInstance?.url"
          :canDelete="canDeleteBlueskyPost(post)"
          @reply="onBlueskyReply"
          @repost="onBlueskyRepost"
          @like="blueskyStore.like"
          @deleteLike="blueskyStore.deleteLike"
          @requestDelete="onBlueskyDeleteRequest"
        />
      </PostList>
      <MisskeyAdCarousel v-if="ads.length" :items="ads" />
      <DoteKiraKiraLoading
        class="timeline-loading"
        v-if="!timelineStore.current?.posts?.length && !timelineStore.current?.notifications.length"
      />
      <ReadMore v-if="!isHazeMode && canReadMore" />
    </div>
    <ScrollToTop :visible="canScrollToTop" @scrollToTop="scrollToTop" />
    <ElDialog
      v-model="deleteDialogVisible"
      class="post-delete-dialog"
      title="発言を削除しますか？"
      width="320px"
      top="8vh"
      append-to-body
      destroy-on-close
      :close-on-click-modal="false"
      :close-on-press-escape="!isDeletingPost"
      :show-close="!isDeletingPost"
    >
      <template #footer>
        <div class="post-delete-dialog-actions">
          <button class="nn-button size-small" type="button" :disabled="isDeletingPost" @click="cancelPostDelete">
            やっぱりやめる
          </button>
          <button
            class="nn-button size-small type-warning"
            type="button"
            :disabled="isDeletingPost"
            @click="confirmPostDelete"
          >
            {{ isDeletingPost ? "削除中" : "削除する" }}
          </button>
        </div>
      </template>
    </ElDialog>
  </div>
</template>

<style lang="scss">
body::-webkit-scrollbar {
  display: none;
}
</style>
<style lang="scss" scoped>
.header {
  position: relative;
  z-index: 2;
}
.page-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;

  &.haze {
    pointer-events: none;
  }
}
.timeline-container {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  scroll-behavior: smooth;
  &.is-adding {
    overflow-y: hidden;
  }
  > .dote-post {
    &:first-of-type {
      background: none;
    }
  }
}
.dote-post-list {
  padding-top: 4px;
}

.pending-posts-button {
  justify-content: center;
  width: calc(100% - 16px);
  margin: 4px 8px 8px;
  font-size: var(--font-size-14);
}

.pending-count {
  margin-left: 4px;
  opacity: 0.7;
}

.post-delete-dialog-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
