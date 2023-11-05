<script setup lang="ts">
import HazyLoading from "@/components/common/HazyLoading.vue";
import MisskeyNote from "@/components/MisskeyNote.vue";
import { useTimelineStore } from "@/store/timeline";
import { reactive, ref } from "vue";
import { useStore } from "~/store";

const store = useStore();
const timelineStore = useTimelineStore();
const timelineContainer = ref<HTMLDivElement | null>(null);

const hazeOpacity = computed(() => {
  return (store.settings.hazyMode === "haze" ? store.settings.opacity || 0 : 100) / 100;
});

const state = reactive({
  isAdding: false,
});

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
  <div
    class="page-container hazy-timeline-container"
    :class="{ haze: store.settings.hazyMode === 'haze' }"
    :style="{ opacity: hazeOpacity }"
  >
    <WindowHeader windowType="main" v-show="store.settings.hazyMode !== 'haze'" />
    <div
      class="timeline-container"
      v-if="timelineStore.current?.posts.length"
      ref="timelineContainer"
      :class="{
        'is-adding': state.isAdding,
      }"
    >
      <div class="hazy-post-list">
        <MisskeyNote class="post-item" v-for="post in timelineStore.current.posts" :post="post" :key="post.id" />
      </div>
    </div>
    <HazyLoading v-else />
  </div>
</template>

<style lang="scss">
body::-webkit-scrollbar {
  display: none;
}
</style>
<style lang="scss" scoped>
.page-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 8px;

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
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #fff;
  text-shadow: 1px 0 1px #000;
}
</style>
