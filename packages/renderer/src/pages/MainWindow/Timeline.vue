<script setup lang="ts">
import Post from "@/components/Post.vue";
import HazyLoading from "@/components/common/HazyLoading.vue";
import { useTimelineStore } from "@/store/timeline";
import { reactive, ref } from "vue";

const timelineStore = useTimelineStore();
const timelineContainer = ref<HTMLDivElement | null>(null);

const state = reactive({
  isAdding: false,
});
</script>

<template>
  <div class="page-container hazy-timeline-container">
    <div
      class="timeline-container"
      v-if="timelineStore.current?.posts.length"
      ref="timelineContainer"
      :class="{
        'is-adding': state.isAdding,
      }"
    >
      <Post class="post-item" v-for="post in timelineStore.current.posts" :post="post" />
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
  border-radius: 4px;
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
