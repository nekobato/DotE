import { ipcInvoke } from "@/utils/ipc";
import { entities } from "misskey-js";
import { defineStore } from "pinia";
import { useStore } from ".";
import { hazyMisskeyPermissionString } from "@/utils/hazy";

export const useInstanceStore = defineStore("instance", () => {
  const store = useStore();

  const createInstance = async (instanceUrl: string) => {
    const meta = await fetchMisskeyMeta(instanceUrl);
    const result = await ipcInvoke("db:upsert-instance", {
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

  const fetchMisskeyMeta = async (instanceUrl: string) => {
    const result: entities.DetailedInstanceMetadata = await ipcInvoke("api", {
      method: "misskey:getMeta",
      instanceUrl,
    });
    return result;
  };

  const getMisskeyAuthUrl = async (instanceUrl: string, sessionId: string) => {
    const url = new URL(`/miauth/${sessionId}`, instanceUrl);
    url.search = new URLSearchParams({
      name: "hazy",
      permission: hazyMisskeyPermissionString(),
    }).toString();
    return url.toString();
  };

  return { createInstance, findInstance, fetchMisskeyMeta, getMisskeyAuthUrl };
});
