<script setup lang="ts">
import { BlueskyPostType } from "@/types/bluesky";
import { ipcSend } from "@/utils/ipc";
import { AppBskyEmbedRecord, AppBskyFeedDefs, AppBskyFeedPost } from "@atproto/api";
import { Icon } from "@iconify/vue";
import { computed, type PropType } from "vue";

const bskyUrl = "https://bsky.app";

const props = defineProps({
  type: {
    type: String as PropType<BlueskyPostType>,
    required: true,
  },
  author: {
    type: Object as PropType<AppBskyFeedDefs.FeedViewPost["post"]["author"]>,
    required: true,
  },
  originAuthor: {
    type: Object as PropType<AppBskyFeedDefs.FeedViewPost["post"]["author"]>,
    required: false,
  },
  record: {
    type: Object as PropType<AppBskyFeedPost.Record | undefined>,
    required: false,
  },
  quotedRecord: {
    type: Object as PropType<AppBskyEmbedRecord.ViewRecord | undefined>,
    required: false,
  },
  lineStyle: {
    type: String as PropType<"all" | "line-1" | "line-2" | "line-3">,
    required: true,
  },
  currentInstanceUrl: {
    type: String as PropType<string>,
    required: false,
  },
  theme: {
    type: String as PropType<"default">,
    default: "default",
  },
});

const text = computed(() => {
  if (props.quotedRecord) {
    const quotedValue = props.quotedRecord.value;
    if (AppBskyFeedPost.isRecord(quotedValue)) {
      return quotedValue.text;
    }
  }
  if (props.record) {
    return props.record.text;
  }
  return "";
});

const openUserPage = () => {
  ipcSend("open-url", {
    url: new URL(`/profile/${props.author.handle}`, bskyUrl).toString(),
  });
};

const openOriginPage = () => {
  if (!props.originAuthor) return;
  ipcSend("open-url", {
    url: new URL(`/profile/${props.originAuthor.handle}`, bskyUrl).toString(),
  });
};
</script>

<template>
  <div class="post-content" :class="[props.type]">
    <div class="dote-post-info">
      <span class="username" @click="openUserPage">{{ props.author.displayName || props.author.handle }}</span>
      <div class="acted-by" v-if="originAuthor">
        <Icon icon="mingcute:refresh-3-line" v-if="props.type === 'repost' || props.type === 'reposted'" />
        <Icon icon="mingcute:left-fill" v-if="props.type === 'reply'" />
        <span
          class="username origin"
          v-if="originAuthor"
          v-html="originAuthor.displayName || originAuthor.handle"
          @click="openOriginPage"
        />
      </div>
    </div>
    <div class="dote-post-content" :class="[props.lineStyle]">
      <img class="dote-avatar" :src="author.avatar || ''" alt="" @click="openUserPage" />
      <img
        class="dote-avatar origin-user"
        :class="{ mini: props.type === 'repost' }"
        v-if="props.originAuthor"
        :src="props.originAuthor?.avatar || ''"
        alt=""
        @click="openOriginPage"
      />
      <div class="text-container" :class="[lineStyle]">
        <span class="text" v-html="text" />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.username {
  display: flex;
  align-items: center;
  height: 12px;
  color: var(--dote-color-white-t5);
  font-weight: bold;
  font-size: var(--font-size-10);
  line-height: var(--font-size-10);
  white-space: nowrap;
}

.dote-avatar {
  flex-shrink: 0;
  width: var(--post-avatar-size);
  height: var(--post-avatar-size);
  margin: 0 0 auto 0;
  object-fit: cover;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 50%;
  &.mini {
    position: relative;
    top: var(--post-avatar-mini-offset);
    z-index: 1;
    width: var(--post-avatar-mini-size);
    height: var(--post-avatar-mini-size);
  }

  &.origin-user {
    position: absolute;
    top: var(--post-avatar-origin-offset);
    left: 0;
    width: var(--post-avatar-origin-size);
    height: var(--post-avatar-origin-size);
    margin-left: 0;
  }

  & + * {
    margin-left: 8px;
  }
}

.dote-post-content {
  position: relative;
  display: flex;
  width: 100%;

  > .dote-avatar {
    flex-shrink: 0;
  }
}

.post-content {
  &.renote {
    height: 0;
  }
  &.quoted:not(.no-parent) {
    margin-top: 4px;
    padding-top: 4px;
    /* dashed boarder */
    background-image: linear-gradient(
      to right,
      var(--dote-color-white-t2),
      var(--dote-color-white-t2) 4px,
      transparent 4px,
      transparent 6px
    );
    background-repeat: repeat-x;
    background-size: 8px 1px;
  }
  &.quoted {
    .username,
    .dote-avatar {
      margin-left: 16px;
    }
  }
}

.dote-post-info {
  display: flex;
  align-items: flex-start;
  .acted-by {
    display: inline-flex;
    align-items: center;
    margin-left: 4px;
    opacity: 0.6;
    > svg {
      height: var(--font-size-12);
    }
    > .username {
      margin-left: 4px;
    }
  }

  & + .dote-post-content {
    margin-top: 4px;
  }
}

.dote-post-info .renote > .dote-post-body > .dote-avatar {
  width: var(--post-avatar-mini-size);
  height: var(--post-avatar-mini-size);
}

.text-container {
  min-height: calc(0.8rem * 2);
  overflow: hidden;
  color: #efefef;
  font-size: 0.6rem;
  line-height: 0.8rem;

  &.line-all {
    display: block;
    .cw,
    .text {
      display: block;
    }
  }
  &.line-1,
  &.line-2,
  &.line-3 {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    .cw,
    .text {
      display: inline;
    }

    .cw + * {
      margin-left: 8px;
    }
  }
  &.line-1 {
    -webkit-line-clamp: 1;
  }
  &.line-2 {
    -webkit-line-clamp: 2;
  }
  &.line-3 {
    -webkit-line-clamp: 3;
  }
}
</style>
