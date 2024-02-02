<script setup lang="ts">
import HazyLoading from "@/components/common/HazyLoading.vue";
import MisskeyNote from "@/components/MisskeyNote.vue";
import WindowHeader from "@/components/WindowHeader.vue";
import ErrorPost from "@/components/ErrorPost.vue";
import { Icon } from "@iconify/vue";
import { useTimelineStore } from "@/store/timeline";
import { computed, nextTick, reactive, ref } from "vue";
import { useStore } from "@/store";

const store = useStore();
const timelineStore = useTimelineStore();
const timelineContainer = ref<HTMLDivElement | null>(null);
const scrollPosition = ref(0);

const hazeOpacity = computed(() => {
  return (store.settings.hazyMode === "haze" ? store.settings.opacity || 0 : 100) / 100;
});

const state = reactive({
  isAdding: false,
});

const onScroll = () => {
  scrollPosition.value = timelineContainer.value?.scrollTop || 0;
};

const canScrollToTop = computed(() => {
  return store.settings.hazyMode === "show" && scrollPosition.value > 0;
});

const scrollToTop = () => {
  timelineContainer.value?.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};

timelineStore.$onAction((action) => {
  if (action.name === "addPost") {
    nextTick(() => {
      if (store.$state.settings.hazyMode === "haze") {
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
  <div class="page-container" :class="{ haze: store.settings.hazyMode === 'haze' }" :style="{ opacity: hazeOpacity }">
    <WindowHeader windowType="main" v-show="store.settings.hazyMode !== 'haze'" class="header" />
    <div class="hazy-timeline-container" v-if="store.errors.length">
      <div class="hazy-post-list">
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
      <div class="hazy-post-list" v-if="timelineStore.current?.posts.length">
        <MisskeyNote class="post-item" v-for="post in timelineStore.current.posts" :post="post" :key="post.id" />
      </div>
      <HazyLoading v-else />
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
  overflow-x: hidden;
  overflow-y: auto;
  scroll-behavior: smooth;
  &.is-adding {
    overflow-y: hidden;
  }
  > .hazy-post {
    &:first-of-type {
      background: none;
    }
  }
}
.hazy-post-list {
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
  background-color: var(--hazy-color-white-t4);
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
      color: var(--hazy-color-black-t5);
    }
  }
}
</style>
