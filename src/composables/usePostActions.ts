import { useTimelineStore } from "@/store/timeline";
import { useMisskeyStore } from "@/store/misskey";
import { useMastodonStore } from "@/store/mastodon";
import { useBlueskyStore } from "@/store/bluesky";
import { ipcSend } from "@/utils/ipc";
import type { MisskeyNote as MisskeyNoteType } from "@shared/types/misskey";
import type { MastodonToot as MastodonTootType } from "@/types/mastodon";
import { MisskeyEntities } from "@shared/types/misskey";

export interface PostActionPayload {
  postId?: string;
  reaction?: string;
  instanceUrl?: string;
  token?: string;
  noteId?: string;
  emojis?: any[];
  post?: MisskeyNoteType | MastodonTootType;
}

export type PostAction = "reaction" | "newReaction" | "repost" | "refreshPost" | "favourite" | "like" | "deleteLike";

export const usePostActions = () => {
  const timelineStore = useTimelineStore();
  const misskeyStore = useMisskeyStore();
  const mastodonStore = useMastodonStore();
  const blueskyStore = useBlueskyStore();

  const handlePostAction = (action: PostAction, payload: any) => {
    switch (action) {
      case "reaction":
        return ipcSend("main:reaction", {
          postId: payload.postId,
          reaction: payload.reaction,
        });

      case "newReaction":
        const currentInstance = timelineStore.currentInstance;
        const emojis =
          currentInstance?.type === "misskey" && "misskey" in currentInstance
            ? currentInstance.misskey?.emojis || []
            : [];

        return ipcSend("post:reaction", {
          instanceUrl: currentInstance?.url,
          token: timelineStore.currentUser?.token,
          noteId: payload,
          emojis,
        });

      case "repost":
        return ipcSend("post:repost", payload);

      case "refreshPost":
        return misskeyStore.updatePost({ postId: payload });

      case "favourite":
        return mastodonStore.toggleFavourite(payload);

      case "like":
        return blueskyStore.like(payload);

      case "deleteLike":
        return blueskyStore.deleteLike(payload);

      default:
        console.warn(`Unknown post action: ${action}`);
    }
  };

  // 個別のアクションハンドラー（既存のコードとの互換性のため）
  const onReaction = ({ postId, reaction }: { postId: string; reaction: string }) => {
    handlePostAction("reaction", { postId, reaction });
  };

  const openNewReaction = (noteId: string) => {
    handlePostAction("newReaction", noteId);
  };

  const openRepostWindow = (data: {
    post: MisskeyNoteType | MastodonTootType;
    emojis: MisskeyEntities.EmojiSimple[];
  }) => {
    handlePostAction("repost", data);
  };

  const refreshPost = (noteId: string) => {
    handlePostAction("refreshPost", noteId);
  };

  return {
    handlePostAction,
    onReaction,
    openNewReaction,
    openRepostWindow,
    refreshPost,
  };
};
