import type { MisskeyEntities } from "@shared/types/misskey";
import { ipcInvoke } from "@/utils/ipc";
import { defineStore } from "pinia";
import { computed } from "vue";
import { DotEPost, TimelineStore, useStore } from ".";
import type { Timeline, InstanceStore } from "@shared/types/store";
import { MastodonNotification } from "@/types/mastodon";
import type { BlueskyNotification } from "@/types/bluesky";
import { defaultChannelNameFromType } from "@/utils/dote";
import { useBlueskyStore } from "./bluesky";
import { useMisskeyStore } from "./misskey";
import { useMastodonStore } from "./mastodon";
import { updatePostAcrossTimelines } from "@/utils/updatePostAcrossTimelines";
import {
  countUnreadNotifications,
  isBlueskyNotification,
  isNotificationChannel,
  isUnreadNotification,
  resolveLatestNotificationMarker,
  resolveNotificationId,
  type DotENotification,
  type NotificationReadMarker,
} from "@/utils/notifications";

export const useTimelineStore = defineStore("timeline", () => {
  const store = useStore();
  const current = computed(() => store.$state.timelines.find((timeline) => timeline.available));
  const currentIndex = computed(() => store.$state.timelines.findIndex((timeline) => timeline.available));
  const timelines = computed(() => store.$state.timelines);
  let lastReadSaveTimer: ReturnType<typeof setTimeout> | undefined;
  const notificationReadTasks = new Map<string, Promise<boolean>>();

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
      InstanceStore | undefined;
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
   * Remove timeline-only runtime fields before persisting a timeline.
   */
  const toPersistedTimeline = (timeline: TimelineStore): Timeline => {
    const { posts, notifications, bluesky, pendingNewPosts, readmoreLocked, ...timelineForStore } = timeline;
    return timelineForStore;
  };

  /**
   * Persist a timeline without renderer-only fields.
   */
  const persistTimeline = async (timeline: TimelineStore) => {
    await ipcInvoke("db:set-timeline", toPersistedTimeline(timeline));
  };

  /**
   * Queue posts while readmore is active.
   */
  const queuePendingPosts = (posts: DotEPost[]) => {
    const timeline = getCurrentTimeline();
    if (!timeline?.posts) return;
    const existingIds = new Set([
      ...timeline.posts.map((post: DotEPost) => post.id),
      ...timeline.pendingNewPosts.map((post: DotEPost) => post.id),
    ]);
    const unique = posts.filter((post: DotEPost) => !existingIds.has(post.id));
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
    // Keep only the newest posts within maxPostCount.
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
  const notificationUnreadCountByTimelineId = computed(() => {
    return store.$state.timelines.reduce<Record<string, number>>((counts, timeline) => {
      if (!isNotificationChannel(timeline.channel)) {
        return counts;
      }

      counts[timeline.id] = countUnreadNotifications({
        notifications: timeline.notifications as DotENotification[],
        markerId: timeline.lastReadNotificationId,
        markerAt: timeline.lastReadNotificationAt,
      });
      return counts;
    }, {});
  });
  const currentNotificationUnreadCount = computed(() => {
    const timeline = getCurrentTimeline();
    if (!timeline) return 0;
    return notificationUnreadCountByTimelineId.value[timeline.id] ?? 0;
  });
  const isCurrentNotificationTimeline = computed(() => isNotificationChannel(getCurrentTimeline()?.channel));

  const setPosts = (posts: DotEPost[]) => {
    const timeline = getCurrentTimeline();
    if (!timeline) return;
    timeline.posts = posts;
    if (!timeline.readmoreLocked) {
      resetReadmoreState(timeline);
    }

    if (store.$state.settings.maxPostCount < timeline.posts.length) {
      timeline.posts = timeline.posts.slice(0, store.$state.settings.maxPostCount);
    }
  };

  const setNotifications = (
    notifications: MisskeyEntities.Notification[] | MastodonNotification[] | BlueskyNotification[],
  ) => {
    if (store.$state.timelines[currentIndex.value]) {
      store.$state.timelines[currentIndex.value].notifications = notifications;
    }
  };

  /**
   * Persist last read post id for the current timeline (debounced).
   */
  const setLastReadId = (postId: string, lastReadAt?: string) => {
    const timeline = store.$state.timelines[currentIndex.value];
    if (!timeline || !postId) return;
    if (timeline.lastReadId === postId && (!lastReadAt || timeline.lastReadAt === lastReadAt)) return;
    const previousLastReadId = timeline.lastReadId;
    const previousLastReadAt = timeline.lastReadAt;
    timeline.lastReadId = postId;
    if (lastReadAt) {
      timeline.lastReadAt = lastReadAt;
    }
    if (lastReadSaveTimer) {
      clearTimeout(lastReadSaveTimer);
    }
    lastReadSaveTimer = setTimeout(async () => {
      try {
        await persistTimeline(timeline);
      } catch (error) {
        console.error("Failed to persist timeline lastReadId", error);
        timeline.lastReadId = previousLastReadId;
        timeline.lastReadAt = previousLastReadAt;
      }
    }, 400);
  };

  /**
   * Resolve unread count for a timeline id.
   */
  const getNotificationUnreadCount = (timelineId?: string) => {
    if (!timelineId) return 0;
    return notificationUnreadCountByTimelineId.value[timelineId] ?? 0;
  };

  /**
   * Check whether a notification is unread in the current timeline.
   */
  const isCurrentNotificationUnread = (notification: DotENotification) => {
    const timeline = getCurrentTimeline();
    if (!timeline) return false;
    return isUnreadNotification({
      notification,
      markerId: timeline.lastReadNotificationId,
      markerAt: timeline.lastReadNotificationAt,
    });
  };

  /**
   * Mark locally cached Bluesky notifications as read after updateSeen succeeds.
   */
  const markBlueskyNotificationsAsRead = (timeline: TimelineStore) => {
    timeline.notifications = timeline.notifications.map((notification) => {
      const item = notification as DotENotification;
      if (!isBlueskyNotification(item)) return notification;
      return {
        ...item,
        isRead: true,
      };
    }) as MisskeyEntities.Notification[] | MastodonNotification[] | BlueskyNotification[];
  };

  /**
   * Apply DotE's local notification read marker to a timeline.
   */
  const applyNotificationReadMarker = (timeline: TimelineStore, marker: NotificationReadMarker) => {
    timeline.lastReadNotificationId = marker.id;
    timeline.lastReadNotificationAt = marker.at;
    markBlueskyNotificationsAsRead(timeline);
  };

  /**
   * Synchronize the notification read marker with the active platform.
   */
  const markPlatformNotificationsAsRead = async (timeline: TimelineStore, marker: NotificationReadMarker) => {
    const user = store.users.find((item) => item.id === timeline.userId);
    const instance = store.instances.find((item) => item.id === user?.instanceId);
    if (!user || !instance) {
      throw new Error("ユーザーが見つかりませんでした");
    }

    if (instance.type === "bluesky" && !user.blueskySession?.did) {
      throw new Error("Blueskyセッション情報が見つかりませんでした");
    }

    const result =
      instance.type === "misskey"
        ? await ipcInvoke("api", {
            method: "misskey:markAllNotificationsAsRead",
            instanceUrl: instance.url,
            token: user.token,
          })
        : instance.type === "mastodon"
          ? await ipcInvoke("api", {
              method: "mastodon:updateNotificationMarker",
              instanceUrl: instance.url,
              token: user.token,
              notificationId: marker.id,
            })
          : await ipcInvoke("api", {
              method: "bluesky:updateSeenNotifications",
              did: user.blueskySession!.did,
              seenAt: marker.at,
            });

    if (!result.ok) {
      throw new Error(result.error.message);
    }
  };

  /**
   * Mark loaded notifications in the active notification timeline as read.
   */
  const markCurrentNotificationsAsReadInternal = async (timeline: TimelineStore) => {
    if (!timeline || !isNotificationChannel(timeline.channel)) return false;
    if (getNotificationUnreadCount(timeline.id) === 0) return false;

    const latestMarker = resolveLatestNotificationMarker(timeline.notifications as DotENotification[]);
    if (!latestMarker) return false;
    const marker = {
      ...latestMarker,
      at: new Date().toISOString(),
    };

    const previousLastReadNotificationId = timeline.lastReadNotificationId;
    const previousLastReadNotificationAt = timeline.lastReadNotificationAt;
    const previousBlueskyReadState = new Map(
      (timeline.notifications as DotENotification[])
        .filter(isBlueskyNotification)
        .map((notification) => [resolveNotificationId(notification), notification.isRead]),
    );

    applyNotificationReadMarker(timeline, marker);

    try {
      await markPlatformNotificationsAsRead(timeline, marker);
      await persistTimeline(timeline);
      return true;
    } catch (error) {
      timeline.lastReadNotificationId = previousLastReadNotificationId;
      timeline.lastReadNotificationAt = previousLastReadNotificationAt;
      // Restore only the optimistic read flags, retaining notifications received during the request.
      timeline.notifications = timeline.notifications.map((notification) => {
        if (!isBlueskyNotification(notification)) return notification;
        const previousIsRead = previousBlueskyReadState.get(resolveNotificationId(notification));
        return previousIsRead === undefined ? notification : { ...notification, isRead: previousIsRead };
      }) as TimelineStore["notifications"];
      store.$state.errors.push({
        message: "通知の既読化に失敗しました",
      });
      console.error("Failed to mark notifications as read", error);
      return false;
    }
  };

  /**
   * Mark loaded notifications in the active notification timeline as read without overlapping requests.
   */
  const markCurrentNotificationsAsRead = async () => {
    const timeline = getCurrentTimeline();
    if (!timeline || !isNotificationChannel(timeline.channel)) return false;
    const pending = notificationReadTasks.get(timeline.id);
    if (pending) return pending;
    const task = markCurrentNotificationsAsReadInternal(timeline).finally(() => {
      notificationReadTasks.delete(timeline.id);
    });
    notificationReadTasks.set(timeline.id, task);
    return task;
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

  const updateTimeline = async (timeline: Timeline) => {
    await ipcInvoke("db:set-timeline", timeline);
    await store.initTimelines();
  };

  const createTimeline = async (timeline: Omit<Timeline, "id">) => {
    await ipcInvoke("db:set-timeline", timeline);
    await store.initTimelines();
  };

  /**
   * Keep the timeline state usable after one or more timelines were deleted.
   */
  const normalizeTimelinesAfterDeletion = async () => {
    await store.initTimelines();

    if (store.$state.users.length === 0) {
      return;
    }

    if (store.$state.timelines.length === 0) {
      const fallbackUser = store.users[0];
      const instance = store.instances.find((item) => item.id === fallbackUser.instanceId);

      await ipcInvoke("db:set-timeline", {
        userId: fallbackUser.id,
        channel: defaultChannelNameFromType(instance?.type),
        options: {},
        updateInterval: 60 * 1000, // 60 sec
        available: true,
      });
      await store.initTimelines();
      return;
    }

    if (!store.$state.timelines.some((timeline) => timeline.available)) {
      const { posts, notifications, bluesky, pendingNewPosts, readmoreLocked, ...timelineForStore } =
        store.$state.timelines[0];

      await ipcInvoke("db:set-timeline", {
        ...timelineForStore,
        available: true,
      });
      await store.initTimelines();
    }
  };

  const deleteTimelineByUserId = async (userId: string) => {
    const targetTimelines = store.$state.timelines.filter((timeline) => timeline.userId === userId);

    await Promise.all(
      targetTimelines.map((timeline) =>
        ipcInvoke("db:delete-timeline", {
          id: timeline.id,
        }),
      ),
    );

    await normalizeTimelinesAfterDeletion();
  };

  const deleteTimeline = async (timelineId: string) => {
    await ipcInvoke("db:delete-timeline", {
      id: timelineId,
    });
    await normalizeTimelinesAfterDeletion();
  };

  const changeActiveTimeline = async (index: number) => {
    if (lastReadSaveTimer) {
      clearTimeout(lastReadSaveTimer);
      lastReadSaveTimer = undefined;
    }
    if (!store.timelines[index] || store.timelines[index].available) return;

    store.$state.timelines.forEach((timeline, i) => {
      timeline.available = i === index;
    });

    await Promise.all(
      store.$state.timelines.map((timeline, i) =>
        ipcInvoke("db:set-timeline", {
          ...toPersistedTimeline(timeline),
          available: i === index,
        }),
      ),
    );
    await store.initTimelines();
  };

  const addNewPost = (post: DotEPost) => {
    const timeline = getCurrentTimeline();
    if (!timeline?.posts) return;
    const existingIndex = timeline.posts.findIndex((p: DotEPost) => p.id === post.id);
    if (existingIndex >= 0) {
      timeline.posts = timeline.posts.map((p: DotEPost, index: number) =>
        index === existingIndex ? post : p,
      ) as DotEPost[];
      return;
    }
    const existingPendingIndex = timeline.pendingNewPosts.findIndex((p: DotEPost) => p.id === post.id);
    if (existingPendingIndex >= 0) {
      timeline.pendingNewPosts = timeline.pendingNewPosts.map((p: DotEPost, index: number) =>
        index === existingPendingIndex ? post : p,
      ) as DotEPost[];
      return;
    }
    if (timeline.readmoreLocked) {
      queuePendingPosts([post]);
      return;
    }
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
    timeline.pendingNewPosts = timeline.pendingNewPosts.map((pending: DotEPost) =>
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

  const addNewNotification = <T extends MisskeyEntities.Notification | MastodonNotification | BlueskyNotification>(
    notification: T,
  ) => {
    if (!store.timelines[currentIndex.value]?.notifications) return;
    store.timelines[currentIndex.value].notifications = [
      notification,
      ...store.timelines[currentIndex.value].notifications,
    ] as MisskeyEntities.Notification[] | MastodonNotification[] | BlueskyNotification[];
  };

  const addMorePosts = (posts: DotEPost[]) => {
    const timeline = getCurrentTimeline();
    if (!timeline?.posts) return;
    const filteredPosts = posts.filter((post: DotEPost) => !timeline.posts.some((p: DotEPost) => p.id === post.id));
    timeline.posts = [...timeline.posts, ...filteredPosts] as DotEPost[];
  };

  const addMoreNotifications = (
    notifications: MisskeyEntities.Notification[] | MastodonNotification[] | BlueskyNotification[],
  ) => {
    if (!store.timelines[currentIndex.value]?.notifications) return;
    store.timelines[currentIndex.value].notifications = [
      ...store.timelines[currentIndex.value].notifications,
      ...notifications,
    ] as MisskeyEntities.Notification[] | MastodonNotification[] | BlueskyNotification[];
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
    setLastReadId,
    startReadmore,
    queuePendingPosts,
    applyPendingNewPosts,
    pendingNewPostsCount,
    isReadmoreLocked,
    currentNotificationUnreadCount,
    isCurrentNotificationTimeline,
    getNotificationUnreadCount,
    isCurrentNotificationUnread,
    markCurrentNotificationsAsRead,
  };
});
