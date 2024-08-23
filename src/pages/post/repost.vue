<script setup lang="ts">
import DoteAlert from "@/components/common/DoteAlert.vue";
import EmojiPicker from "@/features/misskey/post/EmojiPicker.vue";
import { ipcInvoke, ipcSend } from "@/utils/ipc";
import { Icon } from "@iconify/vue";
import type { Instance, Timeline, User } from "@shared/types/store";
import { ElAvatar, ElInput } from "element-plus";
import { onMounted, reactive, ref } from "vue";
import DoteButton from "@/components/common/DoteButton.vue";

const state = reactive({
  user: undefined as User | undefined,
  timeline: undefined as Timeline | undefined,
  instance: undefined as Instance | undefined,
  post: {
    isSending: false,
    error: "",
  },
});
const text = ref("");
const textCw = ref("");

const postToMisskey = async () => {
  const res = await ipcInvoke("api", {
    method: "misskey:createNote",
    instanceUrl: state.instance?.url,
    token: state.user?.token,
    i: state.user?.token,
    // visibility: "public",
    // visibleUserIds: [],
    text: text.value,
    cw: textCw.value || null,
    // localOnly: false,
    // noExtractMentions: false,
    // noExtractHashtags: false,
    // noExtractEmojis: false,
    // noExtractLinks: false,
    // poll: null,
    // replyId: null,
    // renoteId: null,
    // renote: null,
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

const post = async () => {
  state.post.isSending = true;
  if (text) {
    switch (state.instance?.type) {
      case "misskey":
        await postToMisskey();
        break;
      case "mastodon":
        await postToMastodon();
        break;
      default:
        break;
    }
  }
  state.post.isSending = false;
};

const onInput = (value: string) => {
  console.log(value);
  if (value[value.length - 1] === ":") {
  }
};

onMounted(async () => {
  const users = await ipcInvoke("db:get-users");
  const timelines = await ipcInvoke("db:get-timeline-all");
  const instances = await ipcInvoke("db:get-instance-all");
  state.timeline = timelines.find((timeline: any) => timeline.available);
  state.user = users.find((user: any) => user.id === state.timeline?.userId);
  state.instance = instances.find((instance: any) => instance.id === state.user?.instanceId);
});

document.addEventListener("keydown", (e) => {
  if ((e.key === "Enter" && e.shiftKey) || (e.key === "Enter" && e.metaKey)) {
    e.preventDefault();
    post();
  }
});
</script>

<template>
  <div class="post">
    <div class="header">
      <ElAvatar :size="32" :src="state.user?.avatarUrl" class="dote-avatar" />
      <span class="username">{{ state.user?.name }}@{{ state.instance?.url.replace("https://", "") }}</span>
      <DoteButton
        class="post-action size-small"
        @click="post"
        :disabled="text.length === 0 || state.post.isSending"
        :loading="state.post.isSending"
      >
        <span>Note</span>
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
  </div>
  <div class="emoji-picker-container">
    <div class="emoji-picker">
      <div class="emoji-picker-body">
        <EmojiPicker />
      </div>
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
</style>
