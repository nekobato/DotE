import type { Endpoints, entities } from "misskey-js";
import type { ApiErrorPayload } from "./types/ipc";

export type MisskeyNoteState = Endpoints["notes/state"]["res"];
export type MisskeyClip = entities.Clip;

export const misskeyApiErrorCode = (error: ApiErrorPayload): string | undefined => {
  try {
    return JSON.parse(error.bodyPreview ?? "").error?.code;
  } catch {
    return undefined;
  }
};

export const isUnsupportedMisskeyOperation = (error: ApiErrorPayload): boolean => {
  const code = misskeyApiErrorCode(error);
  return (
    code === "NO_SUCH_ENDPOINT" ||
    error.status === 405 ||
    error.status === 501 ||
    (error.status === 404 && code !== "NO_SUCH_NOTE" && code !== "NO_SUCH_CLIP")
  );
};

export const describeMisskeyManagementError = (error: ApiErrorPayload): string => {
  const code = misskeyApiErrorCode(error);
  if (isUnsupportedMisskeyOperation(error)) return "このサーバーではこの操作を利用できません";
  if (code === "NO_SUCH_NOTE") return "投稿が見つかりません。投稿を更新してください";
  if (code === "NO_SUCH_CLIP") return "クリップが見つかりません。一覧を再取得してください";
  if (code === "ALREADY_CLIPPED") return "この投稿は既にクリップに追加されています";
  if (code === "TOO_MANY_CLIP_NOTES") return "このクリップに追加できる投稿数の上限に達しています";
  if (error.status === 401 || error.status === 403)
    return "この操作の権限がありません。アカウントの権限を確認してください";
  if (error.status === 429) return "操作が多すぎます。しばらく待ってから再試行してください";
  return "操作に失敗しました。通信を確認してもう一度お試しください";
};

export const isMisskeyNoteState = (value: unknown): value is MisskeyNoteState =>
  Boolean(
    value &&
    typeof value === "object" &&
    "isFavorited" in value &&
    typeof value.isFavorited === "boolean" &&
    "isMutedThread" in value &&
    typeof value.isMutedThread === "boolean",
  );
