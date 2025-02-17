<script setup lang="ts">
import { BlueskyPostType } from "@/types/bluesky";
import { ipcSend } from "@/utils/ipc";
import { AppBskyEmbedRecord, AppBskyFeedDefs, AppBskyFeedPost } from "@atproto/api";
import { Record } from "@atproto/api/dist/client/types/app/bsky/feed/post";
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
    type: Object as PropType<AppBskyFeedPost.Record>,
    required: false,
  },
  embedRecord: {
    type: Object as PropType<AppBskyEmbedRecord.View>,
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

const embedText = computed(() => {
  return (props.embedRecord?.value as AppBskyFeedPost.Record)?.text;
});

const text = computed(() => {
  return props.record?.text || embedText;
});

const openUserPage = () => {
  ipcSend("open-url", {
    url: new URL(`/profile/${props.author.handle}`, bskyUrl).toString(),
  });
};
</script>

<template>
  <div class="post-content" :class="[props.type]">
    <div class="dote-post-info">
      <span class="username" @click="openUserPage">{{ props.author.displayName || props.author.handle }}</span>
      <div class="acted-by" v-if="originAuthor">
        <Icon icon="mingcute:refresh-3-line" v-if="props.type === 'reposted'" />
        <Icon icon="mingcute:left-fill" v-if="props.type === 'reply'" />
        <span
          class="username origin"
          v-if="originAuthor"
          v-html="originAuthor.displayName || originAuthor.handle"
          @click="openUserPage()"
        />
      </div>
    </div>
    <div class="dote-post-content">
      <img
        class="dote-avatar"
        :class="{ mini: props.type === 'repost' }"
        :src="author.avatar || ''"
        alt=""
        @click="openUserPage"
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
  width: 32px;
  height: 32px;
  margin: 0 0 auto 0;
  object-fit: cover;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.24);
  border-radius: 50%;
  &.mini {
    position: relative;
    top: 28px;
    z-index: 1;
    width: 20px;
    height: 20px;
  }

  &.origin-user {
    position: absolute;
    top: 12px;
    left: 0;
    width: 20px;
    height: 20px;
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
  width: 20px;
  height: 20px;
}

.text-container {
  min-height: calc(0.8rem * 2);
  overflow: hidden;
  color: #efefef;
  font-size: 0.6rem;
  line-height: 0.8rem;
}

.line-all {
  display: block;
  .cw,
  .text {
    display: block;
  }
}
.line-1,
.line-2,
.line-3 {
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
.line-1 {
  line-clamp: 1;
}
.line-2 {
  line-clamp: 2;
}
.line-3 {
  line-clamp: 3;
}
</style>
