<script setup lang="ts">
import { useStore } from "@/store";
import { ipcInvoke } from "@/utils/ipc";
import { Icon } from "@iconify/vue";
import { ElInput } from "element-plus";
import { computed, ref } from "vue";
import type { ApiInvokeResult } from "@shared/types/ipc";
import type { NewUser } from "@/store/users";

const store = useStore();

const DEFAULT_BLUESKY_REDIRECT_URI = "io.github.nekobato:/oauth/bluesky/callback";
const DEFAULT_BLUESKY_SCOPE = "atproto transition:generic";

const handle = ref("");
const isAuthorizing = ref(false);

const oauthSettings = computed(() => {
  const oauth = store.$state.settings.bluesky?.oauth;
  return {
    clientId: oauth?.clientId ?? "",
    redirectUri: oauth?.redirectUri ?? DEFAULT_BLUESKY_REDIRECT_URI,
    scope: oauth?.scope ?? DEFAULT_BLUESKY_SCOPE,
  };
});

const normalizedHandle = computed(() => handle.value.trim().replace(/^@+/, ""));

const deriveInstanceUrl = (input: string): string | undefined => {
  if (!input || input.startsWith("did:")) return undefined;
  const lower = input.toLowerCase();
  const parts = lower.split(".");
  if (parts.length < 2) return undefined;
  const domain = parts.slice(1).join(".");
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
const usesCustomScheme = computed(() => oauthSettings.value.redirectUri.startsWith("io.github.nekobato:/"));

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
        <p class="description">Bluesky のハンドルを入力して認証を開始いたしますわ。認証画面は外部ブラウザで開き、完了後にアプリへ戻ってまいりますの。</p>
        <div class="nn-form-item">
          <ElInput class="account-input" v-model="handle" placeholder="@handle.bsky.social" size="small" />
        </div>
        <p v-if="normalizedHandle" class="hint">接続先候補: <span>{{ fallbackInstanceUrl }}</span></p>
        <p v-if="usesCustomScheme" class="info">リダイレクト先: io.github.nekobato:/oauth/bluesky/callback</p>
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
  font-size: var(--font-size-12);
  color: rgba(255, 255, 255, 0.65);
  span {
    font-weight: 600;
    color: #fff;
  }
}
.info {
  margin: 0 0 8px;
  font-size: var(--font-size-12);
  color: rgba(255, 255, 255, 0.75);
}
.config-warning {
  margin-top: 8px;
  font-size: var(--font-size-12);
  color: #ffb347;
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
