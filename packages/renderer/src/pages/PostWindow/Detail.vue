<script setup lang="ts">
import { Post } from "@/types/Post";
import { PropType, computed } from "vue";

const props = defineProps({
  data: {
    type: Object as PropType<{ post: Post }>,
    required: true,
  },
});

const post = computed(() => props.data.post);

const postAtttachments = computed(() => {
  if (props.data.post.attachments?.length) {
    return props.data.post.attachments;
  } else if (props.data.post.repost?.attachments?.length) {
    return props.data.post.repost.attachments;
  }
  return undefined;
});

console.log(post);
</script>

<template>
  <section class="detail hazy-timeline-container">
    <div class="hazy-post">
      <div class="post-body-group">
        <div class="post-data">
          <img class="hazy-avatar" :src="post.user.avatarUrl" alt="" />
          <span class="username" v-html="post.user.name" />
          <p class="hazy-post-body" v-html="post.text" />
        </div>
        <div class="repost-data" v-if="post.repost" :class="{ 'with-text': post.text }">
          <img class="hazy-avatar" :src="post.repost?.user.avatarUrl" alt="" />
          <span class="username" v-html="post.repost?.user.name" />
          <p class="hazy-post-body" v-html="post.repost?.text" />
        </div>
      </div>
      <div class="attachments" v-if="postAtttachments">
        <PostAttachment v-for="attachment in postAtttachments" :attachment="attachment" />
      </div>
      <div class="reactions">
        <button
          class="reaction"
          v-for="reaction in (post.reactions || post.repost?.reactions).sort((a, b) => b.count - a.count)"
          :class="{ remote: reaction.isRemote, reacted: isMyReaction(reaction.name, post.myReaction) }"
          @click="onClickReaction(post.id, reaction.name)"
        >
          <img :src="reaction.url" class="emoji" v-if="reaction.url" />
          <span class="emoji-default" v-else>{{ reaction.name }}</span>
          <span class="count">{{ reaction.count }}</span>
        </button>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.detail {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
.post-data,
.repost-data {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  padding-top: 8px;
}
.username {
  position: absolute;
  top: -4px;
  left: 0;
  color: rgba(255, 255, 255, 0.72);
  font-weight: 600;
  font-size: 0.5rem;
  font-style: normal;
  line-height: 0.5rem;
  white-space: nowrap;
}
.repost-data {
  margin-top: 8px;
  padding-left: 16px;
  &::before {
    position: absolute;
    left: 8px;
    display: inline-flex;
    width: 4px;
    height: 100%;
    background-color: rgba(255, 255, 255, 0.32);
    border-radius: 2px;
    content: "";
  }
  .username {
    top: -4px;
    left: 16px;
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
