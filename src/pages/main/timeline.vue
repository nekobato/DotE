<script setup lang="ts">
import ErrorPost from "@/components/ErrorPost.vue";
import MastodonToot from "@/components/MastodonToot.vue";
import MisskeyNote from "@/components/MisskeyNote.vue";
import PostList from "@/components/PostList.vue";
import ReadMore from "@/components/Readmore.vue";
import WindowHeader from "@/components/WindowHeader.vue";
import MisskeyAdCarousel from "@/components/misskey/MisskeyAdCarousel.vue";
import { useStore } from "@/store";
import { useTimelineStore } from "@/store/timeline";
import { ipcSend } from "@/utils/ipc";
import { Icon } from "@iconify/vue";
import type { MisskeyNote as MisskeyNoteType } from "@shared/types/misskey";
import type { MastodonToot as MastodonTootType } from "@/types/mastodon";
import { computed, nextTick, reactive, ref } from "vue";

const store = useStore();
const timelineStore = useTimelineStore();
const timelineContainer = ref<HTMLDivElement | null>(null);
const scrollPosition = ref(0);

const hazeOpacity = computed(() => {
  return (store.settings.mode === "haze" ? store.settings.opacity || 0 : 100) / 100;
});

const isHazeMode = computed(() => {
  return store.settings.mode === "haze";
});

const state = reactive({
  isAdding: false,
  isEmpty: false,
});

const onScroll = () => {
  scrollPosition.value = timelineContainer.value?.scrollTop || 0;
};

const canScrollToTop = computed(() => {
  return store.settings.mode === "show" && scrollPosition.value > 0;
});

const emojis = computed(() => {
  return timelineStore.currentInstance?.type === "misskey" ? timelineStore.currentInstance?.misskey?.emojis : [];
});

const ads = computed(() => {
  return timelineStore.currentInstance?.type === "misskey" &&
    !isHazeMode &&
    timelineStore.currentInstance?.misskey?.meta.ads.length > 0 &&
    timelineStore.current?.posts.length
    ? timelineStore.currentInstance?.misskey?.meta.ads
    : [];
});

const scrollToTop = () => {
  timelineContainer.value?.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};

const onReaction = ({ postId, reaction }: { postId: string; reaction: string }) => {
  ipcSend("main:reaction", {
    postId: postId,
    reaction,
  });
};

const openNewReaction = (noteId: string) => {
  ipcSend("post:reaction", {
    instanceUrl: timelineStore.currentInstance?.url,
    token: timelineStore.currentUser?.token,
    noteId: noteId,
    emojis: emojis.value,
  });
};

const refreshPost = (noteId: string) => {
  timelineStore.misskeyUpdatePost({ postId: noteId });
};

timelineStore.$onAction((action) => {
  if (action.name === "addNewPost") {
    nextTick(() => {
      if (store.$state.settings.mode === "haze") {
        console.log(timelineContainer.value);
        timelineContainer.value?.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
    });
  }
});
</script>

<template>
  <div class="page-container" :class="{ haze: isHazeMode }" :style="{ opacity: hazeOpacity }">
    <WindowHeader windowType="main" v-show="!isHazeMode" class="header" />
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
      <PostList v-if="timelineStore.current?.posts?.length">
        <MisskeyNote
          v-if="timelineStore.currentInstance?.type === 'misskey'"
          class="post-item"
          v-for="post in timelineStore.current.posts"
          :post="post as MisskeyNoteType"
          :postStyle="store.settings.postStyle"
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
        />
        <MastodonToot
          v-if="timelineStore.currentInstance?.type === 'mastodon'"
          v-for="toot in timelineStore.current?.posts"
          :key="toot.id"
          :post="toot as MastodonTootType"
          :instanceUrl="timelineStore.currentInstance?.url"
          :lineStyle="store.settings.postStyle"
          @reaction="onReaction"
          @refreshPost="timelineStore.mastodonUpdatePost"
          @favourite="timelineStore.mastodonToggleFavourite"
        />
      </PostList>
      <MisskeyAdCarousel :items="ads" />
      <ReadMore v-if="!isHazeMode" />
    </div>
    <div class="scroll-to-top" :class="{ visible: canScrollToTop }">
      <button @click="scrollToTop" class="nn-button size-small">
        <Icon icon="mingcute:arrow-to-up-fill" class="nn-icon size-small" />
      </button>
    </div>
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
  z-index: 1;
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
  width: 100%;
  height: 100%;
  padding-top: 8px;
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
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #fff;
  text-shadow: 1px 0 1px #000;
}
.scroll-to-top {
  position: fixed;
  top: 32px;
  right: 0;
  left: 0;
  display: inline-flex;
  width: 80px;
  margin: 0 auto;
  background-color: var(--dote-color-white-t4);
  border-radius: 4px;
  transform: translateY(-56px);
  opacity: 0.2;
  transition:
    transform 0.1s ease-in-out,
    opacity 0.1s ease-in-out;

  &.visible {
    transform: translateY(0);
    opacity: 1;
  }

  .nn-button {
    width: 100%;

    .nn-icon {
      color: var(--dote-color-black-t5);
    }
  }
}
</style>
