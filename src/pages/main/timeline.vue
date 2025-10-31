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
const blueskyStore = useBlueskyStore();
const misskeyStore = useMisskeyStore();

// Composables
const { scrollPosition, hazeSettings, scrollState, platformData } = useTimelineState();

const timelineContainer = ref<HTMLDivElement | null>(null);

// Computed values from composables
const hazeOpacity = computed(() => hazeSettings.value.opacity);
const isHazeMode = computed(() => hazeSettings.value.isEnabled);
const canScrollToTop = computed(() => scrollState.value.canScrollToTop);
const canReadMore = computed(() => scrollState.value.canReadMore);
const emojis = computed(() => platformData.value.emojis);
const ads = computed(() => platformData.value.ads);

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

const onReaction = ({ postId, reaction }: { postId: string; reaction: string }) => {
  ipcSend("main:reaction", {
    postId,
    reaction,
  });
};

const openNewReaction = (noteId: string) => {
  ipcSend("post:reaction", {
    instanceUrl: timelineStore.currentInstance?.url,
    token: timelineStore.currentUser?.token,
    noteId,
    emojis: emojis.value,
  });
};

const openRepostWindow = (data: {
  post: MisskeyNoteType;
  emojis: { name: string; url: string }[];
}) => {
  ipcSend("post:repost", data);
};

const refreshPost = (noteId: string) => {
  misskeyStore.updatePost({ postId: noteId });
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
  <div class="page-container" :class="{ haze: isHazeMode }" :style="{ opacity: hazeOpacity }">
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
          @reaction="onReaction"
          @newReaction="openNewReaction"
          @refreshPost="refreshPost"
          @repost="openRepostWindow"
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
  display: grid;
  grid-template-rows: auto 1fr;
  width: 100%;
  height: var(--dote-app-height);
  overflow: hidden;

  &.haze {
    pointer-events: none;
  }
}
.dote-timeline-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.dote-post-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.timeline-container {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0;
  height: 100%;
  padding: 0 0 8px;
  overflow-y: scroll;
  scroll-behavior: smooth;

  &.is-adding {
    transition: none;
  }
}
.timeline-loading {
  margin: 0 auto;
}
</style>
