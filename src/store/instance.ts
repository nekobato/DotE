import { ipcInvoke } from "@/utils/ipc";
import { defineStore } from "pinia";
import { useStore } from ".";
import type { MisskeyEntities } from "@shared/types/misskey";
import { MastodonInstanceApiResponse } from "@/types/mastodon";
import { InstanceType } from "@shared/types/store";
import type { ApiErrorPayload } from "@shared/types/ipc";

export const useInstanceStore = defineStore("instance", () => {
  const store = useStore();

  const handleApiError = (error: ApiErrorPayload, fallback: string) => {
    store.$state.errors.push({
      message: fallback,
    });
    console.error(fallback, error);
  };

  const createInstance = async (url: string, type: InstanceType) => {
    switch (type) {
      case "misskey":
        return await createMisskeyInstance(url);
      case "mastodon":
        return await createMastodonInstance(url);
      case "bluesky":
        return await createBlueskyInstance(url);
    }
  };

  const createMisskeyInstance = async (instanceUrl: string) => {
    const metaResult = await getMisskeyInstanceMeta(instanceUrl);
    if (!metaResult.ok) {
      handleApiError(metaResult.error, `${instanceUrl} の Misskey メタ情報取得に失敗しました`);
      return;
    }
    const meta = metaResult.data;
    const result = await ipcInvoke("db:upsert-instance", {
      type: "misskey",
      url: meta.uri,
      name: meta.name || "",
      iconUrl: meta.iconUrl || "",
    });
    return result;
  };

  const createMastodonInstance = async (instanceUrl: string) => {
    const metaResult = await ipcInvoke("api", {
      method: "mastodon:getInstance",
      instanceUrl,
    });
    if (!metaResult.ok) {
      handleApiError(metaResult.error, `${instanceUrl} の Mastodon メタ情報取得に失敗しました`);
      return;
    }
    const meta = metaResult.data as MastodonInstanceApiResponse;
    const result = await ipcInvoke("db:upsert-instance", {
      type: "mastodon",
      url: "https://" + meta.domain,
      name: meta.title || "",
      iconUrl: meta.thumbnail.url || "",
    });
    return result;
  };

  const createBlueskyInstance = async (instanceUrl: string) => {
    const result = await ipcInvoke("db:upsert-instance", {
      type: "bluesky",
      url: instanceUrl,
      name: instanceUrl.replace("https://", ""),
      iconUrl: "",
    });
    return result;
  };

  const findInstance = (url: string) => {
    const instance = store.$state.instances.find((instance) => {
      return instance.url === url;
    });
    return instance;
  };

  const findInstanceByUserId = (userId: string) => {
    const user = store.$state.users.find((user) => user.id === userId);
    if (!user) return;
    const instance = store.$state.instances.find((instance) => instance.id === user.instanceId);
    return instance;
  };

  const getMisskeyInstanceMeta = async (instanceUrl: string) => {
    const result = await ipcInvoke("api", {
      method: "misskey:getMeta",
      instanceUrl,
    });
    if (!result.ok) {
      return { ok: false as const, error: result.error };
    }
    return { ok: true as const, data: result.data as MisskeyEntities.MetaResponse };
  };

  const getMastodonInstanceMeta = async (instanceUrl: string) => {
    const result = await ipcInvoke("api", {
      method: "mastodon:getInstance",
      instanceUrl,
    });
    if (!result.ok) {
      return { ok: false as const, error: result.error };
    }
    return { ok: true as const, data: result.data as MastodonInstanceApiResponse };
  };

  return { createInstance, findInstance, findInstanceByUserId, getMisskeyInstanceMeta, getMastodonInstanceMeta };
});
