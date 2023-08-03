import {
  misskeyCheckMiAuth,
  misskeyCreateReaction,
  misskeyDeleteReaction,
  misskeyGetEmojis,
  misskeyGetTimelineGlobal,
  misskeyGetTimelineHome,
  misskeyGetTimelineLocal,
  misskeyGetNoteReactions,
} from "./misskey";

export const apiRequest = {
  ["misskey:checkMiAuth"]: misskeyCheckMiAuth,
  ["misskey:getEmojis"]: misskeyGetEmojis,
  ["misskey:getTimelineHome"]: misskeyGetTimelineHome,
  ["misskey:getTimelineLocal"]: misskeyGetTimelineLocal,
  ["misskey:getTimelineGlobal"]: misskeyGetTimelineGlobal,
  ["misskey:createReaction"]: misskeyCreateReaction,
  ["misskey:deleteReaction"]: misskeyDeleteReaction,
  ["misskey:getNoteReactions"]: misskeyGetNoteReactions,
};
