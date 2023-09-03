import { ipcInvoke } from "@/utils/ipc";
import { entities } from "misskey-js";
import { defineStore } from "pinia";
import { useStore } from ".";
import { hazyMisskeyPermissionString } from "@/utils/hazy";

export const useInstanceStore = defineStore("instance", () => {
  const store = useStore();

  const createInstance = async (instanceUrl: string, token: string) => {
    const meta = await fetchMisskeyMeta(instanceUrl, token);
    const result = await ipcInvoke("db:upsert-instance", {
      type: "misskey",
      url: meta.uri,
      name: meta.name || "",
      iconUrl: meta.iconUrl || "",
    });
    return result;
  };

  const findInstance = (url: string) => {
    const instance = store.$state.instances.find((instance) => {
      return instance.url === url;
    });
    return instance;
  };

  const fetchMisskeyMeta = async (instanceUrl: string, token: string) => {
    const result: entities.DetailedInstanceMetadata = await ipcInvoke("api", {
      method: "misskey:getMeta",
      instanceUrl,
      token,
    }).catch(() => {
      store.$state.errors.push({
        message: `${instanceUrl}の詳細データを取得できませんでした`,
      });
    });
    return result;
  };

  const getMisskeyAuthUrl = (instanceUrl: string, sessionId: string) => {
    const url = new URL(`/miauth/${sessionId}`, instanceUrl);
    url.search = new URLSearchParams({
      name: "hazy",
      permission: hazyMisskeyPermissionString(),
    }).toString();
    return url.toString();
  };

  return { createInstance, findInstance, fetchMisskeyMeta, getMisskeyAuthUrl };
});
