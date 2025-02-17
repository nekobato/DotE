import type { MisskeyEntities, MisskeyNote } from "@shared/types/misskey";
import { ipcInvoke } from "@/utils/ipc";
import { defineStore } from "pinia";
import { computed } from "vue";
import { DotEPost, TimelineStore, methodOfChannel, useStore } from ".";
import type { Timeline } from "@shared/types/store";
import { MastodonNotification, MastodonToot } from "@/types/mastodon";
import { defaultChannelNameFromType } from "@/utils/dote";
import { AppBskyFeedDefs } from "@atproto/api";

export const useTimelineStore = defineStore("timeline", () => {
  const store = useStore();
  const current = computed(() => store.$state.timelines.find((timeline) => timeline.available));
  const currentIndex = computed(() => store.$state.timelines.findIndex((timeline) => timeline.available));
  const timelines = computed(() => store.$state.timelines);

  const currentUser = computed(() => {
    return store.$state.users.find((user) => user.id === current?.value?.userId);
  });

  const currentInstance = computed(() => {
    return store.$state.instances.find((instance) => instance.id === currentUser?.value?.instanceId);
  });

  const setPosts = (posts: DotEPost[]) => {
    if (store.$state.timelines[currentIndex.value]) {
      store.$state.timelines[currentIndex.value].posts = posts;

      if (store.$state.settings.maxPostCount < store.$state.timelines[currentIndex.value].posts.length) {
        store.$state.timelines[currentIndex.value].posts = store.$state.timelines[currentIndex.value].posts.slice(
          0,
          store.$state.settings.maxPostCount,
        );
      }
    }
  };

  const setNotifications = (notifications: MisskeyEntities.Notification[] | MastodonNotification[]) => {
    if (store.$state.timelines[currentIndex.value]) {
      store.$state.timelines[currentIndex.value].notifications = notifications;
    }
  };

  const fetchInitialPosts = async () => {
    if (!current.value || !currentUser.value || !currentInstance.value) {
      throw new Error("ユーザーが見つかりませんでした");
    }

    const data = await ipcInvoke("api", {
      method: methodOfChannel[current.value.channel],
      instanceUrl: currentInstance.value?.url,
      channelId: current?.value.options?.channelId, // option
      antennaId: current?.value.options?.antennaId, // option
      listId: current?.value.options?.listId, // option
      query: current?.value.options?.query, // option
      tag: current?.value.options?.tag, // option
      token: currentUser.value.token,
      session: currentUser.value.blueskySession,
      limit: 40,
    }).catch(() => {
      store.$state.errors.push({
        message: `${currentInstance.value?.name}のタイムラインを取得できませんでした`,
      });
    });
    if (data.error) {
      store.$state.errors.push({
        message: `${currentInstance.value?.name}のタイムラインを取得できませんでした (${data.error?.message})`,
      });
      return;
    }
    if (current.value.channel === "misskey:notifications" || current.value.channel === "mastodon:notifications") {
      setNotifications(data);
    } else {
      setPosts(data);
    }
  };

  const fetchDiffPosts = async () => {
    if (store.timelines[currentIndex.value]?.posts?.length === 0) return;
    if (current.value && currentUser.value && currentInstance.value) {
      try {
        const data: DotEPost[] = await ipcInvoke("api", {
          method: methodOfChannel[current.value.channel],
          instanceUrl: currentInstance.value?.url,
          token: currentUser.value.token,
          channelId: current?.value.options?.channelId, // option
          antennaId: current?.value.options?.antennaId, // option
          listId: current?.value.options?.listId, // option
          query: current?.value.options?.query, // option
          tag: current?.value.options?.tag, // option
          sinceId: store.timelines[currentIndex.value]?.posts[0]?.id,
          session: currentUser.value.blueskySession,
          limit: 40,
        });
        if (!data || data.length === 0) return;
        const filteredPosts = data.filter(
          (post) => !store.timelines[currentIndex.value]?.posts?.some((p) => p.id === post.id),
        );

        setPosts([...filteredPosts, ...store.timelines[currentIndex.value]?.posts]);
      } catch (e) {
        store.$state.errors.push({
          message: `${currentInstance.value?.name}の追加タイムラインを取得できませんでした`,
        });
      }
    } else {
      throw new Error("user not found");
    }
  };

  const updateTimeline = async ({ posts, ...timeline }: TimelineStore) => {
    await ipcInvoke("db:set-timeline", timeline);
    await store.initTimelines();
  };

  const createTimeline = async (timeline: Omit<Timeline, "id">) => {
    await ipcInvoke("db:set-timeline", timeline);
    await store.initTimelines();
  };

  const deleteTimelineByUserId = async (userId: string) => {
    store.$state.timelines.forEach(async (timeline) => {
      if (timeline.userId === userId) {
        await ipcInvoke("db:delete-timeline", {
          id: timeline.id,
        });
      }
    });
    // 更新してみる
    await store.initTimelines();
    // UserもTimelineも無いなら終わり
    if (store.$state.users.length === 0) {
      return;
    }
    // UserはいるけどTimelineが無いならTimelineを作る
    if (store.$state.timelines.length === 0) {
      const instance = store.instances.find((instance) => instance.id === store.users[0].instanceId);
      await createTimeline({
        userId: store.users[0].id,
        channel: defaultChannelNameFromType(instance?.type),
        options: {},
        updateInterval: 60 * 1000, // 60 sec
        available: true,
      });
      return;
    }

    // すべてのTimelineがavailableならば最初のTimelineをavailableにする
    if (!store.$state.timelines.some((timeline) => !timeline.available)) {
      await updateTimeline({
        ...store.$state.timelines[0],
        available: true,
      });
    }

    await store.initTimelines();
  };

  const deleteTimeline = async (timelineId: string) => {
    await ipcInvoke("db:delete-timeline", {
      id: timelineId,
    });
    await store.initTimelines();
  };

  const changeActiveTimeline = async (index: number) => {
    if (store.timelines[index].available) return;
    store.timelines.forEach(async (timeline, i) => {
      const { posts, notifications, ...timelineForStore } = timeline;
      if (i === index) {
        await ipcInvoke("db:set-timeline", {
          ...timelineForStore,
          available: true,
        });
      } else {
        await ipcInvoke("db:set-timeline", {
          ...timelineForStore,
          available: false,
        });
      }
    });
    await store.initTimelines();
  };

  const addNewPost = (post: DotEPost) => {
    // abort if no posts
    if (!store.timelines[currentIndex.value]?.posts) return;
    // detect duplicate
    if (store.timelines[currentIndex.value].posts.some((p) => p.id === post.id)) return;
    store.timelines[currentIndex.value].posts = [post, ...store.timelines[currentIndex.value].posts] as DotEPost[];

    if (store.settings.maxPostCount < store.timelines[currentIndex.value].posts.length) {
      store.timelines[currentIndex.value].posts.pop();
    }
  };

  const updatePost = <T extends DotEPost>(post: T) => {
    const currentPosts = store.timelines[currentIndex.value].posts as T[];
    if (!currentPosts) return;
    const postIndex = currentPosts.findIndex((p) => p.id === post.id);
    if (postIndex === -1) return;
    currentPosts.splice(postIndex, 1, post);
  };

  const removePost = (postId: string) => {
    if (!store.timelines[currentIndex.value]?.posts) return;
    store.timelines[currentIndex.value].posts = store.timelines[currentIndex.value].posts.filter(
      (post) => post.id !== postId,
    ) as DotEPost[];
  };

  const addNewNotification = <T extends MisskeyEntities.Notification | MastodonNotification>(notification: T) => {
    if (!store.timelines[currentIndex.value]?.notifications) return;
    store.timelines[currentIndex.value].notifications = [
      notification,
      ...store.timelines[currentIndex.value].notifications,
    ] as MisskeyEntities.Notification[] | MastodonNotification[];
  };

  const addMorePosts = (posts: DotEPost[]) => {
    if (!store.timelines[currentIndex.value]?.posts) return;
    const filteredPosts = posts.filter(
      (post) => !store.timelines[currentIndex.value].posts.some((p) => p.id === post.id),
    );
    store.timelines[currentIndex.value].posts = [
      ...store.timelines[currentIndex.value].posts,
      ...filteredPosts,
    ] as DotEPost[];
  };

  const addMoreNotifications = (notifications: MisskeyEntities.Notification[] | MastodonNotification[]) => {
    if (!store.timelines[currentIndex.value]?.notifications) return;
    store.timelines[currentIndex.value].notifications = [
      ...store.timelines[currentIndex.value].notifications,
      ...notifications,
    ] as MisskeyEntities.Notification[] | MastodonNotification[];
  };

  const misskeyAddEmoji = async ({ postId, name }: { postId: string; name: string }) => {
    const post = store.timelines[currentIndex.value].posts.find((post) => post.id === postId) as MisskeyNote;
    const reactions = post?.renote ? post.renote.reactions : post?.reactions;
    if (!reactions) return;
    if (Object.keys(reactions).includes(name)) {
      reactions[name] += 1;
    } else {
      reactions[name] = 1;
    }
  };

  const misskeyCreateReaction = async ({ postId, reaction }: { postId: string; reaction: string }) => {
    if (currentUser.value) {
      await ipcInvoke("api", {
        method: "misskey:createReaction",
        instanceUrl: currentInstance.value?.url,
        token: currentUser.value.token,
        noteId: postId,
        reaction: reaction,
      }).catch(() => {
        store.$state.errors.push({
          message: `${postId}へのリアクション失敗`,
        });
      });
    } else {
      throw new Error("user not found");
    }
  };

  const misskeyDeleteReaction = async ({ postId }: { postId: string }) => {
    if (currentUser.value) {
      await ipcInvoke("api", {
        method: "misskey:deleteReaction",
        instanceUrl: currentInstance.value?.url,
        token: currentUser.value.token,
        noteId: postId,
      }).catch(() => {
        store.$state.errors.push({
          message: `${postId}のリアクション削除失敗`,
        });
      });
    } else {
      throw new Error("user not found");
    }
  };

  const misskeyUpdatePost = async ({ postId }: { postId: string }) => {
    if (!store.timelines[currentIndex.value] || !currentUser.value) return;

    const res = await ipcInvoke("api", {
      method: "misskey:getNote",
      instanceUrl: currentInstance.value?.url,
      token: currentUser.value.token,
      noteId: postId,
    }).catch(() => {
      store.$state.errors.push({
        message: `${postId}の取得失敗`,
      });
    });
    const postIndex = current.value?.posts.findIndex((p) => p.id === postId);
    if (!postIndex) return;

    store.timelines[currentIndex.value].posts.splice(postIndex, 1, res);
  };

  const misskeyAddReaction = async ({ postId, reaction }: { postId: string; reaction: string }) => {
    // TODO: reactionがremote serverだった場合
    const post = store.timelines[currentIndex.value].posts.find((p) => p.id === postId) as MisskeyNote;
    if (!post) return;
    const reactions = post.renote ? post.renote.reactions : post.reactions;
    if (Object.keys(reactions).includes(reaction)) {
      reactions[reaction] += 1;
    } else {
      reactions[reaction] = 1;
    }
  };

  const misskeyGetFollowedChannels = () => {
    if (!currentUser.value) return;
    const myChannels = ipcInvoke("api", {
      method: "misskey:getFollowedChannels",
      instanceUrl: currentInstance.value?.url,
      token: currentUser.value.token,
    }).catch(() => {
      store.$state.errors.push({
        message: "チャンネルの取得に失敗しました",
      });
      console.error("チャンネルの取得に失敗しました");
    });
    return myChannels;
  };

  const misskeyGetMyAntennas = () => {
    if (!currentUser.value) return;
    const myAntennas = ipcInvoke("api", {
      method: "misskey:getMyAntennas",
      instanceUrl: currentInstance.value?.url,
      token: currentUser.value.token,
    }).catch(() => {
      store.$state.errors.push({
        message: "アンテナの取得に失敗しました",
      });
      console.error("アンテナの取得に失敗しました");
    });
    return myAntennas;
  };

  const misskeyGetUserLists = () => {
    if (!currentUser.value) return;
    const userLists = ipcInvoke("api", {
      method: "misskey:getUserLists",
      instanceUrl: currentInstance.value?.url,
      token: currentUser.value.token,
      userId: currentUser.value.id,
    }).catch(() => {
      store.$state.errors.push({
        message: "リストの取得に失敗しました",
      });
      console.error("リストの取得に失敗しました");
    });
    return userLists;
  };

  const mastodonGetList = async () => {
    if (!currentUser.value) return;
    const res = await ipcInvoke("api", {
      method: "mastodon:getList",
      instanceUrl: currentInstance.value?.url,
      token: currentUser.value.token,
    }).catch(() => {
      store.$state.errors.push({
        message: `リストの取得失敗`,
      });
    });
    return res;
  };

  const mastodonToggleFavourite = async ({ id, favourited }: { id: string; favourited: boolean }) => {
    if (currentUser.value) {
      await ipcInvoke("api", {
        method: favourited ? "mastodon:unFavourite" : "mastodon:favourite",
        instanceUrl: currentInstance.value?.url,
        token: currentUser.value.token,
        id: id,
      }).catch(() => {
        return store.$state.errors.push({
          message: `${id}の${favourited ? "お気に入り解除" : "お気に入り"}失敗`,
        });
      });
      const toot = store.$state.timelines[currentIndex.value].posts.find((post) => post.id === id) as MastodonToot;
      if (favourited) {
        toot.favourited = false;
        toot.favourites_count -= 1;
      } else {
        toot.favourited = true;
        toot.favourites_count += 1;
      }
    } else {
      throw new Error("user not found");
    }
  };

  const mastodonUpdatePost = async ({ id }: { id: string }) => {
    if (!store.timelines[currentIndex.value] || !currentUser.value) return;

    const res = await ipcInvoke("api", {
      method: "mastodon:getStatus",
      instanceUrl: currentInstance.value?.url,
      token: currentUser.value.token,
      id: id,
    }).catch(() => {
      store.$state.errors.push({
        message: `${id}の取得失敗`,
      });
    });
    const postIndex = current.value?.posts.findIndex((p) => p.id === id);
    if (!postIndex) return;

    store.timelines[currentIndex.value].posts.splice(postIndex, 1, res);
  };

  const blueskyUpdatePost = async ({ id }: { id: string }) => {
    if (!store.timelines[currentIndex.value] || !currentUser.value) return;

    const res = await ipcInvoke("api", {
      method: "bluesky:getPost",
      instanceUrl: currentInstance.value?.url,
      session: currentUser.value.blueskySession,
      id: id,
    }).catch(() => {
      store.$state.errors.push({
        message: `${id}の取得失敗`,
      });
    });
    const postIndex = current.value?.posts.findIndex((p) => p.id === id);
    if (!postIndex) return;

    store.timelines[currentIndex.value].posts.splice(postIndex, 1, res);
  };

  const blueskyLikePost = async ({ uri, cid }: { uri: string; cid: string }) => {
    if (!store.timelines[currentIndex.value] || !currentUser.value) return;

    const res = await ipcInvoke("api", {
      method: "bluesky:like",
      instanceUrl: currentInstance.value?.url,
      session: currentUser.value.blueskySession,
      uri,
      cid,
    }).catch(() => {
      store.$state.errors.push({
        message: `${cid}のいいね失敗`,
      });
    });

    const posts = store.timelines[currentIndex.value].posts as AppBskyFeedDefs.FeedViewPost[];

    const postIndex = posts.findIndex((p) => p.post.uri === uri);
    if (!postIndex || !posts[postIndex].post.viewer) return;

    posts[postIndex].post.viewer.like = res.uri;
  };

  const blueskyDeleteLike = async ({ uri }: { uri: string }) => {
    if (!store.timelines[currentIndex.value] || !currentUser.value) return;

    await ipcInvoke("api", {
      method: "bluesky:deleteLike",
      instanceUrl: currentInstance.value?.url,
      session: currentUser.value.blueskySession,
      uri: uri,
    }).catch(() => {
      store.$state.errors.push({
        message: `${uri}のいいね削除失敗`,
      });
    });

    const posts = store.timelines[currentIndex.value].posts as AppBskyFeedDefs.FeedViewPost[];

    const postIndex = posts.findIndex((p) => p.post.viewer?.like === uri);
    if (!postIndex || !posts[postIndex].post.viewer) return;

    posts[postIndex].post.viewer.like = undefined;
  };

  const isTimelineAvailable = computed(() => {
    if (!current.value) return false;
    if (!current.value?.userId || !current.value?.channel || !current.value?.available) return false;
    if (current.value?.channel === "misskey:channel" && !current.value?.options?.channelId) return false;
    return true;
  });

  return {
    timelines,
    deleteTimeline,
    deleteTimelineByUserId,
    current,
    isTimelineAvailable,
    currentUser,
    currentInstance,
    fetchInitialPosts,
    fetchDiffPosts,
    updateTimeline,
    createTimeline,
    changeActiveTimeline,
    addNewPost,
    updatePost,
    removePost,
    addMorePosts,
    addNewNotification,
    addMoreNotifications,
    misskeyAddEmoji,
    misskeyAddReaction,
    misskeyCreateReaction,
    misskeyDeleteReaction,
    misskeyUpdatePost,
    misskeyGetFollowedChannels,
    misskeyGetMyAntennas,
    misskeyGetUserLists,
    mastodonGetList,
    mastodonToggleFavourite,
    mastodonUpdatePost,
    blueskyUpdatePost,
    blueskyLikePost,
    blueskyDeleteLike,
  };
});
