<script setup lang="ts">
import { useStore } from "@/store";
import { ipcInvoke } from "@/utils/ipc";
import { Icon } from "@iconify/vue";
import { ElInput } from "element-plus";
import { computed, ref } from "vue";
import type { ApiInvokeResult } from "@shared/types/ipc";
import { BLUESKY_CLIENT_ID, BLUESKY_REDIRECT_URI, BLUESKY_SCOPE } from "@shared/bluesky-oauth";
import type { NewUser } from "@/store/users";

const store = useStore();

const handle = ref("");
const isAuthorizing = ref(false);

const oauthSettings = computed(() => ({
  clientId: BLUESKY_CLIENT_ID,
  redirectUri: BLUESKY_REDIRECT_URI,
  scope: BLUESKY_SCOPE,
}));

const normalizedHandle = computed(() => handle.value.trim().replace(/^@+/, ""));

/**
 * Derive a best-effort PDS origin from a handle-like input.
 * For two-label handles (e.g. nekobato.net), keep the full domain.
 */
const deriveInstanceUrl = (input: string): string | undefined => {
  if (!input || input.startsWith("did:")) return undefined;
  const lower = input.toLowerCase();
  const parts = lower.split(".").filter(Boolean);
  if (parts.length < 2) return undefined;
  const domain = parts.length >= 3 ? parts.slice(1).join(".") : parts.join(".");
  if (!domain) return undefined;
  try {
    const url = new URL(`https://${domain}`);
    return `${url.protocol}//${url.host}`;
  } catch {
    return undefined;
  }
};

const derivedInstanceUrl = computed(() => deriveInstanceUrl(normalizedHandle.value));
const fallbackInstanceUrl = computed(() => derivedInstanceUrl.value ?? "https://bsky.social");

const isConfigReady = computed(
  () => Boolean(oauthSettings.value.clientId && oauthSettings.value.redirectUri && oauthSettings.value.scope),
);
const canStart = computed(() => Boolean(normalizedHandle.value && isConfigReady.value && !isAuthorizing.value));

const unwrapApiResult = <T>(result: ApiInvokeResult<T>, message: string): T | undefined => {
  if (!result.ok) {
    store.$state.errors.push({
      message,
    });
    console.error(message, result.error);
    return undefined;
  }
  return result.data;
};

const emit = defineEmits<{
  complete: [user: NewUser];
}>();

const startOAuth = async () => {
  if (!normalizedHandle.value || !isConfigReady.value) return;

  isAuthorizing.value = true;
  try {
    const result = await ipcInvoke("api", {
      method: "bluesky:startOAuth",
      handle: normalizedHandle.value,
      instanceUrl: fallbackInstanceUrl.value,
      clientId: oauthSettings.value.clientId || undefined,
      redirectUri: oauthSettings.value.redirectUri || undefined,
      scope: oauthSettings.value.scope || undefined,
    });

    const res = unwrapApiResult(result, "Bluesky OAuth認証に失敗しました");
    if (!res) return;

    emit("complete", res as NewUser);
  } finally {
    isAuthorizing.value = false;
  }
};
</script>

<template>
  <div>
    <div class="dote-field-row as-thread indent-1 active">
      <div class="content">
        <p class="description">Bluesky Handle</p>
        <div class="nn-form-item">
          <ElInput class="account-input" v-model="handle" placeholder="@handle.bsky.social" size="small" />
        </div>
        <p v-if="!isConfigReady" class="config-warning">クライアント設定が未構成でございます。管理者様にご確認くださいませ。</p>
      </div>
      <div class="actions">
        <button
          class="nn-button size-small action"
          @click="startOAuth"
          :disabled="!canStart"
        >
          認証開始
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
    width: 220px;
  }
}
.description {
  margin: 0 0 8px;
  color: rgba(255, 255, 255, 0.85);
}
.hint {
  margin: 4px 0 8px;
  color: rgba(255, 255, 255, 0.65);
  font-size: var(--font-size-12);
  span {
    color: #fff;
    font-weight: 600;
  }
}
.info {
  margin: 0 0 8px;
  color: rgba(255, 255, 255, 0.75);
  font-size: var(--font-size-12);
}
.config-warning {
  margin-top: 8px;
  color: #ffb347;
  font-size: var(--font-size-12);
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
