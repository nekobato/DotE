import type { AppBskyFeedDefs, AppBskyNotificationListNotifications } from "@atproto/api";

export type BlueskyPost = AppBskyFeedDefs.PostView;

export type BlueskyFeedPost = AppBskyFeedDefs.FeedViewPost & { id: string };

export type BlueskyNotification = AppBskyNotificationListNotifications.Notification;

export type BlueskyPostType = "post" | "reply" | "replied" | "repost" | "quote" | "reposted" | "quoted";
