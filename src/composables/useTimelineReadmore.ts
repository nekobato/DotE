import { useTimelineStore } from "@/store/timeline";
import { useStore } from "@/store";
import { ipcInvoke } from "@/utils/ipc";
import { computed, ref, watch } from "vue";
import { captureTimelineRequest } from "@/store/timelineRequest";
import { methodOfChannel } from "@/store";
import { useBlueskyStore } from "@/store/bluesky";
import { ChannelName } from "@shared/types/store";
import type { ApiInvokeResult } from "@shared/types/ipc";

export function useTimelineReadmore() {
  const timelineStore = useTimelineStore();
  const blueskyStore = useBlueskyStore();
  const store = useStore();

  const loading = ref(false);
  let generation = 0;
  watch(
    () => [
      timelineStore.current?.id,
      timelineStore.current?.userId,
      timelineStore.current?.channel,
      timelineStore.currentUser?.token,
      timelineStore.currentUser?.blueskySession?.did,
      timelineStore.currentInstance?.url,
      JSON.stringify(timelineStore.current?.options),
    ],
    () => {
      generation += 1;
      loading.value = false;
    },
    { flush: "sync" },
  );

  const postsOrNotifications = computed(() => {
    if (!timelineStore.current) return [];
    if (timelineStore.current.notifications.length > 0) {
      return timelineStore.current.notifications;
    }
    return timelineStore.current?.posts;
  });

  const canReadmore = computed(() => {
    return (
      (timelineStore.current?.posts && timelineStore.current?.posts.length > 0) ||
      (timelineStore.current?.notifications && timelineStore.current?.notifications.length > 0)
    );
  });

  const unwrapApiResult = <T>(result: ApiInvokeResult<T>, message: string): T | undefined => {
    if (!result.ok) {
      store.$state.errors.push({
        message,
      });
      console.error(message, result.error);
      return undefined;
    }
    return result.data;
  };

  const resolveReadableItemId = (item: unknown): string | undefined => {
    if (typeof item !== "object" || item === null || !("id" in item)) return undefined;
    const id = (item as { id?: unknown }).id;
    return typeof id === "string" ? id : undefined;
  };

  const fetchOlderPosts = async (channel: ChannelName) => {
    const request = captureTimelineRequest(store, timelineStore);
    const lastItem = postsOrNotifications.value[postsOrNotifications.value.length - 1];
    const result = await ipcInvoke("api", {
      method: methodOfChannel[channel],
      channelId: timelineStore.current?.options.channelId, // option
      antennaId: timelineStore.current?.options?.antennaId, // option
      listId: timelineStore.current?.options?.listId, // option
      query: timelineStore.current?.options?.query, // option
      tag: timelineStore.current?.options?.tag, // option
      instanceUrl: timelineStore.currentInstance?.url,
      token: timelineStore.currentUser?.token,
      limit: 20,
      untilId: resolveReadableItemId(lastItem),
    });

    if (!request.isCurrent()) return;
    const additionalNotes = unwrapApiResult(
      result,
      `${timelineStore.currentInstance?.name ?? "タイムライン"}の過去投稿取得に失敗しました`,
    );

    if (additionalNotes) {
      if (timelineStore.current?.channel === "misskey:notifications") {
        timelineStore.addMoreNotifications(additionalNotes);
      } else {
        timelineStore.addMorePosts(additionalNotes);
      }
    }
  };

  const readmore = async () => {
    if (!timelineStore.current?.channel || loading.value) {
      return;
    }

    const request = captureTimelineRequest(store, timelineStore);
    if (!request.isCurrent()) return;
    const requestGeneration = ++generation;
    const beforeCount = postsOrNotifications.value.length;
    timelineStore.startReadmore();
    loading.value = true;

    try {
      switch (timelineStore.currentInstance?.type) {
        case "bluesky":
          await blueskyStore.fetchOlderPosts(timelineStore.current.channel);
          break;
        default:
          await fetchOlderPosts(timelineStore.current.channel);
          break;
      }
    } catch (error) {
      if (!request.isCurrent() || requestGeneration !== generation) return;
      const message = `${timelineStore.currentInstance?.name ?? "タイムライン"}の過去投稿取得に失敗しました`;
      store.$state.errors.push({
        message,
      });
      console.error(message, error);
    } finally {
      if (requestGeneration === generation) {
        const afterCount = postsOrNotifications.value.length;
        if (request.isCurrent() && afterCount <= beforeCount) {
          timelineStore.applyPendingNewPosts();
        }
        loading.value = false;
      }
    }
  };

  return { loading, canReadmore, readmore };
}
