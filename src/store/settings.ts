import { ipcInvoke } from "@/utils/ipc";
import { defineStore } from "pinia";
import { useStore } from ".";
import type { Settings } from "@shared/types/store";

export const useSettingsStore = defineStore("settings", () => {
  const store = useStore();

  const setOpacity = async (opacity: number) => {
    store.$state.settings.opacity = opacity;
    return await ipcInvoke("settings:set", { key: "opacity", value: opacity.toString() });
  };

  const setMode = async (mode: "show" | "haze" | "hide") => {
    store.$state.settings.mode = mode;
    return await ipcInvoke("settings:set", { key: "mode", value: mode });
  };

  const setMaxPostCount = async (count: number) => {
    store.$state.settings.maxPostCount = count;
    return await ipcInvoke("settings:set", { key: "maxPostCount", value: count.toString() });
  };

  /**
   * Persist selected font family in settings.
   */
  const setFontFamily = async (family: string) => {
    store.$state.settings.font.family = family;
    return await ipcInvoke("settings:set", { key: "font.family", value: family });
  };

  /**
   * Fetch installed system fonts via main process.
   */
  const fetchSystemFonts = async (): Promise<string[]> => {
    return await ipcInvoke("system:get-fonts");
  };

  const setPostStyle = async (style: Settings["postStyle"]) => {
    store.$state.settings.postStyle = style;
    return await ipcInvoke("settings:set", { key: "postStyle", value: style });
  };

  const setShortcutKey = async (key: keyof Settings["shortcuts"], value: string) => {
    store.$state.settings.shortcuts[key] = value;
    return await ipcInvoke("settings:set", { key: `shortcuts.${key}`, value });
  };

  const setMisskeyHideCw = async (value: boolean) => {
    store.$state.settings.misskey.hideCw = value;
    return await ipcInvoke("settings:set", { key: "misskey.hideCw", value: value });
  };

  const setMisskeyShowReactions = async (value: boolean) => {
    store.$state.settings.misskey.showReactions = value;
    return await ipcInvoke("settings:set", { key: "misskey.showReactions", value: value });
  };

  const setText2SpeechEnabled = async (value: boolean) => {
    store.$state.settings.text2Speech.enabled = value;
    return await ipcInvoke("settings:set", { key: "text2Speech.enabled", value: value });
  };

  return {
    setOpacity,
    setMode,
    setMaxPostCount,
    setFontFamily,
    setPostStyle,
    setShortcutKey,
    setMisskeyHideCw,
    setMisskeyShowReactions,
    setText2SpeechEnabled,
    fetchSystemFonts,
  };
});
