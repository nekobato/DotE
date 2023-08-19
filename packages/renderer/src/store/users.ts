import { ipcInvoke } from "@/utils/ipc";
import { Instance, User } from "@prisma/client";
import { defineStore } from "pinia";
import { useStore } from ".";
import { MisskeyEntities } from "@/types/misskey";
import { useInstanceStore } from "./instance";
import { useTimelineStore } from "./timeline";

export type NewUser = Omit<User, "id" | "instanceId"> & {
  instanceUrl: string;
};

export const useUsersStore = defineStore("users", () => {
  const store = useStore();
  const instanceStore = useInstanceStore();
  const timelineStore = useTimelineStore();

  const users = store.$state.users;
  const isEmpty = store.$state.users.length === 0;

  const deleteUser = async (id: number) => {
    await ipcInvoke("db:delete-user", { id });
    await store.initUsers();
  };

  const createUser = async (user: NewUser) => {
    let instanceId: number;

    // Instanceが無ければ作成
    const instance = instanceStore.findInstance(user.instanceUrl);

    if (instance) {
      instanceId = instance.id;
    } else {
      const newInstance = await instanceStore.createInstance(user.instanceUrl);
      instanceId = newInstance.id;
    }

    if (!instanceId) {
      throw new Error("instanceId has not created.");
    }

    // User作成
    await ipcInvoke("db:upsert-user", {
      name: user.name,
      username: user.username,
      avatarUrl: user.avatarUrl || "",
      token: user.token,
      instanceId,
    });

    await store.initUsers();

    // Timelineの長さが0ならば作成
    if (store.timelines.length === 0) {
      await timelineStore.createTimeline({ userId: store.users[0].id, channel: "misskey:homeTimeline", options: {} });
    }
  };

  const postMisskeyAuth = async ({ instanceUrl, sessionId }: { instanceUrl: string; sessionId: String }) => {
    const result: MisskeyEntities.User = await ipcInvoke("api", {
      method: "misskey:checkMiAuth",
      instanceUrl: instanceUrl,
      sessionId: sessionId,
    });
    return result;
  };

  const findInstance = (instanceId?: number) => {
    const instance = store.$state.instances.find((instance) => {
      return instance.id === instanceId;
    });
    return instance;
  };

  return { users, isEmpty, deleteUser, createUser, postMisskeyAuth, findInstance };
});
