import { InstanceStore } from "~/store";
import { User, Settings, Timeline } from "~/types/store";

export const storeDefaults = {
  users: [] as User[],
  instances: [] as InstanceStore[],
  timelines: [] as Timeline[],
  settings: {
    opacity: 50,
    hazyMode: "show",
    windowSize: {
      width: 475,
      height: 600,
    },
    maxPostCount: 1000,
    postStyle: "all",
    shortcuts: {},
    shouldAppUpdate: true,
    misskey: {
      hideCw: false,
    },
  } as Settings,
};
