<script setup lang="ts">
import { NewUser } from "@/store/users";
import { ipcInvoke } from "@/utils/ipc";
import { AppBskyActorGetProfile, ComAtprotoServerCreateSession } from "@atproto/api";
import { Icon } from "@iconify/vue";
import { ElInput } from "element-plus";
import { ref } from "vue";

const instanceUrl = ref("bsky.social");
const identifier = ref("");
const password = ref("");
const session = ref<ComAtprotoServerCreateSession.OutputSchema | null>(null);

const emit = defineEmits<{
  complete: [user: NewUser];
}>();

const createSession = async () => {
  instanceUrl.value = /^https?:\/\//.test(instanceUrl.value) ? instanceUrl.value : "https://" + instanceUrl.value;

  const res: ComAtprotoServerCreateSession.OutputSchema = await ipcInvoke("api", {
    method: "bluesky:login",
    instanceUrl: instanceUrl.value,
    identifier: identifier.value,
    password: password.value,
  });

  session.value = res;

  await fetchProfile();
};

const fetchProfile = async () => {
  if (!session.value) return;

  const res: AppBskyActorGetProfile.OutputSchema = await ipcInvoke("api", {
    method: "bluesky:getProfile",
    instanceUrl: instanceUrl.value,
    session: session.value,
  });

  emit("complete", {
    name: res.handle,
    avatarUrl: res.avatar || "",
    instanceUrl: instanceUrl.value,
    instanceType: "bluesky",
    token: "",
    blueskySession: {
      refreshJwt: session.value.refreshJwt,
      accessJwt: session.value.accessJwt,
      did: res.did,
      handle: res.handle,
      active: true,
    },
  });
};
</script>

<template>
  <div>
    <div class="dote-field-row as-thread indent-1 active">
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
