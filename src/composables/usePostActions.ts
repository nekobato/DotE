import { ipcSend } from "@/utils/ipc";
import type { MisskeyNote } from "@shared/types/misskey";

type EmitFunction = {
  (evt: "refreshPost", postId: string): void;
  (evt: "newReaction", postId: string): void;
  (evt: "repost", data: { post: MisskeyNote; emojis: { name: string; url: string }[] }): void;
  (evt: "reaction", data: { postId: string; reaction: string }): void;
};

/**
 * Misskey投稿まわりの共通アクションを提供いたします。
 */
export function usePostActions(currentInstanceUrl?: string) {
  /**
   * 投稿ページを外部ブラウザで開きます。
   */
  const openPost = (postId: string) => {
    if (!currentInstanceUrl) return;
    ipcSend("open-url", {
      url: new URL(`/notes/${postId}`, currentInstanceUrl).toString(),
    });
  };

  /**
   * ユーザーページを外部ブラウザで開きます。
   */
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

  /**
   * 投稿の最新化を行います。
   */
  const refreshPost = (postId: string, emit?: EmitFunction) => {
    emit?.("refreshPost", postId);
  };

  /**
   * リアクション選択ウィンドウを開きます。
   */
  const openReactionWindow = (postId: string, emit?: EmitFunction) => {
    emit?.("newReaction", postId);
  };

  /**
   * リポストウィンドウを開きます。
   */
  const openRepostWindow = (
    post: MisskeyNote,
    emojis: { name: string; url: string }[],
    emit?: EmitFunction,
  ) => {
    emit?.("repost", { post, emojis });
  };

  /**
   * リアクション操作を行います。
   */
  const onClickReaction = (postId: string, reaction: string, emit?: EmitFunction) => {
    emit?.("reaction", { postId, reaction });
  };

  /**
   * リアクションイベントを受け取り、投稿リアクションを処理します。
   */
  const onReactionEvent = (payload: { postId: string; reaction: string }) => {
    onClickReaction(payload.postId, payload.reaction);
  };

  /**
   * リポストイベントを受け取り、リポストウィンドウを開きます。
   */
  const openRepostWindowEvent = (payload: { post: MisskeyNote; emojis: { name: string; url: string }[] }) => {
    openRepostWindow(payload.post, payload.emojis);
  };

  return {
    openPost,
    openUserPage,
    refreshPost,
    openReactionWindow,
    openRepostWindow,
    onClickReaction,
    onReaction: onReactionEvent,
    openNewReaction: openReactionWindow,
    openRepostWindowEvent,
  };
}
