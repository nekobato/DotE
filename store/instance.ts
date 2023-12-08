import { ipcInvoke } from "@/utils/ipc";
import { defineStore } from "pinia";
import { useStore } from ".";
import { hazyMisskeyPermissionString } from "@/utils/hazy";

export const useInstanceStore = defineStore("instance", () => {
  const store = useStore();

  const createInstance = async (instanceUrl: string) => {
    const instances = await store.initMisskeyMeta(instanceUrl);
    const meta = instances.find((instance) => {
      return instance.url === instanceUrl;
    })?.misskey?.meta;
    if (!meta) return;
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

  const getMisskeyAuthUrl = (instanceUrl: string, sessionId: string) => {
    const url = new URL(`/miauth/${sessionId}`, instanceUrl);
    url.search = new URLSearchParams({
      name: "hazy",
      permission: hazyMisskeyPermissionString(),
    }).toString();
    return url.toString();
  };

  return { createInstance, findInstance, getMisskeyAuthUrl };
});
