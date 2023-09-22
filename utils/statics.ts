import { InstanceStore } from "~/store";
import { User, Settings, Timeline } from "~/types/store";

export const storeDefaults = {
  users: [] as User[],
  instances: [] as InstanceStore[],
  timelines: [] as Timeline[],
  settings: {
    opacity: 50 as number,
    hazyMode: "show" as Settings["hazyMode"],
    windowSize: {
      width: 475 as number,
      height: 600 as number,
    },
    maxPostCount: 1000 as number,
    shortcuts: {} as Settings["shortcuts"],
  },
};
