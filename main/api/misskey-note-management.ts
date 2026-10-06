import type { MisskeyClip, MisskeyNoteState } from "../../shared/misskey-note-management";
import { requestJson, requestJsonAllowEmpty } from "./helpers";
import { baseHeader } from "./request";

type AccountParams = { instanceUrl: string; token: string };
type NoteParams = AccountParams & { noteId: string };

const request = <T>(endpoint: string, account: AccountParams, params: object, empty = false): Promise<T> => {
  const url = new URL(`/api/${endpoint}`, account.instanceUrl).toString();
  return (empty ? requestJsonAllowEmpty<T> : requestJson<T>)(url, {
    method: "POST",
    headers: baseHeader,
    body: JSON.stringify({ i: account.token, ...params }),
  });
};

const noteRequest = <T>(endpoint: string, params: NoteParams, empty = true): Promise<T> => {
  if (!params.noteId?.trim()) throw new Error("投稿が指定されていません");
  return request<T>(endpoint, params, { noteId: params.noteId }, empty);
};

export const misskeyGetNoteState = (params: NoteParams) => noteRequest<MisskeyNoteState>("notes/state", params, false);
export const misskeyFavoriteNote = (params: NoteParams) => noteRequest<void>("notes/favorites/create", params);
export const misskeyUnfavoriteNote = (params: NoteParams) => noteRequest<void>("notes/favorites/delete", params);
export const misskeyMuteThread = (params: NoteParams) => noteRequest<void>("notes/thread-muting/create", params);
export const misskeyUnmuteThread = (params: NoteParams) => noteRequest<void>("notes/thread-muting/delete", params);
export const misskeyUnrenote = (params: NoteParams) => noteRequest<void>("notes/unrenote", params);

export const misskeyGetClips = ({
  limit = 50,
  untilId,
  ...account
}: AccountParams & { limit?: number; untilId?: string }) => {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error("クリップの取得数が正しくありません");
  return request<MisskeyClip[]>("clips/list", account, { limit, ...(untilId ? { untilId } : {}) });
};

export const misskeyAddNoteToClip = (params: NoteParams & { clipId: string }) => {
  if (!params.noteId?.trim() || !params.clipId?.trim()) throw new Error("投稿とクリップを指定してください");
  return request<void>("clips/add-note", params, { noteId: params.noteId, clipId: params.clipId }, true);
};
