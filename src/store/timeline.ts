import type { MisskeyEntities } from "@shared/types/misskey";
import { ipcInvoke } from "@/utils/ipc";
import { defineStore } from "pinia";
import { computed } from "vue";
import { DotEPost, TimelineStore, useStore } from ".";
import type { Timeline, InstanceStore } from "@shared/types/store";
import { MastodonNotification } from "@/types/mastodon";
import { defaultChannelNameFromType } from "@/utils/dote";
import { useBlueskyStore } from "./bluesky";
import { useMisskeyStore } from "./misskey";
import { useMastodonStore } from "./mastodon";
import { updatePostAcrossTimelines } from "@/utils/updatePostAcrossTimelines";

export const useTimelineStore = defineStore("timeline", () => {
  const store = useStore();
  const current = computed(() => store.$state.timelines.find((timeline) => timeline.available));
  const currentIndex = computed(() => store.$state.timelines.findIndex((timeline) => timeline.available));
  const timelines = computed(() => store.$state.timelines);

  /**
   * Get the currently active timeline state.
   */
  const getCurrentTimeline = () => {
    return store.$state.timelines[currentIndex.value];
  };

  const currentUser = computed(() => {
    return store.$state.users.find((user) => user.id === current?.value?.userId);
  });

  const currentInstance = computed(() => {
    return store.$state.instances.find((instance) => instance.id === currentUser?.value?.instanceId) as
      | InstanceStore
      | undefined;
  });

  const blueskyStore = useBlueskyStore();
  const misskeyStore = useMisskeyStore();
  const mastodonStore = useMastodonStore();

  /**
   * Normalize posts by removing duplicates while keeping order.
   */
  const uniquePostsById = (posts: DotEPost[]) => {
    const seen = new Set<string>();
    return posts.filter((post) => {
      if (seen.has(post.id)) return false;
      seen.add(post.id);
      return true;
    });
  };

  /**
   * Clear readmore state for the timeline.
   */
  const resetReadmoreState = (timeline: TimelineStore) => {
    timeline.readmoreLocked = false;
    timeline.pendingNewPosts = [];
  };

  /**
   * Queue posts while readmore is active.
   */
  const queuePendingPosts = (posts: DotEPost[]) => {
    const timeline = getCurrentTimeline();
    if (!timeline?.posts) return;
    const existingIds = new Set([
      ...timeline.posts.map((post) => post.id),
      ...timeline.pendingNewPosts.map((post) => post.id),
    ]);
    const unique = posts.filter((post) => !existingIds.has(post.id));
    if (unique.length === 0) return;
    timeline.pendingNewPosts = [...unique, ...timeline.pendingNewPosts];
  };

  /**
   * Apply pending posts to the timeline and unlock readmore.
   */
  const applyPendingNewPosts = () => {
    const timeline = getCurrentTimeline();
    if (!timeline?.posts) return;
    if (!timeline.pendingNewPosts.length) {
      timeline.readmoreLocked = false;
      return;
    }
    const mergedPosts = uniquePostsById([...timeline.pendingNewPosts, ...timeline.posts]);
    timeline.posts = mergedPosts.slice(0, store.$state.settings.maxPostCount);
    timeline.pendingNewPosts = [];
    timeline.readmoreLocked = false;
  };

  /**
   * Lock timeline updates while readmore is active.
   */
  const startReadmore = () => {
    const timeline = getCurrentTimeline();
    if (!timeline) return;
    timeline.readmoreLocked = true;
  };

  const pendingNewPostsCount = computed(() => getCurrentTimeline()?.pendingNewPosts?.length ?? 0);
  const isReadmoreLocked = computed(() => getCurrentTimeline()?.readmoreLocked ?? false);

  const setPosts = (posts: DotEPost[]) => {
    const timeline = getCurrentTimeline();
    if (!timeline) return;
    timeline.posts = posts;
    resetReadmoreState(timeline);

    if (store.$state.settings.maxPostCount < timeline.posts.length) {
      timeline.posts = timeline.posts.slice(0, store.$state.settings.maxPostCount);
    }
  };

  const setNotifications = (notifications: MisskeyEntities.Notification[] | MastodonNotification[]) => {
    if (store.$state.timelines[currentIndex.value]) {
      store.$state.timelines[currentIndex.value].notifications = notifications;
    }
  };

  // missky, mastodon, bluesky
  const fetchInitialPosts = async () => {
    if (!current.value || !currentUser.value || !currentInstance.value) {
      throw new Error("ユーザーが見つかりませんでした");
    }

    const instanceType = currentInstance.value.type;
    switch (instanceType) {
      case "bluesky":
        await blueskyStore.fetchPosts();
        break;
      case "misskey":
        await misskeyStore.fetchPosts();
        break;
      case "mastodon":
        await mastodonStore.fetchPosts();
        break;
      default:
        throw new Error(`未対応のインスタンスタイプ: ${instanceType}`);
    }
  };

  // misskey, mastotodon
  const fetchDiffPosts = async () => {
    if (store.timelines[currentIndex.value]?.posts?.length === 0) return;
    if (!current.value || !currentUser.value || !currentInstance.value) {
      throw new Error("ユーザーが見つかりませんでした");
    }

    const instanceType = currentInstance.value.type;
    switch (instanceType) {
      case "bluesky":
        // Blueskyは差分取得に対応していない
        break;
      case "misskey":
        await misskeyStore.fetchDiffPosts();
        break;
      case "mastodon":
        await mastodonStore.fetchDiffPosts();
        break;
      default:
        throw new Error(`未対応のインスタンスタイプ: ${instanceType}`);
    }
  };

  const updateTimeline = async ({ posts, notifications, pendingNewPosts, readmoreLocked, ...timeline }: TimelineStore) => {
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
      const { posts, notifications, pendingNewPosts, readmoreLocked, ...timelineForStore } = timeline;

      await ipcInvoke("db:set-timeline", {
        ...timelineForStore,
        available: i === index,
      });
    });
    await store.initTimelines();
  };

  const addNewPost = (post: DotEPost) => {
    const timeline = getCurrentTimeline();
    if (!timeline?.posts) return;
    if (timeline.readmoreLocked) {
      queuePendingPosts([post]);
      return;
    }
    // detect duplicate
    if (timeline.posts.some((p: DotEPost) => p.id === post.id)) return;
    timeline.posts = [post, ...timeline.posts] as DotEPost[];

    if (store.settings.maxPostCount < timeline.posts.length) {
      timeline.posts.pop();
    }
  };

  const updatePost = <T extends DotEPost>(post: T) => {
    const userId = currentUser.value?.id;
    if (!userId) return;
    updatePostAcrossTimelines(store.timelines, post, userId);
    const timeline = getCurrentTimeline();
    if (!timeline?.pendingNewPosts?.length) return;
    timeline.pendingNewPosts = timeline.pendingNewPosts.map((pending) =>
      pending.id === post.id ? post : pending,
    ) as DotEPost[];
  };

  const removePost = (postId: string) => {
    const timeline = getCurrentTimeline();
    if (!timeline?.posts) return;
    timeline.posts = timeline.posts.filter((post: DotEPost) => post.id !== postId) as DotEPost[];
    if (timeline.pendingNewPosts.length) {
      timeline.pendingNewPosts = timeline.pendingNewPosts.filter((post: DotEPost) => post.id !== postId) as DotEPost[];
    }
  };

  const addNewNotification = <T extends MisskeyEntities.Notification | MastodonNotification>(notification: T) => {
    if (!store.timelines[currentIndex.value]?.notifications) return;
    store.timelines[currentIndex.value].notifications = [
      notification,
      ...store.timelines[currentIndex.value].notifications,
    ] as MisskeyEntities.Notification[] | MastodonNotification[];
  };

  const addMorePosts = (posts: DotEPost[]) => {
    const timeline = getCurrentTimeline();
    if (!timeline?.posts) return;
    timeline.readmoreLocked = true;
    const filteredPosts = posts.filter((post: DotEPost) => !timeline.posts.some((p: DotEPost) => p.id === post.id));
    timeline.posts = [...timeline.posts, ...filteredPosts] as DotEPost[];
  };

  const addMoreNotifications = (notifications: MisskeyEntities.Notification[] | MastodonNotification[]) => {
    if (!store.timelines[currentIndex.value]?.notifications) return;
    store.timelines[currentIndex.value].notifications = [
      ...store.timelines[currentIndex.value].notifications,
      ...notifications,
    ] as MisskeyEntities.Notification[] | MastodonNotification[];
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
    currentIndex,
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
    setPosts,
    setNotifications,
    startReadmore,
    queuePendingPosts,
    applyPendingNewPosts,
    pendingNewPostsCount,
    isReadmoreLocked,
  };
});
