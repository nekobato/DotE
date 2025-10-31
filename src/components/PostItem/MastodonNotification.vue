<script setup lang="ts">
import { MastodonToot } from "@/types/mastodon";
import { ipcSend } from "@/utils/ipc";
import { parseMastodonText } from "@/utils/mastodon";
import { Icon } from "@iconify/vue";
import { computed, type PropType } from "vue";
import PostAttachments from "./PostAttachments.vue";
import PostAttachmentsContainer from "./PostAttachmentsContainer.vue";

const props = defineProps({
  type: {
    type: String as PropType<"mention" | "favourite" | "follow" | "reblog">,
    required: true,
  },
  post: {
    type: Object as PropType<MastodonToot>,
    required: false,
  },
  by: {
    type: Object as PropType<MastodonToot["account"]>,
    required: true,
  },
  lineStyle: {
    type: String as PropType<"all" | "line-1" | "line-2" | "line-3">,
    required: true,
  },
  theme: {
    type: String as PropType<"default">,
    default: "default",
  },
});

const postType = computed(() => {
  if (props.post?.reblog) {
    return "reblog";
  }
  if (props.post?.in_reply_to_id) {
    return "reply";
  } else {
    return "note";
  }
});

const postAtttachments = computed(() => {
  const files = props.post?.media_attachments;
  return files?.map((file) => ({
    type: file.type as "image" | "video" | "audio",
    url: file.url,
    thumbnailUrl: file.preview_url || "",
    size: {
      width: file.meta.original.width,
      height: file.meta.original.height,
    },
    isSensitive: props.post?.sensitive,
  }));
});

const openPost = () => {
  props.post && ipcSend("open-url", { url: new URL(props.post.url).toString() });
};

const openUserPage = (user: MastodonToot["account"]) => {
  ipcSend("open-url", { url: user.url });
};
</script>

<template>
  <div class="dote-post">
    <div class="post-data-group">
      <div class="toot-content" :class="[postType]">
        <div class="dote-post-info">
          <span class="username" v-if="post" @click="openUserPage(post.account)">{{
            post.account.display_name || post.account.username
          }}</span>
          <div class="mentioned-by" v-if="props.by">
            <Icon icon="mingcute:left-fill" v-if="props.type === 'mention'" />
            <Icon icon="mingcute:star-fill" v-if="props.type === 'favourite'" />
            <Icon icon="mingcute:user-add-fill" v-if="props.type === 'follow'" />
            <span class="username origin" @click="openUserPage(props.by)">{{
              props.by.display_name || props.by.username
            }}</span>
          </div>
        </div>
        <div class="dote-post-content">
          <img
            v-if="props.post || props.by"
            class="dote-avatar"
            :src="props.post?.account.avatar || props.by?.avatar || ''"
            alt=""
            @click="openUserPage(props.post?.account || props.by)"
          />
          <img
            class="dote-avatar mini"
            :class="{ mini: props.type === 'mention' || props.type === 'favourite' }"
            :src="props.by.avatar || ''"
            alt=""
            @click="openUserPage(props.by)"
            v-if="props.post && props.by"
          />
          <div class="text-container" :class="[lineStyle]" v-if="post">
            <span class="text" v-html="parseMastodonText(post.content, post.emojis)" />
          </div>
          <div class="notification-text-container" :class="[lineStyle]" v-else>
            <span class="text" v-if="props.type === 'follow'">
              {{ props.by.display_name || props.by.username }} にフォローされました
            </span>
          </div>
        </div>
      </div>
    </div>
    <PostAttachmentsContainer class="attachments" v-if="postAtttachments">
      <PostAttachments :attachments="postAtttachments" />
    </PostAttachmentsContainer>
    <div class="dote-post-actions">
      <button class="dote-post-action" @click="openPost">
        <Icon class="nn-icon size-xsmall" icon="mingcute:external-link-line" />
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.dote-post {
  position: relative;
  width: 100%;
  margin: 0;
  padding: 8px;
  background-color: transparent;

  &.indent-1 {
    padding-left: 24px;
  }

  & + .dote-post {
    border-top: 1px solid var(--dote-color-white-t1);
  }
}

.attachments {
  margin-top: 4px;
}

.dote-post-actions {
  position: absolute;
  top: 4px;
  right: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 0 auto;
  padding: 0;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  visibility: hidden;

  .dote-post-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 20px;
    margin: 0 0 0 auto;
    padding: 0;
    color: var(---dote-color-white-t4);
    font-size: var(--post-action--font-size);
    line-height: var(--post-action--line-height);
    background-color: transparent;
    border: none;
    cursor: pointer;
    &:hover {
      background: var(--dote-color-white-t1);
      filter: brightness(0.9);
    }
    &.active {
      color: var(--post-action--active-color);
    }
    > .nn-icon {
      width: 16px;
      height: 16px;
      color: var(--dote-color-white);
    }
  }
}

.dote-post:hover .dote-post-actions {
  visibility: visible;
}

.toot-content {
  .post-type-mark {
    flex: 0 0 auto;
    width: 16px;
    height: 16px;
    color: #adadad;
  }
  .username {
    display: flex;
    align-items: center;
    height: 12px;
    color: var(--dote-color-white-t5);
    font-weight: bold;
    font-size: var(--font-size-10);
    line-height: var(--font-size-10);
    white-space: nowrap;

    & + * {
      margin-left: 4px;
    }
  }

  .username,
  .dote-avatar {
    cursor: pointer;
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
      position: absolute;
      top: 32px;
      left: 0;
      z-index: 1;
      width: 20px;
      height: 20px;
    }

    & + * {
      margin-left: 8px;
    }
  }

  .dote-post-content {
    display: flex;
    width: 100%;

    > .dote-avatar {
      flex-shrink: 0;
    }
  }
  .dote-post-info {
    display: flex;
    align-items: flex-start;
    .renoted-by,
    .mentioned-by,
    .favourited-by {
      display: inline-flex;
      align-items: center;
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

  .text-container {
    min-height: calc(0.8rem * 2);
    overflow: hidden;
    color: #efefef;
    font-size: 0.6rem;
    line-height: 1rem;
  }

  .notification-text-container {
    display: flex;
    align-items: center;
    min-height: calc(0.8rem * 2);
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
    min-height: 0.8rem;
    white-space: nowrap;
    line-clamp: 1;
  }
  .line-2 {
    line-clamp: 2;
  }
  .line-3 {
    line-clamp: 3;
  }
}
</style>
