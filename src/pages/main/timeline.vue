<script setup lang="ts">
// Vue関連
import { computed, nextTick, reactive, ref, onMounted } from "vue";

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
const pendingNewPostsCount = computed(() => timelineStore.pendingNewPostsCount);
const hasPendingNewPosts = computed(() => pendingNewPostsCount.value > 0);
const emojis = computed(() => platformData.value.emojis);
const ads = computed(() => platformData.value.ads);
const timelineStyle = computed(() => ({
  opacity: hazeOpacity.value,
  ...(store.settings.font.family ? { fontFamily: store.settings.font.family } : {}),
}));

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
          ここに読み込む
          <span class="pending-count" v-if="pendingNewPostsCount">({{ pendingNewPostsCount }}件)</span>
        </button>
        <MisskeyNote
          v-if="
            timelineStore.currentInstance?.type === 'misskey' &&
            timelineStore.current.channel !== 'misskey:notifications'
          "
          class="post-item"
          v-for="post in timelineStore.current.posts"
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
          :key="toot.id"
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
          :key="post.post.cid"
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

.pending-posts-button {
  width: calc(100% - 16px);
  margin: 4px 8px 8px;
  font-size: var(--font-size-14);
  justify-content: center;
}

.pending-count {
  margin-left: 4px;
  opacity: 0.7;
}
</style>
