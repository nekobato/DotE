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

type TimelinePostIdSource = {
  id?: string;
  post?: {
    cid?: string;
  };
};

/**
 * Resolve a stable post id across platforms.
 */
const resolvePostId = (post: TimelinePostIdSource) => {
  return post.post?.cid ?? post.id ?? "";
};

const postIndexMap = computed(() => {
  const posts = (timelineStore.current?.posts ?? []) as TimelinePostIdSource[];
  return new Map(posts.map((post, index) => [resolvePostId(post), index]));
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
  return index >= readIndex;
};

const postObserver = ref<IntersectionObserver | null>(null);

/**
 * Observe visible posts to update last read id.
 */
const observePosts = () => {
  if (!timelineContainer.value) return;
  postObserver.value?.disconnect();
  postObserver.value = new IntersectionObserver(
    (entries) => {
      const visibleIndices = entries
        .filter((entry) => entry.isIntersecting)
        .map((entry) => postIndexMap.value.get((entry.target as HTMLElement).dataset.postId ?? ""))
        .filter((index): index is number => typeof index === "number");

      if (visibleIndices.length === 0) return;
      const newestVisibleIndex = Math.min(...visibleIndices);
      const currentReadIndex = lastReadIndex.value;
      if (currentReadIndex === -1 || newestVisibleIndex < currentReadIndex) {
        const posts = (timelineStore.current?.posts ?? []) as TimelinePostIdSource[];
        const target = posts[newestVisibleIndex];
        const targetId = target ? resolvePostId(target) : "";
        if (targetId) {
          timelineStore.setLastReadId(targetId);
        }
      }
    },
    { root: timelineContainer.value, threshold: 0.6 },
  );

  timelineContainer.value.querySelectorAll<HTMLElement>("[data-post-id]").forEach((element) => {
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
  () => postIndexMap.value,
  async () => {
    await nextTick();
    observePosts();
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  postObserver.value?.disconnect();
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
          :class="['post-item', { 'is-read': isReadPost(post) }]"
          v-for="post in timelineStore.current.posts"
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
