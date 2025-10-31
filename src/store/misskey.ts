import { defineStore } from "pinia";
import { DotEPost, methodOfChannel, useStore, type TimelineStore } from ".";
import { useTimelineStore } from "./timeline";
import { ipcInvoke } from "@/utils/ipc";
import { MisskeyNote } from "@shared/types/misskey";
import type { ApiInvokeResult } from "@shared/types/ipc";

export const useMisskeyStore = defineStore("misskey", () => {
  const store = useStore();
  let timelineStore: ReturnType<typeof useTimelineStore>;

  // 初期化時に循環参照を避けるため、遅延初期化
  const getTimelineStore = () => {
    if (!timelineStore) {
      timelineStore = useTimelineStore();
    }
    return timelineStore;
  };

  const reportApiError = (result: ApiInvokeResult<unknown>, message: string) => {
    if (result.ok) return;
    store.$state.errors.push({
      message,
    });
    console.error(message, result.error);
  };

  const unwrapApiResult = <T>(result: ApiInvokeResult<T>, message: string): T | undefined => {
    if (!result.ok) {
      reportApiError(result, message);
      return undefined;
    }
    return result.data;
  };

  const isMisskeyNotePost = (post: DotEPost): post is MisskeyNote => {
    return (post as MisskeyNote).reactionEmojis !== undefined;
  };

  const forEachMisskeyNote = (callback: (note: MisskeyNote) => void) => {
    const visited = new WeakSet<MisskeyNote>();
    const traverse = (note?: MisskeyNote) => {
      if (!note || visited.has(note)) return;
      visited.add(note);
      callback(note);
      const renote = note.renote as MisskeyNote | undefined;
      if (renote) {
        traverse(renote);
      }
    };

    store.timelines.forEach((timeline: TimelineStore) => {
      timeline.posts.forEach((post: DotEPost) => {
        if (!isMisskeyNotePost(post)) return;
        traverse(post);
      });
    });
  };

  const updateNotesById = (noteId: string, updater: (note: MisskeyNote) => void) => {
    forEachMisskeyNote((note) => {
      if (note.id === noteId) {
        updater(note);
      }
    });
  };

  const findNoteById = (noteId: string): MisskeyNote | undefined => {
    let found: MisskeyNote | undefined;
    forEachMisskeyNote((note) => {
      if (!found && note.id === noteId) {
        found = note;
      }
    });
    return found;
  };

  const incrementReaction = (note: MisskeyNote, reaction: string, value = 1) => {
    const current = note.reactions[reaction] ?? 0;
    note.reactions[reaction] = current + value;
  };

  const decrementReaction = (note: MisskeyNote, reaction: string) => {
    const current = note.reactions[reaction];
    if (!current) return;
    if (current <= 1) {
      delete note.reactions[reaction];
    } else {
      note.reactions[reaction] = current - 1;
    }
  };

  const addEmoji = async ({ postId, name }: { postId: string; name: string }) => {
    updateNotesById(postId, (note) => {
      incrementReaction(note, name);
    });
  };

  const createMyReaction = async (postId: string, reaction: string) => {
    const timeline = getTimelineStore();

    if (timeline.currentUser) {
      const sourceNote = findNoteById(postId);
      const targetNote = (sourceNote?.renote as MisskeyNote | undefined) ?? sourceNote;
      if (!targetNote) return;

      const previousReaction = targetNote.myReaction;

      if (previousReaction === reaction) {
        return;
      }

      if (previousReaction && previousReaction !== reaction) {
        updateNotesById(targetNote.id, (note) => {
          decrementReaction(note, previousReaction);
          note.myReaction = undefined;
        });
      }

      updateNotesById(targetNote.id, (note) => {
        note.myReaction = reaction;
        incrementReaction(note, reaction);
      });

      const result = await ipcInvoke("api", {
        method: "misskey:createReaction",
        instanceUrl: timeline.currentInstance?.url,
        token: timeline.currentUser.token,
        noteId: targetNote.id,
        reaction: reaction,
      });
      if (!result.ok) {
        reportApiError(result, `${targetNote.id}へのリアクション失敗`);
      }
    } else {
      throw new Error("user not found");
    }
  };

  const deleteMyReaction = async (postId: string) => {
    const timeline = getTimelineStore();

    if (timeline.currentUser) {
      const sourceNote = findNoteById(postId);
      const targetNote = (sourceNote?.renote as MisskeyNote | undefined) ?? sourceNote;
      if (!targetNote || !targetNote.myReaction) return;

      const myReaction = targetNote.myReaction;

      updateNotesById(targetNote.id, (note) => {
        decrementReaction(note, myReaction);
        note.myReaction = undefined;
      });

      const result = await ipcInvoke("api", {
        method: "misskey:deleteReaction",
        instanceUrl: timeline.currentInstance?.url,
        token: timeline.currentUser.token,
        noteId: targetNote.id,
      });
      if (!result.ok) {
        reportApiError(result, `${targetNote.id}のリアクション削除失敗`);
      }
    } else {
      throw new Error("user not found");
    }
  };

  const updatePost = async ({ postId }: { postId: string }) => {
    const timeline = getTimelineStore();
    if (!store.timelines[timeline.currentIndex] || !timeline.currentUser) return;

    const result = await ipcInvoke("api", {
      method: "misskey:getNote",
      instanceUrl: timeline.currentInstance?.url,
      token: timeline.currentUser.token,
      noteId: postId,
    });
    const res = unwrapApiResult(result, `${postId}の取得失敗`);
    if (!res) return;
    const postIndex = timeline.current?.posts.findIndex((p: DotEPost) => p.id === postId);
    if (!postIndex) return;

    store.timelines[timeline.currentIndex].posts.splice(postIndex, 1, res);
  };

  const addReaction = async ({ postId, reaction }: { postId: string; reaction: string }) => {
    updateNotesById(postId, (note) => {
      incrementReaction(note, reaction);
    });
  };

  const removeReaction = async ({ postId, reaction }: { postId: string; reaction: string }) => {
    updateNotesById(postId, (note) => {
      decrementReaction(note, reaction);
    });
  };

  const getFollowedChannels = async () => {
    const timeline = getTimelineStore();
    if (!timeline.currentUser) return [];
    const result = await ipcInvoke("api", {
      method: "misskey:getFollowedChannels",
      instanceUrl: timeline.currentInstance?.url,
      token: timeline.currentUser.token,
    });
    const channels = unwrapApiResult(result, "チャンネルの取得に失敗しました");
    return channels ?? [];
  };

  const getMyAntennas = async () => {
    const timeline = getTimelineStore();
    if (!timeline.currentUser) return [];
    const result = await ipcInvoke("api", {
      method: "misskey:getMyAntennas",
      instanceUrl: timeline.currentInstance?.url,
      token: timeline.currentUser.token,
    });
    const antennas = unwrapApiResult(result, "アンテナの取得に失敗しました");
    return antennas ?? [];
  };

  const getUserLists = async () => {
    const timeline = getTimelineStore();
    if (!timeline.currentUser) return [];
    const result = await ipcInvoke("api", {
      method: "misskey:getUserLists",
      instanceUrl: timeline.currentInstance?.url,
      token: timeline.currentUser.token,
      userId: timeline.currentUser.id,
    });
    const lists = unwrapApiResult(result, "リストの取得に失敗しました");
    return lists ?? [];
  };

  const fetchPosts = async () => {
    const timeline = getTimelineStore();
    if (!timeline.current || !timeline.currentUser || !timeline.currentInstance) {
      throw new Error("ユーザーが見つかりませんでした");
    }

    const result = await ipcInvoke("api", {
      method: methodOfChannel[timeline.current.channel],
      instanceUrl: timeline.currentInstance.url,
      channelId: timeline.current.options?.channelId, // option
      antennaId: timeline.current.options?.antennaId, // option
      listId: timeline.current.options?.listId, // option
      query: timeline.current.options?.query, // option
      tag: timeline.current.options?.tag, // option
      token: timeline.currentUser.token,
      limit: 40,
    });

    const data = unwrapApiResult(result, `${timeline.currentInstance?.name}のタイムラインを取得できませんでした`);
    if (!data) return;

    if (timeline.current.channel === "misskey:notifications") {
      timeline.setNotifications(data);
    } else {
      timeline.setPosts(data);
    }
  };

  const fetchDiffPosts = async () => {
    const timeline = getTimelineStore();
    if (store.timelines[timeline.currentIndex]?.posts?.length === 0) return;
    if (timeline.current && timeline.currentUser && timeline.currentInstance) {
      try {
        const result = await ipcInvoke("api", {
          method: methodOfChannel[timeline.current.channel],
          instanceUrl: timeline.currentInstance.url,
          token: timeline.currentUser.token,
          channelId: timeline.current.options?.channelId, // option
          antennaId: timeline.current.options?.antennaId, // option
          listId: timeline.current.options?.listId, // option
          query: timeline.current.options?.query, // option
          tag: timeline.current.options?.tag, // option
          sinceId: store.timelines[timeline.currentIndex]?.posts[0]?.id,
          limit: 40,
        });
        const data = unwrapApiResult(
          result,
          `${timeline.currentInstance?.name}の追加タイムラインを取得できませんでした`,
        );
        if (!Array.isArray(data) || data.length === 0) return;
        const filteredPosts = data.filter(
          (post: DotEPost) => !store.timelines[timeline.currentIndex]?.posts?.some((p: DotEPost) => p.id === post.id),
        );

        timeline.setPosts([...filteredPosts, ...store.timelines[timeline.currentIndex]?.posts]);
      } catch (e) {
        store.$state.errors.push({
          message: `${timeline.currentInstance?.name}の追加タイムラインを取得できませんでした`,
        });
      }
    } else {
      throw new Error("user not found");
    }
  };

  return {
    addEmoji,
    createMyReaction,
    deleteMyReaction,
    updatePost,
    addReaction,
    removeReaction,
    getFollowedChannels,
    getMyAntennas,
    getUserLists,
    fetchPosts,
    fetchDiffPosts,
  };
});
