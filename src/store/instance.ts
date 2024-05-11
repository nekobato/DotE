import { ipcInvoke } from "@/utils/ipc";
import { defineStore } from "pinia";
import { useStore } from ".";
import type { MisskeyEntities } from "@shared/types/misskey";

export const useInstanceStore = defineStore("instance", () => {
  const store = useStore();
  const instanceStore = useInstanceStore();

  const createInstance = async (instanceUrl: string) => {
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

  const findInstance = (url: string) => {
    const instance = store.$state.instances.find((instance) => {
      return instance.url === url;
    });
    return instance;
  };

  const getMisskeyInstanceMeta = async (instanceUrl: string) => {
    const result: MisskeyEntities.MetaResponse | null = await ipcInvoke("api", {
      method: "misskey:getMeta",
      instanceUrl,
    });
    return result;
  };

  return { createInstance, findInstance, getMisskeyInstanceMeta };
});
