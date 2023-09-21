<script setup lang="ts">
import Post from "@/components/Post.vue";
import HazyLoading from "@/components/common/HazyLoading.vue";
import { useTimelineStore } from "@/store/timeline";
import { reactive, ref } from "vue";
import { useStore } from "~/store";
import { useSettingsStore } from "~/store/settings";

const store = useStore();
const timelineStore = useTimelineStore();
const timelineContainer = ref<HTMLDivElement | null>(null);

const state = reactive({
  isAdding: false,
});
</script>

<template>
  <div class="page-container hazy-timeline-container" :class="{ haze: store.settings.hazyMode === 'haze' }">
    <div
      class="timeline-container"
      v-if="timelineStore.current?.posts.length"
      ref="timelineContainer"
      :class="{
        'is-adding': state.isAdding,
      }"
    >
      <MisskeyNote class="post-item" v-for="post in timelineStore.current.posts" :post="post" />
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
  // inset grow
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 4px;

  &.haze {
    pointer-events: none;
  }
}
.timeline-container {
  width: 100%;
  height: 100%;
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
