import { ipcInvoke } from "@/utils/ipc";
import { defineStore } from "pinia";
import { useStore } from ".";

export const useSettingsStore = defineStore("settings", () => {
  const store = useStore();

  const setOpacity = async (opacity: number) => {
    store.$state.settings.opacity = opacity;
    await ipcInvoke("settings:set", { key: "opacity", value: opacity.toString() });
  };

  const setHazyMode = async (mode: "show" | "haze" | "hide") => {
    store.$state.settings.hazyMode = mode;
    await ipcInvoke("settings:set", { key: "hazyMode", value: mode });
  };

  return { setOpacity, setHazyMode };
});
