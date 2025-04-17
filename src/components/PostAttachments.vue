<script setup lang="ts">
import type { Attachment } from "@shared/types/post";
import { ipcSend } from "@/utils/ipc";
import { Icon } from "@iconify/vue";
import { type PropType } from "vue";

const props = defineProps({
  attachments: {
    type: Object as PropType<Attachment[]>,
    required: true,
  },
  activeIndex: {
    type: Number as PropType<number>,
  },
  itemWidth: {
    type: Number as PropType<number>,
  },
});

const attachmentAction = (attachment: Attachment, index: number) => {
  switch (attachment.type) {
    case "url":
      ipcSend("open-url", { url: attachment.url });
      break;
    case "poll":
      ipcSend("open-url", { url: attachment.url });
      break;
    default:
      ipcSend("media-viewer:open", { media: props.attachments, index });
      break;
  }
};
</script>

<template>
  <button
    class="attachment"
    v-for="(attachment, index) in props.attachments"
    :class="[attachment.type, { active: index === props.activeIndex }]"
    @click="attachmentAction(attachment, index)"
    :style="{ width: props.itemWidth ? `${props.itemWidth}px` : '100%' }"
  >
    <Icon icon="mingcute:music-2-line" class="nn-icon size-small audio" v-if="attachment.type === 'audio'" />
    <Icon icon="mingcute:film-line" class="nn-icon size-small video" v-if="attachment.type === 'video'" />
    <Icon
      icon="mingcute:check-circle-line"
      class="nn-icon size-small poll"
      v-if="attachment.type === 'poll' && attachment.voted"
    />
    <Icon
      icon="mingcute:check-circle-fill"
      class="nn-icon size-small poll"
      v-if="attachment.type === 'poll' && !attachment.voted"
    />
    <img class="image" :src="attachment.thumbnailUrl" alt="" :tabindex="0" v-if="attachment.type === 'image'" />
    <Icon icon="mingcute:link-line" class="nn-icon size-small url" v-if="attachment.type === 'url'" />
    <div class="sensitive-filter" v-if="attachment.type === 'image' && attachment.isSensitive">
      <Icon icon="octicon:alert-16" class="nn-icon size-small attention" />
    </div>
  </button>
</template>

<style lang="scss" scoped>
.attachment {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 24px;
  padding: 0;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  cursor: pointer;
  &.video,
  &.poll {
    border: 1px solid var(--dote-color-white-t3);
  }
  &.active {
    border: 1px solid var(--dote-color-white-t5);
  }
  &:hover {
    border: 1px solid var(--dote-color-white-t3);
  }
  > .nn-icon {
    width: 16px;
    height: 16px;
    color: var(--dote-color-white-t3);
  }
}
/* opacity: 0.5; */
img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sensitive-filter {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  backdrop-filter: blur(4px);
}
</style>
