import { ipcInvoke } from "@/utils/ipc";
import { defineStore } from "pinia";
import { useStore } from ".";

export const useSettingsStore = defineStore("settings", () => {
  const store = useStore();

  const setOpacity = async (opacity: number) => {
    store.$state.settings.opacity = opacity;
    return await ipcInvoke("settings:set", { key: "opacity", value: opacity.toString() });
  };

  const setHazyMode = async (mode: "show" | "haze" | "hide") => {
    store.$state.settings.hazyMode = mode;
    return await ipcInvoke("settings:set", { key: "hazyMode", value: mode });
  };

  const setMaxPostCount = async (count: number) => {
    store.$state.settings.maxPostCount = count;
    return await ipcInvoke("settings:set", { key: "maxPostCount", value: count.toString() });
  };

  return { setOpacity, setHazyMode, setMaxPostCount };
});
