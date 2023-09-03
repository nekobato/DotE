<script setup lang="ts">
import { ipcSend } from "@/utils/ipc";
import { reactive } from "vue";
import Loading from "@/components/common/HazyLoading.vue";

const getMediaWindowSize = (maxWidth: number, maxHeight: number, width?: number, height?: number) => {
  if (!width || !height) return { width: 0, height: 0 };

  let contractionRatio = 1;
  const widthRatio = (maxWidth * 0.8) / width;
  const heightRatio = (maxHeight * 0.8) / height;
  contractionRatio = 1 > widthRatio ? widthRatio : 1;
  contractionRatio = 1 > heightRatio && widthRatio > heightRatio ? heightRatio : contractionRatio;
  return { width: width * contractionRatio, height: height * contractionRatio };
};

type Media = {
  type: "image" | "video" | "audio";
  url: string;
  thumbnailUrl: string;
  size: { width: number; height: number };
};

const state = reactive({
  media: {} as Media,
  size: { width: 0, height: 0 },
  isLoading: true,
});

const onLoad = () => {
  state.isLoading = false;
};

window.ipc.on("media-viewer:open", (event, data: Media & { maxSize: { width: number; height: number } }) => {
  state.media = data;
  state.size = getMediaWindowSize(data.maxSize.width, data.maxSize.height, data.size?.width, data.size?.height);

  if (data.type === "video") {
    // state.variants = data.variants;
  }
});

window.ipc.on("media-viewer:close", () => {
  state.media = {} as Media;
  state.size = { width: 0, height: 0 };
  state.isLoading = true;
});

const closeWindow = () => {
  ipcSend("media-viewer:close");
  // reset state
  state.media = {} as Media;
  state.size = { width: 0, height: 0 };
};
</script>

<template>
  <div class="media-viewer" @click="closeWindow">
    <video
      v-if="state.media.type === 'video'"
      :src="state.media.url"
      :width="state.size?.width || undefined"
      :height="state.size?.height || undefined"
      autoplay
      controls
      muted
      @load="onLoad"
    />
    <img
      v-if="state.media.type === 'image'"
      :src="state.media.url"
      :width="state.size?.width || undefined"
      :height="state.size?.height || undefined"
      @load="onLoad"
    />
    <Loading class="loading" v-if="state.isLoading" />
  </div>
</template>
<style lang="scss" scoped>
.media-viewer {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
img,
video {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>
