import { Emoji } from "@/types/misskey";
import { ipcInvoke } from "@/utils/ipc";
import { defineStore } from "pinia";
import { useUsersStore } from "./users";
import { useTimelineStore } from "./timeline";

export type Instance = {
  instanceType: "misskey";
  instanceUrl: string;
  misskey: {
    emojis: Emoji[];
  };
};

export const useInstanceStore = defineStore({
  id: "instance",
  state: () => [] as Instance[],
  getters: {
    currentTimelineEmojis(state) {
      const timelineStore = useTimelineStore();
      const instance = state.find((instance) => instance.instanceUrl === timelineStore.currentUser?.instanceUrl);
      return instance?.misskey.emojis || [];
    },
  },
  actions: {
    init() {
      const usersStore = useUsersStore();
      this.$state = usersStore.$state.reduce((acc, user) => {
        if (user.instanceType === "misskey") {
          acc.push({
            instanceType: user.instanceType,
            instanceUrl: user.instanceUrl,
            misskey: {
              emojis: [],
            },
          });
        }
        return acc;
      }, [] as Instance[]);
    },
    async fetchMisskeyEmoji(instanceUrl: string) {
      const result = await ipcInvoke("api", {
        method: "misskey:getEmojis",
        instanceUrl,
      });
      const instance = this.$state.find((instance) => instance.instanceUrl === instanceUrl);
      if (instance) {
        instance.misskey.emojis = result.emojis;
      } else {
        throw new Error("instance not found");
      }
    },
  },
});
