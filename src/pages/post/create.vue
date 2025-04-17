<script setup lang="ts">
import DoteAlert from "@/components/common/DoteAlert.vue";
import DoteButton from "@/components/common/DoteButton.vue";
import type { MastodonToot as MastodonTootType } from "@/types/mastodon";
import { ipcInvoke, ipcSend } from "@/utils/ipc";
import { Icon } from "@iconify/vue";
import type { MisskeyEntities, MisskeyNote as MisskeyNoteType } from "@shared/types/misskey";
import type { Instance, Settings, Timeline, User } from "@shared/types/store";
import { ElAvatar, ElInput } from "element-plus";
import { onMounted, PropType, reactive, ref } from "vue";
import MisskeyNote from "@/components/MisskeyNote.vue";
import BlueskyPost from "@/components/BlueskyPost.vue";
import { computed } from "vue";
import { AppBskyFeedDefs } from "@atproto/api";
import type { BlueskyPost as BlueskyPostType } from "@/types/bluesky";

type PageProps = {
  post?: MisskeyNoteType | MastodonTootType | BlueskyPostType;
  emojis: MisskeyEntities.EmojiSimple[];
};

const submitTextMap = {
  note: "Note",
  renote: "Renote",
  quote: "Quote",
  toot: "Toot",
  boost: "Boost",
  post: "Post",
  repost: "Repost",
};

const props = defineProps({
  data: {
    type: Object as PropType<PageProps>,
    required: true,
  },
});

const state = reactive({
  user: undefined as User | undefined,
  timeline: undefined as Timeline | undefined,
  instance: undefined as Instance | undefined,
  settings: undefined as Settings | undefined,
  post: {
    isSending: false,
    error: "",
  },
});
const text = ref("");
const textCw = ref("");

const mastodonToot = computed(() => {
  if (state.instance?.type === "mastodon" && props.data.post) {
    return {
      account: {
        name: state.user?.name,
        host: state.instance?.url,
        avatarUrl: state.user?.avatarUrl,
      },
      reblog: props.data.post as MastodonTootType["reblog"],
    } as unknown as MastodonTootType;
  }
});

const misskeyNote = computed(() => {
  if (state.instance?.type === "misskey") {
    const renotePost = props.data.post as MisskeyNoteType;
    return {
      text: text.value,
      user: {
        name: state.user?.name,
        host: state.instance?.url,
        avatarUrl: state.user?.avatarUrl,
      },
      renote: renotePost ? (renotePost.renote && !renotePost.text ? renotePost.renote : renotePost) : null,
    } as MisskeyNoteType;
  }
  return null;
});

const blueskyPost = computed(() => {
  if (state.instance?.type === "bluesky" && state.user) {
    const quotePost = props.data.post as BlueskyPostType;
    const mockPost: AppBskyFeedDefs.FeedViewPost = {
      post: {
        uri: "",
        cid: "",
        author: {
          did: state.user.blueskySession?.did || "",
          handle: state.user.name || "",
          displayName: state.user.name || "",
          avatar: state.user.avatarUrl,
        },
        record: {
          text: text.value,
          createdAt: new Date().toISOString(),
          $type: "app.bsky.feed.post",
        },
        likeCount: 0,
        repostCount: 0,
        indexedAt: new Date().toISOString(),
        viewer: {},
      },
      reason: null,
    };

    // Add embed if we're quoting a post
    if (quotePost) {
      mockPost.post.embed = {
        $type: "app.bsky.embed.record#view",
        record: quotePost,
      };
    }

    return mockPost;
  }
  return null;
});

const submitType = computed(() => {
  if (state.instance?.type === "misskey") {
    if (misskeyNote.value?.renote) {
      return text.value ? "quote" : "renote";
    }
    return "note";
  }
  if (state.instance?.type === "mastodon") {
    if (mastodonToot.value) {
      return "boost";
    }
    return "toot";
  }
  if (state.instance?.type === "bluesky") {
    if (props.data.post) {
      return text.value ? "quote" : "repost";
    }
    return "post";
  }
  return "post";
});

const canSubmit = computed(() => {
  if (state.post.isSending) {
    return false;
  }

  if (submitType.value === "note" || submitType.value === "toot" || submitType.value === "post") {
    return text.value.length > 0;
  }
  return true;
});

const postToMisskey = async () => {
  const targetNote = props.data.post as MisskeyNoteType | null;
  const renoteId = targetNote?.renoteId && !targetNote.text ? targetNote.renoteId : targetNote?.id;

  const res = await ipcInvoke("api", {
    method: "misskey:createNote",
    instanceUrl: state.instance?.url,
    token: state.user?.token,
    i: state.user?.token,
    // visibility: "public",
    // visibleUserIds: [],
    text: text.value || null,
    cw: textCw.value || null,
    // localOnly: false,
    // noExtractMentions: false,
    // noExtractHashtags: false,
    // noExtractEmojis: false,
    // noExtractLinks: false,
    // poll: null,
    // replyId: null,
    renoteId: renoteId || null,
    // fileIds: [],
  });
  if (res.createdNote) {
    text.value = "";
    textCw.value = "";
    ipcSend("post:close");
  }
};

