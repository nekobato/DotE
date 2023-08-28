<script setup lang="ts">
import { useTimelineStore } from "@/store/timeline";
import { ErrorItem, useStore } from "@/store";
import { ipcSend } from "@/utils/ipc";
import { Icon } from "@iconify/vue";
import { PropType } from "vue";
import PostAttachment from "./PostAttachment.vue";

const store = useStore();

const props = defineProps({
  error: {
    type: Object as PropType<ErrorItem & { index: number }>,
    required: true,
  },
});

const deleteError = (index: number) => {
  delete store.$state.errors[index];
};
</script>

<template>
  <div class="hazy-post type-error">
    <div class="post-data-group">
      <div class="post-data">
        <!-- <div class="hazy-post-info">
          <span class="username" v-html="props.post.user.name" />
        </div> -->
        <div class="hazy-post-contents">
          <div class="hazy-avatar">
            <Icon icon="mingcute:alert-fill" class="nn-icon" />
          </div>
          <p class="hazy-post-body">
            {{ props.error.message }}
          </p>
        </div>
      </div>
    </div>
    <div class="hazy-post-actions">
      <button class="hazy-post-action" @click="deleteError(props.error.index)">
        <Icon class="nn-icon size-xsmall" icon="mingcute:close" />
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.username {
  color: rgba(255, 255, 255, 0.72);
  font-weight: 600;
  font-size: var(--font-size-10);
  font-style: normal;
  line-height: var(--font-size-10);
  white-space: nowrap;

  img.emoji {
    width: var(--font-size-12);
    height: var(--font-size-12);
    margin-bottom: -2px;
  }
}
.post-data,
.repost-data {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
}
.repost-data {
  margin-top: 4px;
  padding-left: 8px;
  &::before {
    position: absolute;
    left: 0;
    display: inline-flex;
    width: 4px;
    height: 100%;
    background-color: rgba(255, 255, 255, 0.32);
    border-radius: 2px;
    content: "";
  }
}

.hazy-post {
  &.repost {
    .post-data {
      .username {
        display: none;
      }
      .hazy-avatar {
        width: 20px;
        height: 20px;
      }
    }
    .repost-data {
      margin-top: -46px;
      padding-left: 12px;
      &::before {
        display: none;
      }
      .username {
        margin-left: -12px;
      }
    }
  }
}
.attachments {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  width: 100%;
  margin-top: 4px;
}
.reactions {
  display: flex;
  gap: 4px;
  width: 100%;
  margin-top: 4px;
  overflow-x: scroll;
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
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    &:not(.remote) {
      cursor: pointer;
      &:hover {
        border: 1px solid rgba(255, 255, 255, 0.4);
      }
    }
    &.reacted {
      background-color: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.4);
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
  }
}
</style>
