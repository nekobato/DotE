export { entities as MisskeyEntities } from "misskey-js";

export type Emoji = {
  aliases: string[];
  name: string;
  category: string;
  url: string;
};

export type Field = {
  name: string;
  value: string;
};

export type MisskeyUser = {
  id: string;
  name: string;
  username: string;
  host: string | null;
  avatarUrl: string;
  avatarBlurhash: string;
  isBot: boolean;
  isCat: boolean;
  emojis: Emoji;
  onlineStatus: string;
  badgeRoles: string[];
  url: string | null;
  uri: string | null;
  movedToUri: string | null;
  alsoKnownAs: string | null;
  createdAt: string;
  updatedAt: string;
  lastFetchedAt: string | null;
  bannerUrl: string | null;
  bannerBlurhash: string | null;
  isLocked: boolean;
  isSilenced: boolean;
  isSuspended: boolean;
  description: string;
  location: string;
  birthday: string | null;
  lang: string;
  fields: Field[];
  followersCount: number;
  followingCount: number;
  notesCount: number;
  pinnedNoteIds: string[];
  pinnedNotes: any[];
  pinnedPageId: string | null;
  pinnedPage: any | null;
  publicReactions: boolean;
  ffVisibility: string;
  twoFactorEnabled: boolean;
  usePasswordLessLogin: boolean;
  securityKeys: boolean;
  roles: Role[];
};

export type MisskeyFile = {
  createdAt: string;
  id: string;
  isSensitive: boolean;
  md5: string;
  name: string;
  properties: {
    width: number;
    height: number;
  };
  size: number;
  thumbnailUrl: string;
  type: string;
  url: string;
  user: MisskeyUser | null;
  userId: string | null;
};

export type MisskeyNote = {
  id: string;
  createdAt: string;
  userId: string;
  user: MisskeyUser;
  text: string;
  cw: string | null;
  renoteId: string | null;
  renote: MisskeyNote | null;
  replyId: string | null;
  reply: MisskeyNote | null;
  reactionEmojis: { [key: string]: string };
  reactions: MisskeyReaction;
  emojis: Emoji[];
  fileIds: string[];
  files: any[];
  geo: any;
  visibility: string;
  mentions: any[];
  renoteCount: number;
  repliesCount: number;
  reactionsCount: number;
  myReaction: any;
  poll: any;
};

export type MisskeyReaction = {
  [key: string]: number;
};

export type MisskeyApi = {
  "notes/reactions/create": {
    input: {
      noteId: string;
      reaction: string;
    };
    output: {};
  };
  "notes/reactions/delete": {
    input: {
      noteId: string;
    };
    output: {};
  };
};
