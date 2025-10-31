import { api, entities } from "misskey-js";
import * as mfm from "mfm-js";
import { LineStyle } from "@shared/types/store";

export type MisskeyNote = entities.Note & {
  reactionEmojis: {
    [key: string]: string;
  };
  renote?: entities.Note["renote"] & {
    reactionEmojis: {
      [key: string]: string;
    };
  };
};

export type MisskeyChannel = {
  bannerUrl: string;
  color: string;
  createdAt: string;
  description: string;
  hasUnreadNote: boolean;
  id: string;
  isArchived: boolean;
  isFavorited: boolean;
  isFollowing: boolean;
  lastNotedAt: string;
  name: string;
  notesCount: number;
  pinnedNoteIds: string[];
  userId: string;
  usersCount: number;
};

export type MisskeyInstance = {
  id: string;
  type: "misskey";
  name: string;
  url: string;
  iconUrl: string;
  ads?: {
    dayOfWeek: 0;
    id: string;
    imageUrl: string;
    place: string;
    ratio: number;
    url: string;
  };
};

export type MisskeyAd = {
  dayOfWeek: 0;
  id: string;
  imageUrl: string;
  place: string;
  ratio: number;
  url: string;
};

// Component Props Types

export type PostType = "note" | "reply" | "quote" | "renote";

export type RenoteType = "quoted" | "renoted";

export interface MisskeyNoteBaseProps {
  emojis: { name: string; url: string }[];
  lineStyle: LineStyle;
  currentInstanceUrl?: string;
  hideCw: boolean;
}

export interface MisskeyNoteProps extends MisskeyNoteBaseProps {
  post: MisskeyNote;
  showReactions?: boolean;
  showActions?: boolean;
  theme?: "default";
}

export interface MisskeyNoteContentProps extends MisskeyNoteBaseProps {
  note: MisskeyNote;
  originNote?: MisskeyNote;
  originUser?: MisskeyNote["user"];
  type: MisskeyEntities.Notification["type"] | "renoted" | "quoted";
  noParent?: boolean;
}

export interface ReactionData {
  name: string;
  url?: string;
  count: number;
  isRemote: boolean;
}

export { api as MisskeyApi, entities as MisskeyEntities };
