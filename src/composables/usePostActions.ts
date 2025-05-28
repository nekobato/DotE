import { ipcSend } from "@/utils/ipc";
import type { MisskeyNote } from "@shared/types/misskey";

type EmitFunction = {
  (evt: "refreshPost", postId: string): void;
  (evt: "newReaction", postId: string): void;
  (evt: "repost", data: { post: MisskeyNote; emojis: { name: string; url: string }[] }): void;
  (evt: "reaction", data: { postId: string; reaction: string }): void;
};

export function usePostActions(currentInstanceUrl?: string) {
  const openPost = (postId: string) => {
    if (!currentInstanceUrl) return;
    ipcSend("open-url", {
      url: new URL(`/notes/${postId}`, currentInstanceUrl).toString(),
    });
  };

  const openUserPage = (user: MisskeyNote["user"]) => {
    const instanceUrl = user.host || currentInstanceUrl;
    if (!instanceUrl) return;

    ipcSend("open-url", {
      url: new URL(
        `/@${user.username}`,
        instanceUrl?.startsWith("https://") ? instanceUrl : `https://${instanceUrl}`,
      ).toString(),
    });
  };

  const refreshPost = (postId: string, emit: EmitFunction) => {
    emit("refreshPost", postId);
  };

  const openReactionWindow = (postId: string, emit: EmitFunction) => {
    emit("newReaction", postId);
  };

  const openRepostWindow = (post: MisskeyNote, emojis: { name: string; url: string }[], emit: EmitFunction) => {
    emit("repost", { post, emojis });
  };

  const onClickReaction = (postId: string, reaction: string, emit: EmitFunction) => {
    emit("reaction", { postId, reaction });
  };

  return {
    openPost,
    openUserPage,
    refreshPost,
    openReactionWindow,
    openRepostWindow,
    onClickReaction,
  };
}
