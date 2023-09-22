import { safeStorage } from "electron";
import Store from "electron-store";
import { v4 as uuid } from "uuid";
import { Instance, Timeline, User, Setting } from "@/types/store";

export type StoreSchema = {
  timeline: Timeline[];
  instance: Instance[];
  user: User[];
  setting: Setting;
};

const schema: Store.Schema<StoreSchema> = {
  timeline: {
    type: "array",
    items: {
      type: "object",
      properties: {
        id: { type: "string" },
        userId: { type: "string" },
        channel: { type: "string" },
        options: { type: "string" },
      },
      required: ["id", "userId", "channel", "options"],
    },
  },
  instance: {
    type: "array",
    items: {
      type: "object",
      properties: {
        id: { type: "string" },
        type: { type: "string" },
        name: { type: "string" },
        url: { type: "string" },
        iconUrl: { type: "string" },
      },
      required: ["id", "type", "name", "url", "iconUrl"],
    },
  },
  user: {
    type: "array",
    items: {
      type: "object",
      properties: {
        id: { type: "string" },
        instanceId: { type: "string" },
        name: { type: "string" },
        token: { type: "string" },
        avatarUrl: { type: "string" },
      },
      required: ["id", "instanceId", "name", "token", "avatarUrl"],
    },
  },
  setting: {
    type: "object",
    properties: {
      opacity: { type: "number" },
      hazyMode: { type: "string" },
      windowSize: {
        type: "object",
        properties: {
          width: { type: "number" },
          height: { type: "number" },
        },
      },
      maxPostCount: { type: "number" },
      shortcuts: {
        type: "object",
        properties: {
          toggleTimeline: { type: "string" },
        },
      },
    },
  },
};

export const store = new Store<StoreSchema>({
  schema,
  defaults: {
    timeline: [],
    instance: [],
    user: [],
    setting: {
      opacity: 50,
      hazyMode: "show",
      windowSize: {
        width: 475,
        height: 600,
      },
      maxPostCount: 1000,
      shortcuts: {
        toggleTimeline: "CmdOrCtrl+Shift+T",
      },
    },
  },
});

// Actions

// Timeline

export const getTimelineAll = () => {
  return store.get("timeline");
};

export const setTimeline = (data: { id?: string; userId: string; channel: string; options: string }) => {
  const { id, userId, channel, options } = data;

  if (!userId) throw new Error("userId is required");
  if (!channel) throw new Error("channel is required");
  if (!options) throw new Error("options is required");

  if (id) {
    const newTimeline = {
      id: id,
      userId: userId,
      channel: channel,
      options: options,
    };
    store.set(
      "timeline",
      store.get("timeline").map((timeline) => {
        if (timeline.id === id) {
          return newTimeline;
        } else {
          return timeline;
        }
      }),
    );
    return newTimeline;
  } else {
    const newTimeline = {
      id: uuid(),
      userId: userId,
      channel: channel,
      options: options,
    };
    store.set("timeline", [...store.get("timeline"), newTimeline]);
    return newTimeline;
  }
};

export const deleteTimeline = (id: string) => {
  if (!id) throw new Error("id is required");

  return store.set(
    "timeline",
    store.get("timeline").filter((timeline) => timeline.id !== id),
  );
};

// Instance

export const getInstanceAll = () => {
  return store.get("instance");
};

export const upsertInstance = (instance: {
  id?: string;
  type: "misskey" | "mastodon";
  name: string;
  url: string;
  iconUrl: string;
}) => {
  const { id, type, name, url, iconUrl } = instance;

  if (!type) throw new Error("type is required");
  if (!name) throw new Error("name is required");
  if (!url) throw new Error("url is required");
  if (!iconUrl) throw new Error("iconUrl is required");

  if (id) {
    store.set(
      "instance",
      store.get("instance").map((instance) => {
        if (instance.id === id) {
          return {
            id: id,
            type: type,
            name: name,
            url: url,
            iconUrl: iconUrl,
          };
        } else {
          return instance;
        }
      }),
    );

    return instance;
  } else {
    const newInstance = {
      id: uuid(),
      type: type,
      name: name,
      url: url,
      iconUrl: iconUrl,
    };
    store.set("instance", [...store.get("instance"), newInstance]);

    return newInstance;
  }
};

export const deleteInstance = (id: string) => {
  if (!id) throw new Error("id is required");

  return store.set(
    "instance",
    store.get("instance").filter((instance) => instance.id !== id),
  );
};

// User

export const deleteUser = (id: string) => {
  if (!id) throw new Error("id is required");

  return store.set(
    "user",
    store.get("user").filter((user) => user.id !== id),
  );
};

export const getUserAll = () => {
  return store.get("user").map((user) => {
    const decryptedToken = safeStorage.decryptString(Buffer.from(user.token, "base64"));
    return {
      ...user,
      token: decryptedToken,
    };
  });
};

export const upsertUser = (user: {
  id?: string;
  instanceId: string;
  name: string;
  token: string;
  avatarUrl: string;
}) => {
  const encryptedToken = safeStorage.encryptString(user.token).toString("base64");
  if (user.id) {
    const currentUser = store.get("user").find((user) => user.instanceId === user.instanceId);
    if (!currentUser) throw new Error("User is not found");
    const { id, token, ...newUserData } = user;
    store.set(
      "user",
      store.get("user").map((user) => {
        if (user.id === currentUser.id) {
          return {
            ...currentUser,
            ...newUserData,
            token: encryptedToken,
          };
        } else {
          return user;
        }
      }),
    );
    return {
      ...currentUser,
      ...newUserData,
      token: encryptedToken,
    };
  } else {
    const newUser = {
      id: uuid(),
      instanceId: user.instanceId,
      name: user.name,
      token: encryptedToken,
      avatarUrl: user.avatarUrl,
    };
    store.set("user", [...store.get("user"), newUser]);
    return newUser;
  }
};

// Setting

export const getSettingAll = () => {
  return store.get("setting");
};

export const getSetting = (key: "opacity" | "hazyMode") => {
  if (!key) throw new Error("key is required");

  switch (key) {
    case "opacity":
      return store.get("setting.opacity");
    case "hazyMode":
      return store.get("setting.hazyMode");
    default:
      throw new Error(`${key} is not defined key.`);
  }
};

export const setSetting = (key: string, value: any) => {
  if (!key) throw new Error("key is required");
  if (!value) throw new Error("value is required");

  switch (key) {
    case "opacity":
      return store.set("setting.opacity", Number(value));
    case "hazyMode":
      return store.set("setting.hazyMode", value);
    case "windowSize":
      return store.set("setting.windowSize", value);
    case "maxPostCount":
      return store.set("setting.maxPostCount", Number(value));
    case "shortcuts.toggleTimeline":
      return store.set("setting.maxPostCount", Number(value));
    default:
      throw new Error(`${key} is not defined key.`);
  }
};
