import { safeStorage } from "electron";
import Store from "electron-store";
import { v4 as uuid } from "uuid";
import { Instance, Timeline, User, Settings } from "@/types/store";
import { storeDefaults } from "~/utils/statics";

export type StoreSchema = {
  timelines: Timeline[];
  instances: Instance[];
  users: User[];
  settings: Settings;
};

const schema: Store.Schema<StoreSchema> = {
  timelines: {
    type: "array",
    items: {
      type: "object",
      properties: {
        id: { type: "string" },
        userId: { type: "string" },
        channel: { type: "string" },
        options: {
          type: "object",
          required: [""],
          properties: {
            query: { type: "string" },
          },
        },
        available: { type: "boolean" },
      },
      required: ["id", "userId", "channel", "options"],
    },
  },
  instances: {
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
  users: {
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
  settings: {
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
  defaults: storeDefaults,
});

// Actions

// Timeline

export const getTimelineAll = () => {
  return store.get("timelines");
};

export const setTimeline = (data: Timeline) => {
  if (!data.userId) throw new Error("userId is required");
  if (!data.channel) throw new Error("channel is required");
  if (!data.options) throw new Error("options is required");

  if (data.id) {
    store.set(
      "timeline",
      store.get("timelines").map((timeline) => {
        if (timeline.id === data.id) {
          return data;
        } else {
          return timeline;
        }
      }),
    );
    return data;
  } else {
    const newTimeline = {
      ...data,
      id: uuid(),
    };
    store.set("timeline", [...store.get("timelines"), newTimeline]);
    return newTimeline;
  }
};

export const deleteTimeline = (id: string) => {
  if (!id) throw new Error("id is required");

  return store.set(
    "timeline",
    store.get("timelines").filter((timeline) => timeline.id !== id),
  );
};

// Instance

export const getInstanceAll = () => {
  return store.get("instances");
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
      store.get("instances").map((instance) => {
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
    store.set("instance", [...store.get("instances"), newInstance]);

    return newInstance;
  }
};

export const deleteInstance = (id: string) => {
  if (!id) throw new Error("id is required");

  return store.set(
    "instance",
    store.get("instances").filter((instance) => instance.id !== id),
  );
};

// User

export const deleteUser = (id: string) => {
  if (!id) throw new Error("id is required");

  return store.set(
    "user",
    store.get("users").filter((user) => user.id !== id),
  );
};

export const getUserAll = () => {
  return store.get("users").map((user) => {
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
    const currentUser = store.get("users").find((user) => user.instanceId === user.instanceId);
    if (!currentUser) throw new Error("User is not found");
    const { id, token, ...newUserData } = user;
    store.set(
      "user",
      store.get("users").map((user) => {
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
    store.set("user", [...store.get("users"), newUser]);
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
