import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { webSocketState } from "@/utils/misskeyStream";

export type MisskeyTimelineConnectionType = "idle" | "websocket" | "polling";
export type MisskeyTimelineWebSocketState = (typeof webSocketState)[keyof typeof webSocketState];

/**
 * Keep the current Misskey timeline transport state available to UI components.
 */
export const useMisskeyTimelineConnectionStore = defineStore("misskeyTimelineConnection", () => {
  const connectionType = ref<MisskeyTimelineConnectionType>("idle");
  const webSocketStatus = ref<MisskeyTimelineWebSocketState>(webSocketState.CLOSED);
  const pollingInterval = ref(0);
  const nextPollingAt = ref<number | null>(null);

  const isWebSocket = computed(() => connectionType.value === "websocket");
  const isPolling = computed(() => connectionType.value === "polling");

  /**
   * Mark the active Misskey timeline as WebSocket-backed.
   */
  const startWebSocket = (status: MisskeyTimelineWebSocketState) => {
    connectionType.value = "websocket";
    webSocketStatus.value = status;
    pollingInterval.value = 0;
    nextPollingAt.value = null;
  };

  /**
   * Update the WebSocket status while preserving the active transport.
   */
  const setWebSocketStatus = (status: MisskeyTimelineWebSocketState) => {
    webSocketStatus.value = status;
  };

  /**
   * Mark the active Misskey timeline as polling-backed and start its countdown.
   */
  const startPolling = (interval: number) => {
    connectionType.value = "polling";
    webSocketStatus.value = webSocketState.CLOSED;
    pollingInterval.value = interval;
    nextPollingAt.value = interval > 0 ? Date.now() + interval : null;
  };

  /**
   * Move the polling countdown to the next scheduled refresh.
   */
  const scheduleNextPolling = () => {
    if (connectionType.value !== "polling" || pollingInterval.value <= 0) return;
    nextPollingAt.value = Date.now() + pollingInterval.value;
  };

  /**
   * Clear all Misskey timeline transport state.
   */
  const reset = () => {
    connectionType.value = "idle";
    webSocketStatus.value = webSocketState.CLOSED;
    pollingInterval.value = 0;
    nextPollingAt.value = null;
  };

  return {
    connectionType,
    webSocketStatus,
    pollingInterval,
    nextPollingAt,
    isWebSocket,
    isPolling,
    startWebSocket,
    setWebSocketStatus,
    startPolling,
    scheduleNextPolling,
    reset,
  };
});
