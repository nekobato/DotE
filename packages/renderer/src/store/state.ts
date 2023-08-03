import { Post } from "@/types/Post";
import { Emoji } from "@/types/misskey";
import { User } from "@/utils/misskey";
import packageJson from "../../../../package.json";

const state: State = {
  users: [],
  timeline: {
    user: undefined,
    postList: [],
    instanceUrl: "",
    instanceType: "misskey",
    misskeyEmojis: [],
    mode: "misskey:homeTimeline",
    searchQuery: "",
    searchHistory: [],
    listId: "",
    listHistory: {
      id: "",
      name: "",
      owner_id: "",
    },
  },
  misskey: {
    instances: [],
  },
  settings: {
    opacity: 50,
  },
  information: {
    version: packageJson.version,
    website: packageJson.homepage,
    github: packageJson.repository.url,
  },
};

export type State = {
  accessToken?: string;
  users?: User[];
  timeline: {
    user?: User;
    instanceUrl: string;
    instanceType: "misskey" | "mastodon";
    misskeyEmojis: Emoji[];
    postList: Post[];
    mode:
      | "misskey:homeTimeline"
      | "misskey:localTimeline"
      | "misskey:globalTimeline"
      | "misskey:search"
      | "misskey:list";
    searchQuery: string;
    searchHistory: string[];
    listId: string;
    listHistory: {
      id: string;
      name: string;
      owner_id: string;
    };
  };
  misskey: {
    // key is instanceUrl
    instances: {
      instanceUrl: string;
      emojis: Emoji[];
    }[];
  };
  settings: {
    opacity: number;
  };
  information: {
    version: string;
    website: string;
    github: string;
  };
};

export default state;
