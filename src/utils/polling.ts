import { ref } from "vue";

export type MisskeyPollingChannel = "search";

export const useMisskeyPolling = ({ poll }: { poll: () => void }) => {
  const pollingState = ref<"idle" | "polling" | "error">("idle");
  const pollingInterval = ref<number>(0);

  const startPolling = (interval: number) => {
    pollingInterval.value = window.setInterval(() => {
      poll();
    }, interval);

    pollingState.value = "polling";
  };

  const stopPolling = () => {
    clearInterval(pollingInterval.value);

    pollingState.value = "idle";
  };

  return {
    pollingState,
    startPolling,
    stopPolling,
  };
};
