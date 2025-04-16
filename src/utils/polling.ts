import { ref } from "vue";

/**
 * 汎用的なポーリング機能を提供するフック
 */
export const usePolling = ({ poll }: { poll: () => void }) => {
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

export type MisskeyPollingChannel = "search";

/**
 * Misskey用のポーリング機能
 */
export const useMisskeyPolling = ({ poll }: { poll: () => void }) => {
  return usePolling({ poll });
};

/**
 * Bluesky用のポーリング機能
 */
export const useBlueskyPolling = ({ poll }: { poll: () => void }) => {
  return usePolling({ poll });
};