const postToMastodon = async () => {
  const res = await ipcInvoke("api", {
    method: "mastodon:postStatus",
    instanceUrl: state.instance?.url,
    token: state.user?.token,
    status: text.value,
    // inReplyToId: null,
    // mediaIds: [],
    // sensitive: false,
    // spoilerText: null,
    // visibility: "public",
  });
  if (res.id) {
    text.value = "";
    ipcSend("post:close");
  }
};

const postToBluesky = async () => {
  const targetPost = props.data.post as BlueskyPostType | null;
  const quoteRef = targetPost ? { uri: targetPost.uri, cid: targetPost.cid } : undefined;

  const res = await ipcInvoke("api", {
    method: "bluesky:createPost",
    instanceUrl: state.instance?.url,
    session: state.user?.blueskySession,
    text: text.value,
    quote: quoteRef,
  });

  if (res && res.uri) {
    text.value = "";
    ipcSend("post:close");
  }
};

const submit = async () => {
  state.post.isSending = true;
  try {
    if (text) {
      switch (state.instance?.type) {
        case "misskey":
          await postToMisskey();
          break;
        case "mastodon":
          await postToMastodon();
          break;
        case "bluesky":
          await postToBluesky();
          break;
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      state.post.error = error.message;
    } else {
      state.post.error = "投稿中にエラーが発生しました";
    }
  } finally {
    state.post.isSending = false;
  }
};

const onInput = (value: string) => {
  if (value[value.length - 1] === ":") {
  }
};

onMounted(async () => {
  const users = await ipcInvoke("db:get-users");
  const timelines = await ipcInvoke("db:get-timeline-all");
  const instances = await ipcInvoke("db:get-instance-all");
  state.settings = await ipcInvoke("settings:all");
  state.timeline = timelines.find((timeline: any) => timeline.available);
  state.user = users.find((user: any) => user.id === state.timeline?.userId);
  state.instance = instances.find((instance: any) => instance.id === state.user?.instanceId);
});

document.addEventListener("keydown", (e) => {
  if ((e.key === "Enter" && e.shiftKey) || (e.key === "Enter" && e.metaKey)) {
    e.preventDefault();
    if (canSubmit.value) {
      submit();
    }
  }
});
</script>

<template>
  <div class="post">
    <div class="header">
      <ElAvatar :size="32" :src="state.user?.avatarUrl" class="dote-avatar" />
      <span class="username">{{ state.user?.name }}@{{ state.instance?.url.replace("https://", "") }}</span>
      <DoteButton class="post-action size-small" @click="submit" :disabled="!canSubmit" :loading="state.post.isSending">
        <span>{{ submitTextMap[submitType] }}</span>
        <Icon slot="icon" icon="mingcute:send-line" class="nn-icon size-xsmall" />
      </DoteButton>
    </div>
    <div class="post-layout">
      <div class="post-field-container">
        <ElInput class="post-field" :autosize="{ minRows: 2 }" type="textarea" v-model="text" @input="onInput" />
        <DoteAlert class="mt-4" type="error" v-if="state.post.error">
          {{ state.post.error }}
        </DoteAlert>
      </div>
    </div>
    <div class="post-container">
      <MisskeyNote
        v-if="misskeyNote"
        class="post-item"
        :post="misskeyNote"
        :emojis="props.data.emojis || []"
        :currentInstanceUrl="state.instance?.url"
        :hideCw="false"
        :showReactions="false"
        :showActions="false"
        lineStyle="all"
        theme="default"
      />
      <BlueskyPost
        v-if="blueskyPost"
        class="post-item"
        :post="blueskyPost"
        :currentInstanceUrl="state.instance?.url"
        :showReactions="false"
        :showActions="false"
        lineStyle="all"
        theme="default"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.post {
  width: 100%;
  height: 100%;
  padding: 16px;
  background-color: var(--dote-background-color);
}
.header {
  display: flex;
  gap: 8px;
  align-items: center;
  .dote-avatar {
    border-radius: 50%;
  }
  .username {
    color: #fff;
    font-size: 0.8rem;
  }
  .post-action {
    width: 120px;
    margin: 0 0 0 auto;
    &:not(:disabled) {
      background-image: linear-gradient(90deg, #86b300, #4ab300, #4ab300);
      &:hover {
        background-position-x: 100%;
      }
    }
  }
}
.post-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  align-items: start;
}
.tools {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  margin-top: 8px;
  .tool-item {
    margin: 0;
  }
}
.post-field-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.post-field {
  width: 100%;
  margin: 8px 0 0;
}
.post-settings {
  display: flex;
  flex-direction: column;
  width: 50%;
  margin: auto 0 0 auto;
  .field-row {
    display: flex;
    align-items: center;
    width: 100%;
    span {
      color: #fff;
      font-size: 0.6rem;
    }
    .input {
      margin: 0 0 0 auto;
    }
    .select {
      width: 120px;
    }
  }
}
.post-container {
  margin-top: 16px;
  padding-top: 16px;
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

  .post-item {
    padding: 0;
  }
}
</style>
