import { ipcInvoke } from "@/utils/ipc";
import { defineStore } from "pinia";
import { useStore } from ".";
import type { MisskeyEntities } from "@shared/types/misskey";
import { MastodonInstanceApiResponse } from "@/types/mastodon";

export const useInstanceStore = defineStore("instance", () => {
  const store = useStore();
  const instanceStore = useInstanceStore();

  const createInstance = async (url: string, type: "misskey" | "mastodon") => {
    switch (type) {
      case "misskey":
        return await createMisskeyInstance(url);
      case "mastodon":
        return await createMastodonInstance(url);
    }
  };

  const createMisskeyInstance = async (instanceUrl: string) => {
    const meta = await instanceStore.getMisskeyInstanceMeta(instanceUrl);
    if (!meta) return;
    const result = await ipcInvoke("db:upsert-instance", {
      type: "misskey",
      url: meta.uri,
      name: meta.name || "",
      iconUrl: meta.iconUrl || "",
    });
    return result;
  };

  const createMastodonInstance = async (instanceUrl: string) => {
    const meta: MastodonInstanceApiResponse | undefined = await ipcInvoke("api", {
      method: "mastodon:getInstance",
      instanceUrl,
    });
    if (!meta) return;
    const result = await ipcInvoke("db:upsert-instance", {
      type: "mastodon",
      url: "https://" + meta.domain,
      name: meta.title || "",
      iconUrl: meta.thumbnail.url || "",
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
    const result: MisskeyEntities.MetaResponse | null = await ipcInvoke("api", {
      method: "misskey:getMeta",
      instanceUrl,
    });
    return result;
  };

  const getMastodonInstanceMeta = async (instanceUrl: string) => {
    const result: MastodonInstanceApiResponse | null = await ipcInvoke("api", {
      method: "mastodon:getInstance",
      instanceUrl,
    });
    return result;
  };

  return { createInstance, findInstance, findInstanceByUserId, getMisskeyInstanceMeta, getMastodonInstanceMeta };
});
