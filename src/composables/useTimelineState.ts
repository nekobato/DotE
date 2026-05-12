import { computed, ref } from "vue";
import { useStore } from "@/store";
import { useTimelineStore } from "@/store/timeline";

/**
 * Provides derived rendering state for the active timeline.
 */
export const useTimelineState = () => {
  const store = useStore();
  const timelineStore = useTimelineStore();
  const scrollPosition = ref(0);

  const hazeSettings = computed(() => ({
    opacity: (store.settings.mode === "haze" ? store.settings.opacity || 0 : 100) / 100,
    isEnabled: store.settings.mode === "haze",
  }));

  const scrollState = computed(() => ({
    canScrollToTop: store.settings.mode === "show" && scrollPosition.value > 0,
    canReadMore:
      (timelineStore.current?.posts.length ?? 0) > 0 || (timelineStore.current?.notifications.length ?? 0) > 0,
  }));

  const platformData = computed(() => {
    const currentInstance = timelineStore.currentInstance;
    const isMisskey = currentInstance?.type === "misskey" && "misskey" in currentInstance;
    const misskeyMeta = isMisskey ? currentInstance.misskey?.meta : null;
    const hasPosts = (timelineStore.current?.posts.length ?? 0) > 0;

    return {
      emojis: isMisskey ? currentInstance.misskey?.emojis || [] : [],
      ads: !hazeSettings.value.isEnabled && hasPosts ? (misskeyMeta?.ads ?? []) : [],
    };
  });

  return {
    scrollPosition,
    hazeSettings,
    scrollState,
    platformData,
  };
};
