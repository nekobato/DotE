<script setup lang="ts">
import { ipcSend } from "@/utils/ipc";
import { Icon } from "@iconify/vue";
import { computed, type PropType } from "vue";
import PostAttachments from "./PostAttachments.vue";
import { MastodonToot } from "@/types/mastodon";
import { parseMastodonText } from "@/utils/mastodon";
import PostAttachmentsContainer from "./PostAttachmentsContainer.vue";

const props = defineProps({
  post: {
    type: Object as PropType<MastodonToot>,
    required: true,
  },
  lineStyle: {
    type: String as PropType<"all" | "line-1" | "line-2" | "line-3">,
    required: true,
  },
  instanceUrl: {
    type: String as PropType<string>,
    required: false,
  },
  showReactions: {
    type: Boolean as PropType<boolean>,
    default: true,
  },
  showActions: {
    type: Boolean as PropType<boolean>,
    default: true,
  },
  theme: {
    type: String as PropType<"default">,
    default: "default",
  },
});

const emit = defineEmits(["refreshPost", "reaction", "favourite"]);

const post = computed(() => {
  return props.post.reblog || props.post;
});

const postType = computed(() => {
  if (props.post.reblog) {
    return "reblog";
  }
  if (props.post.in_reply_to_id) {
    return "reply";
  } else {
    return "note";
  }
});

const postAtttachments = computed(() => {
  const files = props.post.media_attachments;
  return files.map((file) => ({
    type: file.type as "image" | "video" | "audio",
    url: file.url,
    thumbnailUrl: file.preview_url || "",
    size: {
      width: file.meta?.original?.width,
      height: file.meta?.original?.height,
    },
    isSensitive: props.post.sensitive,
  }));
});

const toggleFavourite = async () => {
  emit("favourite", { id: props.post.id, favourited: props.post.favourited });
};

const refreshPost = () => {
  emit("refreshPost", props.post.id);
};

const openPost = () => {
  ipcSend("open-url", { url: new URL(post.value.url).toString() });
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
          <span class="username" @click="openUserPage(post.account)">{{
            post.account.display_name || post.account.username
          }}</span>
          <div class="renoted-by" v-if="postType === 'reblog'">
            <Icon icon="mingcute:refresh-3-line" />
            <span class="username origin" @click="openUserPage(props.post.account)">{{
              props.post.account.display_name
            }}</span>
          </div>
        </div>
        <div class="dote-post-content">
          <img
            class="dote-avatar"
            :class="{ mini: postType === 'reblog', 'line-1': props.lineStyle === 'line-1' }"
            :src="props.post.account.avatar || ''"
            alt=""
            @click="openUserPage(post.account)"
          />
          <div class="text-container" :class="[lineStyle]">
            <span class="text" v-html="parseMastodonText(post.content, post.emojis)" />
          </div>
        </div>
      </div>
    </div>
    <PostAttachmentsContainer class="attachments" v-if="postAtttachments">
      <PostAttachments :attachments="postAtttachments" />
    </PostAttachmentsContainer>
    <div class="reactions" v-if="props.showReactions">
      <button
        class="reaction"
        :class="{
          reacted: props.post.favourited,
        }"
        @click="toggleFavourite"
        :title="`Favourites: ${props.post.favourites_count}`"
      >
        <Icon class="star-icon" icon="mingcute:star-fill" />
        <span class="count">{{ props.post.favourites_count }}</span>
      </button>
    </div>
    <div class="dote-post-actions">
      <button class="dote-post-action" @click="refreshPost" v-if="props.showActions">
        <Icon class="nn-icon size-xsmall" icon="mingcute:refresh-1-line" />
      </button>
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
.reactions {
  display: flex;
  gap: 4px;
  align-items: center;
  width: 100%;
  margin-top: 4px;
  overflow-x: scroll;
  overflow-y: hidden;
  border-radius: 4px;
  &::-webkit-scrollbar {
    display: none;
  }
  .reaction {
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    height: 24px;
    padding: 0 2px;
    background: transparent;
    border: none;
    border: 1px solid transparent;
    border-radius: 4px;
    &:not(.remote) {
      background-color: var(--dote-color-white-t1);
      cursor: pointer;
      &:hover {
        border: 1px solid var(--dote-color-white-t2);
      }
    }
    &.reacted {
      background-color: var(--dote-color-white-t2);
    }
    .emoji {
      height: 20px;
    }
    .emoji-default {
      color: #fff;
      font-size: 16px;
      line-height: 20px;
    }
    .count {
      margin-left: 4px;
      color: #fff;
      font-size: 12px;
      line-height: 20px;
    }
    .star-icon {
      width: 16px;
      height: 16px;
      color: var(--dote-color-white);
    }
  }
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
}

.dote-post:hover .dote-post-actions {
  visibility: visible;
}

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
    &.line-1 {
      width: 20px;
      height: 20px;

      &.mini {
        top: 24px;
        width: 16px;
        height: 16px;
      }
    }
    &.mini {
      position: relative;
      top: 28px;
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
    .renoted-by {
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

  .text-container {
    min-height: calc(0.8rem * 2);
    overflow: hidden;
    color: #efefef;
    font-size: 0.6rem;
    line-height: 1rem;
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
