<script setup lang="ts">
import { useStore } from "@/store";
import { doteMisskeyPermissionString } from "@/utils/dote";
import { ipcInvoke, ipcSend } from "@/utils/ipc";
import { Icon } from "@iconify/vue";
import { InstanceType } from "@shared/types/store";
import { ElInput } from "element-plus";
import { nanoid } from "nanoid/non-secure";
import { ref } from "vue";

const store = useStore();

const emit = defineEmits(["createUser", "close"]);

const instanceUrl = ref("");
const sessionId = ref("");

const getMisskeyAuthUrl = (instanceUrl: string, sessionId: string) => {
  const url = new URL(`/miauth/${sessionId}`, instanceUrl);
  url.search = new URLSearchParams({
    name: "dote",
    permission: doteMisskeyPermissionString(),
  }).toString();
  return url.toString();
};

const checkMiAuth = async () => {
  const check = await ipcInvoke("api", {
    method: "misskey:checkMiAuth",
    instanceUrl: instanceUrl.value,
    sessionId: sessionId.value,
  }).catch(() => {
    store.$state.errors.push({
      message: `${instanceUrl.value}の認証失敗`,
    });
  });

  emit("createUser", {
    name: check.user.name,
    avatarUrl: check.user.avatarUrl,
    token: check.token,
    instanceUrl: instanceUrl.value,
    instanceType: "misskey",
  });

  // 色々リセットするのが面倒なのでリロード
  setTimeout(() => {
    window.ipc.send("main:reload");
  }, 100);
};

const openMisskeyAuthLink = () => {
  sessionId.value = nanoid();
  instanceUrl.value = /^https?:\/\//.test(instanceUrl.value) ? instanceUrl.value : "https://" + instanceUrl.value;
  const url = getMisskeyAuthUrl(instanceUrl.value, sessionId.value);
  ipcSend("open-url", { url });
};
</script>

<template>
  <div>
    <!-- Input Instance URL -->
    <div class="dote-field-row as-thread indent-1 active" v-if="!sessionId.value">
      <div class="content">
        <div class="nn-form-item">
          <ElInput class="account-input" v-model="instanceUrl" placeholder="https://..." size="small" />
        </div>
      </div>
      <div class="actions">
        <button class="nn-button size-small action" @click="openMisskeyAuthLink" :disabled="!instanceUrl">
          認証
          <Icon icon="ion:open" class="nn-icon size-small" />
        </button>
      </div>
    </div>

    <!-- Confirm Auth -->
    <div class="dote-field-row as-thread indent-1 active" v-if="sessionId.value">
      <div class="content">
        <span v-if="instanceType === 'misskey'">認証できた？</span>
      </div>
      <div class="actions">
        <button class="nn-button size-small action" @click="emit('close')">戻る</button>
        <button class="nn-button size-small action" @click="checkMiAuth">認証した</button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.account-settings {
  width: 100%;
  padding: 8px 0 0;
}
.avatar {
  background-color: #fff;
}
.account {
  display: flex;
  gap: 8px;
  align-items: center;
}
.content {
  padding: 4px 0;
  color: #fff;
  font-size: var(--font-size-14);
  .account-input {
    width: 200px;
  }
}
.action {
  > svg {
    width: 16px;
    height: 16px;
  }
  &:hover {
    background: rgba(255, 255, 255, 0.4);
  }
}
</style>
