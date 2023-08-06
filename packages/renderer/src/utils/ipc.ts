import { ChannelName } from "@/store/timeline";
import { User } from "@prisma/client";

export const ipcSend = (event: string, payload?: object) => {
  if (typeof window === "undefined") return;
  window.ipc.send(event, JSON.stringify(payload));
};

type invokeEvents = {
  api: {
    method: string;
  } & { [key: string]: any };
  "db:get-users": void;
  "db:upsert-user": {
    id?: number;
    instanceUserId: string;
    instanceUrl: string;
    instanceType: string;
    token: string;
    name: string;
    username: string;
    avatarUrl: string;
  };
  "db:delete-user": {
    id: number;
  };
  "db:get-timeline-all": void;
  "db:set-timeline": {
    id?: number;
    userId: number;
    channel: string;
    options: string;
  };
  "settings:set": {
    key: string;
    value: string;
  };
  "settings:all": void;
};

type InvokeResults = {
  api: any;
  "db:get-users": User[];
  "db:upsert-user": User;
  "db:delete-user": void;
  "db:get-timeline-all": {
    id: number;
    userId: number;
    channel: ChannelName;
    options: string;
  }[];
  "db:set-timeline": void;
  "settings:set": void;
  "settings:all": {
    key: string;
    value: string;
  }[];
};

export const ipcInvoke = <K extends keyof invokeEvents>(
  event: K,
  payload?: invokeEvents[K],
): Promise<InvokeResults[K]> => {
  return window.ipc.invoke(event, JSON.stringify(payload));
};
