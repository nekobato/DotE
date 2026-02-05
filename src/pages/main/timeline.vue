<script setup lang="ts">
// Vue関連
import { computed, nextTick, reactive, ref, onBeforeUnmount, onMounted, watch } from "vue";

// 外部ライブラリ
import { AppBskyFeedDefs } from "@atproto/api";

// コンポーネント - 共通
import ErrorPost from "@/components/PostItem/ErrorPost.vue";
import PostList from "@/components/PostList.vue";
import ReadMore from "@/components/Readmore.vue";
import TimelineHeader from "@/components/TimelineHeader.vue";
import DoteKiraKiraLoading from "@/components/common/DoteKirakiraLoading.vue";
import ScrollToTop from "@/components/ScrollToTop.vue";

// コンポーネント - プラットフォーム固有
import BlueskyPost from "@/components/PostItem/BlueskyPost.vue";
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
import { MisskeyEntities, type MisskeyNote as MisskeyNoteType } from "@shared/types/misskey";

// ユーティリティ
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
  ipcSend("post:repost", payload);
};

/**
 * Misskeyの返信ウィンドウを開きます。
 */
const onMisskeyReply = (note: MisskeyNoteType) => {
  ipcSend("post:create", { post: note, emojis: emojis.value, mode: "reply", replyToId: note.id });
};

/**
 * Mastodonの返信ウィンドウを開きます。
 */
const onMastodonReply = (toot: MastodonTootType) => {
  ipcSend("post:create", { post: toot, mode: "reply", replyToId: toot.id });
};

/**
 * MastodonのBoost確認画面を開きます。
 */
const onMastodonBoost = (toot: MastodonTootType) => {
  ipcSend("post:repost", { post: toot, mode: "boost" });
};

const timelineContainer = ref<HTMLDivElement | null>(null);

// Computed values from composables
const hazeOpacity = computed(() => hazeSettings.value.opacity);
const isHazeMode = computed(() => hazeSettings.value.isEnabled);
const canScrollToTop = computed(() => scrollState.value.canScrollToTop);
const canReadMore = computed(() => scrollState.value.canReadMore);
const emojis = computed(() => platformData.value.emojis);
const ads = computed(() => platformData.value.ads);
const timelineStyle = computed(() => ({
  opacity: hazeOpacity.value,
  ...(store.settings.font.family ? { fontFamily: store.settings.font.family } : {}),
}));

type TimelinePostIdSource = MisskeyNoteType | MastodonTootType | AppBskyFeedDefs.FeedViewPost;

/**
 * Resolve a stable post id across platforms.
 */
const resolvePostId = (post: TimelinePostIdSource) => {
  if ("post" in post && post.post?.cid) return post.post.cid;
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
 * Check if a post should be marked as read.
 */
const isReadPost = (post: TimelinePostIdSource) => {
  const postId = resolvePostId(post);
  if (!postId) return false;
  const readIndex = lastReadIndex.value;
  if (readIndex === -1) return false;
  const index = postIndexMap.value.get(postId);
  if (index === undefined) return false;
  const lastReadAt = timelineStore.current?.lastReadAt;
  if (lastReadAt) {
    const postCreatedAt = resolvePostCreatedAt(post);
    if (postCreatedAt) {
      const postTime = Date.parse(postCreatedAt);
      const lastTime = Date.parse(lastReadAt);
      if (!Number.isNaN(postTime) && !Number.isNaN(lastTime) && postTime > lastTime) {
        return false;
      }
    }
  }
  return index <= readIndex;
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
          if (!entry.isIntersecting) continue;
          const targetEl = entry.target as HTMLElement;
          const postId = targetEl.dataset?.postId;
          if (!postId) continue;
          const index = postIndexMap.value.get(postId);
          if (typeof index === "number") {
            visibleIndices.push(index);
          }
        }

        if (visibleIndices.length === 0) return;
        const oldestVisibleIndex = Math.max(...visibleIndices);
        const currentReadIndex = lastReadIndex.value;
        if (currentReadIndex === -1 || oldestVisibleIndex > currentReadIndex) {
          const posts = (timelineStore.current?.posts ?? []) as TimelinePostIdSource[];
          const target = posts[oldestVisibleIndex];
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
  async ([nextIndex], [prevIndex]) => {
    if (nextIndex !== prevIndex) {
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
        <MisskeyNote
          v-if="
            timelineStore.currentInstance?.type === 'misskey' &&
            timelineStore.current.channel !== 'misskey:notifications'
          "
          v-for="post in timelineStore.current.posts"
          :class="['post-item', { 'is-read': isReadPost(post) }]"
          :data-post-id="resolvePostId(post)"
          :post="post as MisskeyNoteType"
          :emojis="emojis"
          :currentInstanceUrl="timelineStore.currentInstance?.url"
          :hideCw="store.settings.misskey.hideCw"
          :showReactions="store.settings.misskey.showReactions"
          :lineStyle="store.settings.postStyle"
          theme="default"
          :key="post.id"
          @reaction="onMisskeyReaction"
          @newReaction="onMisskeyNewReaction"
          @refreshPost="onMisskeyRefreshPost"
          @repost="onMisskeyRepost"
          @reply="onMisskeyReply"
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
          :class="['post-item', { 'is-read': isReadPost(toot) }]"
          :post="toot as MastodonTootType"
          :instanceUrl="timelineStore.currentInstance?.url"
          :lineStyle="store.settings.postStyle"
          @refreshPost="mastodonStore.updatePost"
          @favourite="mastodonStore.toggleFavourite"
          @boost="onMastodonBoost"
          @reply="onMastodonReply"
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
        <BlueskyPost
          v-if="timelineStore.currentInstance?.type === 'bluesky'"
          v-for="post in timelineStore.current.posts as AppBskyFeedDefs.FeedViewPost[]"
          :data-post-id="resolvePostId(post)"
          :key="post.post.cid"
          :class="['post-item', { 'is-read': isReadPost(post) }]"
          :post="post"
          :lineStyle="store.settings.postStyle"
          :currentInstanceUrl="timelineStore.currentInstance?.url"
          @like="blueskyStore.like"
          @deleteLike="blueskyStore.deleteLike"
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
</style>
