<script setup lang="ts">
import { ipcSend } from "@/utils/ipc";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import Loading from "@/components/common/DoteLoading.vue";
import { Icon } from "@iconify/vue";
import PostAttachments from "@/components/PostItem/PostAttachments.vue";

type Media = {
  type: "image" | "video" | "audio";
  url: string;
  thumbnailUrl: string;
  size: { width: number; height: number };
  isSensitive: boolean;
};

const media = ref<Media[]>([]);
const index = ref<number>(0);
const isLoading = ref(true);

const onReady = () => {
  isLoading.value = false;
};

window.ipc?.on(
  "media-viewer:open",
  (
    _,
    data: {
      media: Media[];
      index: number;
    },
  ) => {
    media.value = data.media;
    index.value = data.index;
  },
);

const currentMedia = computed(() => media.value[index.value]);

const imageSize = computed(() => {
  // fit to image size if 70% screen size is smaller than image
  const width = window.innerWidth * 0.7;
  const height = window.innerHeight * 0.7;
  const { width: imageWidth, height: imageHeight } = currentMedia.value.size;
  if (!imageWidth || !imageHeight) {
    return {
      width,
      height,
    };
  } else if (imageWidth > width || imageHeight > height) {
    const ratio = Math.min(width / imageWidth, height / imageHeight);
    return {
      width: imageWidth * ratio,
      height: imageHeight * ratio,
    };
  } else {
    return {
      width: imageWidth,
      height: imageHeight,
    };
  }
});

const canGoPrev = computed(() => index.value > 0);
const canGoNext = computed(() => index.value < media.value.length - 1);

const prev = () => {
  if (index.value > 0) {
    index.value -= 1;
    isLoading.value = true;
  }
};

const next = () => {
  if (index.value < media.value.length - 1) {
    index.value += 1;
    isLoading.value = true;
  }
};

const closeWindow = () => {
  media.value = [];
  isLoading.value = true;
  index.value = 0;
  ipcSend("media-viewer:close");
};

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape") {
    e.preventDefault();
    media.value = [];
    isLoading.value = true;
    ipcSend("media-viewer:close");
  }
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    prev();
  }
  if (e.key === "ArrowRight") {
    e.preventDefault();
    next();
  }
};

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <div class="media-viewer" @click="closeWindow">
    <div class="media-container" v-show="!isLoading">
      <img
        v-if="currentMedia?.type === 'image'"
        :src="currentMedia.url"
        :width="imageSize.width"
        :height="imageSize.height"
        @load="onReady"
      />
      <video
        v-if="currentMedia?.type === 'video'"
        :src="currentMedia.url"
        :width="imageSize.width"
        :height="imageSize.height"
        autoplay
        controls
        @canplay="onReady"
        @click.stop
      />
      <audio
        class="audio-player"
        v-if="currentMedia?.type === 'audio'"
        :src="currentMedia.url"
        @loadedmetadata="onReady"
        controls
        @click.stop
      />
    </div>
    <Loading class="loading" v-if="isLoading" />
    <div class="controller">
      <button class="pager prev" @click.stop="prev" v-if="canGoPrev">
        <Icon class="icon" icon="mingcute:left-line" />
      </button>
      <button class="pager next" @click.stop="next" v-if="canGoNext">
        <Icon class="icon" icon="mingcute:right-line" />
      </button>
      <div class="attachments" v-if="media.length">
        <PostAttachments :attachments="media" :activeIndex="index" :itemWidth="120" />
      </div>
    </div>
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
  background-color: var(--dote-color-black-t3);
}
img,
video,
audio {
  position: relative;
  z-index: 1;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.loading {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  margin: auto;
}
.controller {
  position: absolute;
  z-index: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  .pager {
    position: absolute;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    color: var(--dote-color-white);
    font-size: 24px;
    background-color: transparent;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s;
    &:hover {
      color: var(--dote-color-white-t2);
    }
    &.prev {
      left: 80px;
    }
    &.next {
      right: 80px;
    }
    > .icon {
      width: 32px;
      height: 32px;
      color: var(--dote-color-white);
    }
  }
  .attachments {
    position: absolute;
    right: 0;
    bottom: 80px;
    left: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    justify-content: center;
    width: 500px;
    margin: auto;
  }
}
.audio-player {
  width: 480px;
}
</style>
