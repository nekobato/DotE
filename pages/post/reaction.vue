<script setup lang="ts">
import { ipcInvoke, ipcSend } from "@/utils/ipc";
import { Icon } from "@iconify/vue";
import { computed, onMounted, reactive, ref } from "vue";
import HazyButton from "@/components/common/HazyButton.vue";
import hazyAlert from "@/components/common/HazyAlert.vue";

const state = reactive({
  users: [] as any,
  currentUserIndex: 0,
  post: {
    isSending: false,
    error: "",
  },
});
</script>

<template>
  <div class="post">
    <div class="post-form">
      <div class="tools">
        <img :src="currentUser?.avatarUrl" class="hazy-avatar" />
        <span class="username">{{ currentUser?.name }}@{{ currentUser?.instanceUrl.replace("https://", "") }}</span>
        <HazyButton
          class="post-action"
          @click="post"
          :disabled="text.length === 0 || state.post.isSending"
          :loading="state.post.isSending"
        >
          <span>Note</span>
          <Icon slot="icon" icon="ion:send" class="nn-icon size-xsmall" />
        </HazyButton>
      </div>
      <textarea class="nn-text-field post-field" v-model="text"></textarea>
      <hazyAlert class="mt-4" type="error" v-if="state.post.error">
        {{ state.post.error }}
      </hazyAlert>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.post {
  width: 100%;
  height: 100%;
  padding: 16px;
  background-color: var(--hazy-background-color);
}
.tools {
  display: flex;
  gap: 8px;
  align-items: center;
  .post-action {
    margin: 0 0 0 auto;
    color: rgba(0, 0, 0, 0.72);
    background-color: rgba(255, 255, 255, 0.72);
    border: 1px solid rgba(255, 255, 255, 0.72);
  }
  .username {
    color: #fff;
    font-size: 0.8rem;
  }
}
.post-field {
  width: 100%;
  min-height: 120px;
  margin: 16px 0 0;
}
</style>
