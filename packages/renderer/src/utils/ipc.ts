import { Instance, Timeline, User } from "@prisma/client";

export const ipcSend = (event: string, payload?: object) => {
  if (typeof window === "undefined") return;
  window.ipc.send(event, JSON.stringify(payload));
};

type invokeEvents = {
  api: {
    method: string;
  } & { [key: string]: any };
  "db:get-users": void;
  "db:upsert-user": Omit<User, "id"> | Partial<User>;
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
  "db:get-instance-all": void;
  "db:upsert-instance": {
    id?: number;
    url: string;
    name: string;
    iconUrl: string;
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
  "db:get-timeline-all": Timeline[];
  "db:set-timeline": void;
  "db:get-instance-all": Instance[];
  "db:upsert-instance": Instance;
  "settings:set": void;
  "settings:all": {
    opacity: number;
    hazyMode: "show" | "haze" | "hide";
  };
};

export const ipcInvoke = <K extends keyof invokeEvents>(
  event: K,
  payload?: invokeEvents[K],
): Promise<InvokeResults[K]> => {
  return window.ipc.invoke(event, JSON.stringify(payload));
};
