import { computed, getCurrentScope, onScopeDispose, watch } from "vue";
import { useStore } from "@/store";
import { useTimelineStore } from "@/store/timeline";
import { resolveNotificationId, type DotENotification } from "@/utils/notifications";

/** Automatically mark notifications when opened, without retrying failures in a loop. */
export const useNotificationReadSync = () => {
  let stopped = false;
  const store = useStore();
  const timelineStore = useTimelineStore();
  const notificationIdsKey = computed(() =>
    (timelineStore.current?.notifications ?? [])
      .map((item) => resolveNotificationId(item as DotENotification))
      .join("|"),
  );
  const markOnOpen = async (): Promise<void> => {
    if (
      stopped ||
      store.settings.notifications.markAsRead !== "onOpen" ||
      !timelineStore.isCurrentNotificationTimeline ||
      timelineStore.currentNotificationUnreadCount === 0
    )
      return;
    const timelineId = timelineStore.current?.id;
    const idsBefore = notificationIdsKey.value;
    const succeeded = await timelineStore.markCurrentNotificationsAsRead();
    // New arrivals may have joined an in-flight request without being covered by its marker.
    if (succeeded && timelineStore.current?.id === timelineId && notificationIdsKey.value !== idsBefore) {
      await markOnOpen();
    }
  };
  const stopWatcher = watch(
    () =>
      [
        timelineStore.current?.id,
        notificationIdsKey.value,
        store.settings.notifications.markAsRead,
        timelineStore.currentNotificationUnreadCount,
      ] as const,
    () => {
      void markOnOpen();
    },
    { immediate: true },
  );
  const stop = () => {
    stopped = true;
    stopWatcher();
  };
  if (getCurrentScope()) onScopeDispose(stop);
  return stop;
};
