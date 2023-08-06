import { ipcInvoke } from "@/utils/ipc";
import { defineStore } from "pinia";

export const useSettingsStore = defineStore({
  id: "settings",
  state: () => ({
    opacity: 50 as number,
    hazyMode: "show" as "show" | "haze" | "hide",
    showOnAllWorkspaces: true as boolean,
  }),
  actions: {
    async init() {
      const result = await ipcInvoke("settings:all");
      this.$state = {
        ...this.$state,
        ...result,
      };
    },
    async setOpacity(opacity: number) {
      this.$state.opacity = opacity;
      await ipcInvoke("settings:set", { key: "opacity", value: opacity.toString() });
    },
    async setHazyMode(mode: "show" | "haze" | "hide") {
      this.$state.hazyMode = mode;
      await ipcInvoke("settings:set", { key: "hazyMode", value: mode });
    },
  },
});
