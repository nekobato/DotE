import { defineStore } from "pinia";
import { reactive } from "vue";
import { useStore, type DotEPost } from ".";
import { ipcInvoke } from "@/utils/ipc";
import { updatePostAcrossTimelines } from "@/utils/updatePostAcrossTimelines";
import type { MisskeyNote } from "@shared/types/misskey";
import type { ApiInvokeResult } from "@shared/types/ipc";
import {
  describeMisskeyManagementError,
  isMisskeyNoteState,
  isUnsupportedMisskeyOperation,
  misskeyApiErrorCode,
  type MisskeyClip,
  type MisskeyNoteState,
} from "@shared/misskey-note-management";

export type MisskeyManagementParams = { userId: string; instanceUrl: string; noteId: string };
type Context = MisskeyManagementParams & { token: string; instanceId: string };
type Operation = "state" | "favorite" | "mute" | "clip" | "unrenote";
type Entry = {
  state?: MisskeyNoteState;
  loading: boolean;
  busy: boolean;
  error: string;
  message: string;
  unsupported: Operation[];
  clips: MisskeyClip[];
  clipsLoading: boolean;
  clipsLoaded: boolean;
  clipsHasMore: boolean;
  clippedIds: string[];
};
const clipPageSize = 50;

export const useMisskeyNoteManagementStore = defineStore("misskey-note-management", () => {
  const root = useStore();
  const entries = reactive(new Map<string, Entry>());
  const credentials = new Map<string, Context>();
  const keyOf = (params: MisskeyManagementParams) => `${params.userId}:${params.instanceUrl}:${params.noteId}`;
  const contextOf = (params: MisskeyManagementParams): Context | undefined => {
    const user = root.users.find((item) => item.id === params.userId);
    const instance = root.instances.find((item) => item.id === user?.instanceId);
    if (!user?.token || instance?.type !== "misskey" || instance.url !== params.instanceUrl || !params.noteId)
      return undefined;
    return { ...params, token: user.token, instanceId: user.instanceId };
  };
  const entryFor = (params: MisskeyManagementParams): Entry | undefined => {
    const context = contextOf(params);
    if (!context) return undefined;
    const key = keyOf(context);
    const previous = credentials.get(key);
    if (!entries.has(key) || previous?.token !== context.token || previous.instanceId !== context.instanceId) {
      credentials.set(key, context);
      entries.set(key, {
        loading: false,
        busy: false,
        error: "",
        message: "",
        unsupported: [],
        clips: [],
        clipsLoading: false,
        clipsLoaded: false,
        clipsHasMore: false,
        clippedIds: [],
      });
    }
    return entries.get(key);
  };
  const isCurrent = (context: Context, entry: Entry) => {
    const current = contextOf(context);
    return (
      current?.token === context.token &&
      current.instanceId === context.instanceId &&
      entries.get(keyOf(context)) === entry
    );
  };
  const invoke = async <T>(context: Context, method: string, args: object = {}): Promise<ApiInvokeResult<T>> => {
    try {
      return await ipcInvoke("api", {
        method,
        instanceUrl: context.instanceUrl,
        token: context.token,
        noteId: context.noteId,
        ...args,
      });
    } catch {
      return { ok: false, error: { type: "network", message: "Request failed" } };
    }
  };
  const fail = (entry: Entry, operation: Operation, result: ApiInvokeResult<unknown>) => {
    entry.error = result.ok
      ? "サーバーから操作の状態を取得できませんでした"
      : describeMisskeyManagementError(result.error);
    if (!result.ok && isUnsupportedMisskeyOperation(result.error) && !entry.unsupported.includes(operation))
      entry.unsupported.push(operation);
    return false;
  };

  const loadState = async (params: MisskeyManagementParams): Promise<boolean> => {
    const context = contextOf(params);
    const entry = entryFor(params);
    if (!context || !entry || entry.busy || entry.loading) return false;
    entry.loading = true;
    entry.error = "";
    entry.message = "";
    try {
      const result = await invoke<MisskeyNoteState>(context, "misskey:getNoteState");
      if (!isCurrent(context, entry)) return false;
      if (!result.ok || !isMisskeyNoteState(result.data)) {
        entry.state = undefined;
        return fail(entry, "state", result);
      }
      entry.state = result.data;
      entry.unsupported = entry.unsupported.filter((item) => item !== "state");
      return true;
    } finally {
      entry.loading = false;
    }
  };

  const setState = async (
    params: MisskeyManagementParams,
    operation: "favorite" | "mute",
    value: boolean,
  ): Promise<boolean> => {
    const context = contextOf(params);
    const entry = entryFor(params);
    if (
      !context ||
      !entry?.state ||
      entry.loading ||
      entry.clipsLoading ||
      entry.busy ||
      entry.unsupported.includes(operation)
    )
      return false;
    const field = operation === "favorite" ? "isFavorited" : "isMutedThread";
    if (entry.state[field] === value) return true;
    entry.busy = true;
    entry.error = "";
    entry.message = "";
    try {
      const method =
        operation === "favorite"
          ? value
            ? "misskey:favoriteNote"
            : "misskey:unfavoriteNote"
          : value
            ? "misskey:muteThread"
            : "misskey:unmuteThread";
      const result = await invoke<void>(context, method);
      if (!isCurrent(context, entry)) return false;
      if (result.ok) {
        if (entry.state) entry.state = { ...entry.state, [field]: value };
      } else {
        const refreshed = await invoke<MisskeyNoteState>(context, "misskey:getNoteState");
        if (!isCurrent(context, entry)) return false;
        if (refreshed.ok && isMisskeyNoteState(refreshed.data)) entry.state = refreshed.data;
        if (entry.state?.[field] !== value) return fail(entry, operation, result);
      }
      if (operation === "mute") {
        // The server owns thread membership; re-read other notes rather than guessing their thread id.
        entries.forEach((other, key) => {
          if (key.startsWith(`${context.userId}:${context.instanceUrl}:`) && other !== entry) other.state = undefined;
        });
      }
      entry.message =
        operation === "favorite"
          ? value
            ? "お気に入りに追加しました"
            : "お気に入りを解除しました"
          : value
            ? "スレッドをミュートしました"
            : "スレッドのミュートを解除しました";
      return true;
    } finally {
      entry.busy = false;
    }
  };

  const loadClips = async (params: MisskeyManagementParams, more = false): Promise<boolean> => {
    const context = contextOf(params);
    const entry = entryFor(params);
    if (!context || !entry || entry.busy || entry.clipsLoading) return false;
    const untilId = more ? entry.clips[entry.clips.length - 1]?.id : undefined;
    if (more && (!entry.clipsHasMore || !untilId)) return false;
    entry.clipsLoading = true;
    entry.error = "";
    entry.message = "";
    try {
      const result = await invoke<MisskeyClip[]>(context, "misskey:getClips", {
        limit: clipPageSize,
        ...(untilId ? { untilId } : {}),
      });
      if (!isCurrent(context, entry)) return false;
      if (!result.ok || !Array.isArray(result.data)) return fail(entry, "clip", result);
      const clips = result.data.filter((clip) => clip && typeof clip.id === "string" && typeof clip.name === "string");
      const combined = more ? [...entry.clips, ...clips] : clips;
      entry.clips = [...new Map(combined.map((clip) => [clip.id, clip])).values()];
      entry.clipsLoaded = true;
      // Older Misskey releases return an unpaginated list. Stop if the cursor repeats.
      entry.clipsHasMore = clips.length === clipPageSize && clips[clips.length - 1]?.id !== untilId;
      return true;
    } finally {
      entry.clipsLoading = false;
    }
  };

  const addToClip = async (params: MisskeyManagementParams, clipId: string): Promise<boolean> => {
    const context = contextOf(params);
    const entry = entryFor(params);
    if (
      !context ||
      !entry ||
      entry.busy ||
      entry.clipsLoading ||
      entry.unsupported.includes("clip") ||
      !entry.clips.some((clip) => clip.id === clipId)
    )
      return false;
    if (entry.clippedIds.includes(clipId)) return true;
    entry.busy = true;
    entry.error = "";
    entry.message = "";
    try {
      const result = await invoke<void>(context, "misskey:addNoteToClip", { clipId });
      if (!isCurrent(context, entry)) return false;
      if (!result.ok && misskeyApiErrorCode(result.error) !== "ALREADY_CLIPPED") return fail(entry, "clip", result);
      entry.clippedIds.push(clipId);
      entry.message = result.ok ? "クリップに追加しました" : "この投稿は既にクリップに追加されています";
      return true;
    } finally {
      entry.busy = false;
    }
  };

  const unrenote = async (params: MisskeyManagementParams): Promise<boolean> => {
    const context = contextOf(params);
    const entry = entryFor(params);
    if (!context || !entry || entry.loading || entry.busy || entry.unsupported.includes("unrenote")) return false;
    entry.busy = true;
    entry.error = "";
    entry.message = "";
    try {
      // Local account ids are UUIDs; fetch the server's user id before removing its notes from caches.
      const account = await invoke<{ id: string }>(context, "misskey:getI");
      if (!isCurrent(context, entry)) return false;
      if (!account.ok || typeof account.data?.id !== "string") return fail(entry, "unrenote", account);
      const result = await invoke<void>(context, "misskey:unrenote");
      if (!isCurrent(context, entry)) return false;
      if (!result.ok) return fail(entry, "unrenote", result);
      const keep = (post: DotEPost) => {
        const note = post as MisskeyNote;
        return note.userId !== account.data.id || note.renoteId !== context.noteId;
      };
      root.timelines.forEach((timeline) => {
        if (timeline.userId !== context.userId) return;
        timeline.posts = timeline.posts.filter(keep);
        timeline.pendingNewPosts = timeline.pendingNewPosts.filter(keep);
      });
      const refreshed = await invoke<MisskeyNote>(context, "misskey:getNote");
      if (!isCurrent(context, entry)) return false;
      if (refreshed.ok && refreshed.data?.id === context.noteId)
        updatePostAcrossTimelines(root.timelines, refreshed.data, context.userId);
      entry.message = "この投稿への自分のRenote・引用を取り消しました";
      return true;
    } finally {
      entry.busy = false;
    }
  };

  return { entryFor, loadState, setState, loadClips, addToClip, unrenote };
});
