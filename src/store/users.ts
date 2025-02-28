import { ipcInvoke } from "@/utils/ipc";
import { MisskeyEntities } from "@shared/types/misskey";
import type { Instance, User, InstanceType } from "@shared/types/store";
import { defineStore } from "pinia";
import { useStore } from ".";
import { useInstanceStore } from "./instance";
import { useTimelineStore } from "./timeline";
import { defaultChannelNameFromType } from "@/utils/dote";

export type NewUser = Omit<User, "id" | "instanceId"> & {
  instanceUrl: string;
  instanceType: InstanceType;
  options?: {
    [key: string]: any;
  };
};

export const useUsersStore = defineStore("users", () => {
  const store = useStore();

  let timelineStore: ReturnType<typeof useTimelineStore>;
  let instanceStore: ReturnType<typeof useInstanceStore>;

  // 初期化時に循環参照を避けるため、遅延初期化
  const getTimelineStore = () => {
    if (!timelineStore) {
      timelineStore = useTimelineStore();
    }
    return timelineStore;
  };

  const getInstanceStore = () => {
    if (!instanceStore) {
      instanceStore = useInstanceStore();
    }
    return instanceStore;
  };

  const users = store.$state.users;
  const isEmpty = store.$state.users.length === 0;

  const deleteUser = async (id: string) => {
    const timelineStore = getTimelineStore();
    await ipcInvoke("db:delete-user", { id });
    await store.initUsers();
    await timelineStore.deleteTimelineByUserId(id);
  };

  const createUser = async (newUser: NewUser) => {
    const instanceStore = getInstanceStore();
    const timelineStore = getTimelineStore();

    let instance: Instance | undefined = instanceStore.findInstance(newUser.instanceUrl);
    // Instanceが無ければ作成
    if (!instance) {
      instance = await instanceStore.createInstance(newUser.instanceUrl, newUser.instanceType);
    }

    if (!instance) {
      store.$state.errors.push({
        message: `${newUser.instanceUrl}のデータを作るのに失敗しちゃった`,
      });
      return;
    }

    // User作成
    await ipcInvoke("db:upsert-user", {
      name: newUser.name,
      avatarUrl: newUser.avatarUrl || "",
      token: newUser.token,
      instanceId: instance.id,
      ...(newUser.blueskySession && { blueskySession: newUser.blueskySession }),
    });

    await store.initUsers();
    await store.initInstances();

    // Timelineの長さが0ならば作成
    if (store.timelines.length === 0) {
      await timelineStore.createTimeline({
        userId: store.users[0].id,
        channel: defaultChannelNameFromType(instance?.type),
        options: {},
        updateInterval: 60 * 1000, // 60 sec
        available: true,
      });
    }

    store.initTimelines();
  };

  const checkAndUpdateUser = async (user: User) => {
    const instanceStore = getInstanceStore();

    const instance = instanceStore.findInstance(user.instanceId);
    if (!instance) {
      store.$state.errors.push({
        message: `${user.name}のインスタンスが見つかりませんでした`,
      });
      return;
    }

    if (instance.type === "misskey") {
      const result: MisskeyEntities.User = await ipcInvoke("api", {
        method: "misskey:getI",
        instanceUrl: instance.url,
        token: user.token,
      }).catch(() => {
        store.$state.errors.push({
          message: `${user.name}の認証失敗`,
        });
      });

      if (result) {
        await ipcInvoke("db:upsert-user", {
          id: user.id,
          name: result.username,
          avatarUrl: result.avatarUrl ?? undefined,
        });
      }
    } else if (instance.type === "mastodon") {
      const result: any = await ipcInvoke("api", {
        method: "mastodon:getAccount",
        instanceUrl: instance.url,
        token: user.token,
      }).catch(() => {
        store.$state.errors.push({
          message: `${user.name}の認証失敗`,
        });
      });

      if (result) {
        await ipcInvoke("db:upsert-user", {
          id: user.id,
          name: result.username,
          avatarUrl: result.avatar,
        });
      }
    }
    await store.initUsers();
  };

  const checkAndUpdateUsers = async () => {
    const users = store.$state.users;
    for (const user of users) {
      await checkAndUpdateUser(user);
    }
  };

  const postMisskeyAuth = async ({ instanceUrl, sessionId }: { instanceUrl: string; sessionId: string }) => {
    const result: MisskeyEntities.User = await ipcInvoke("api", {
      method: "misskey:checkMiAuth",
      instanceUrl: instanceUrl,
      sessionId: sessionId,
    }).catch(() => {
      store.$state.errors.push({
        message: `${instanceUrl}の認証失敗`,
      });
    });
    return result;
  };

  const findUser = (userId: string) => {
    const user = store.$state.users.find((user) => user.id === userId);
    return user;
  };

  const findInstance = (instanceId?: string) => {
    const instance = store.$state.instances.find((instance) => {
      return instance.id === instanceId;
    });
    return instance;
  };

  return { users, isEmpty, deleteUser, createUser, checkAndUpdateUsers, postMisskeyAuth, findUser, findInstance };
});
