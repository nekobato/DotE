<script setup lang="ts">
import { ipcInvoke } from "@/utils/ipc";
import { Icon } from "@iconify/vue";
import { ElInput } from "element-plus";
import { ref } from "vue";

const instanceUrl = ref("");
const identifier = ref("");
const password = ref("");
const accessJwt = ref("");
const refreshJwt = ref("");
const handle = ref("");

const emit = defineEmits(["createUser", "close"]);

const createSession = async () => {
  instanceUrl.value = /^https?:\/\//.test(instanceUrl.value) ? instanceUrl.value : "https://" + instanceUrl.value;

  const res = await ipcInvoke("api", {
    method: "bluesky:createSession",
    instanceUrl: instanceUrl.value,
    identifier: identifier.value,
    password: password.value,
  });

  accessJwt.value = res.accessJwt;
  refreshJwt.value = res.refreshJwt;
  handle.value = res.handle;

  await fetchProfile();
};

const fetchProfile = async () => {
  const res = await ipcInvoke("api", {
    method: "bluesky:getProfile",
    instanceUrl: instanceUrl.value,
    accessJwt: accessJwt.value,
  });

  emit("createUser", {
    name: res.handle,
    avatarUrl: res.avatar,
    token: accessJwt.value,
    instanceUrl: instanceUrl.value,
    instanceType: "bluesky",
  });
};
</script>

<template>
  <div>
    <div class="dote-field-row as-thread indent-1 active" v-if="!accessJwt">
      <div class="content">
        <div class="nn-form-item">
          <ElInput class="account-input" v-model="instanceUrl" placeholder="https://..." size="small" />
        </div>
        <div class="nn-form-item">
          <ElInput class="account-input" v-model="identifier" placeholder="Account" size="small" />
        </div>
        <div class="nn-form-item">
          <ElInput class="account-input" v-model="password" placeholder="Password" size="small" />
        </div>
      </div>
      <div class="actions">
        <button class="nn-button size-small action" @click="createSession" :disabled="!instanceUrl">
          認証
          <Icon icon="ion:open" class="nn-icon size-small" />
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
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
