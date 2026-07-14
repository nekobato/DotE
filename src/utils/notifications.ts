import type { BlueskyNotification } from "@/types/bluesky";
import type { MastodonNotification } from "@/types/mastodon";
import { resolveBlueskyNotificationId } from "@/utils/bluesky";
import type { MisskeyEntities } from "@shared/types/misskey";
import type { ChannelName } from "@shared/types/store";

export type DotENotification = MisskeyEntities.Notification | MastodonNotification | BlueskyNotification;

export type NotificationReadMarker = {
  id: string;
  at: string;
};

const notificationChannels = new Set<ChannelName>([
  "misskey:notifications",
  "mastodon:notifications",
  "bluesky:notifications",
]);

/**
 * Check whether a channel displays account notifications.
 */
export const isNotificationChannel = (channel?: ChannelName): boolean => {
  return Boolean(channel && notificationChannels.has(channel));
};

/**
 * Check whether the notification carries Bluesky's native read state.
 */
export const isBlueskyNotification = (notification: DotENotification): notification is BlueskyNotification => {
  return "indexedAt" in notification && "isRead" in notification;
};

/**
 * Resolve a stable notification id across supported platforms.
 */
export const resolveNotificationId = (notification: DotENotification): string => {
  if (isBlueskyNotification(notification)) return resolveBlueskyNotificationId(notification);
  if ("id" in notification && notification.id) return notification.id;
  return "";
};

/**
 * Resolve a notification creation timestamp across supported platforms.
 */
export const resolveNotificationCreatedAt = (notification: DotENotification): string => {
  if ("createdAt" in notification && typeof notification.createdAt === "string") return notification.createdAt;
  if ("created_at" in notification && typeof notification.created_at === "string") return notification.created_at;
  if ("indexedAt" in notification && typeof notification.indexedAt === "string") return notification.indexedAt;
  return "";
};

/**
 * Resolve the marker represented by the newest notification in a descending notification list.
 */
export const resolveLatestNotificationMarker = (notifications: DotENotification[]): NotificationReadMarker | null => {
  const latest = notifications[0];
  if (!latest) return null;
  const id = resolveNotificationId(latest);
  if (!id) return null;
  return {
    id,
    at: resolveNotificationCreatedAt(latest) || new Date().toISOString(),
  };
};

/**
 * Check whether one notification is newer than the saved read marker.
 */
export const isUnreadNotification = ({
  notification,
  markerId,
  markerAt,
}: {
  notification: DotENotification;
  markerId?: string;
  markerAt?: string;
}): boolean => {
  if (isBlueskyNotification(notification) && !markerId && !markerAt) {
    return !notification.isRead;
  }

  const notificationId = resolveNotificationId(notification);
  if (markerId && notificationId === markerId) return false;

  const notificationTime = Date.parse(resolveNotificationCreatedAt(notification));
  const markerTime = markerAt ? Date.parse(markerAt) : Number.NaN;
  if (Number.isFinite(notificationTime) && Number.isFinite(markerTime)) {
    return notificationTime > markerTime;
  }

  return !markerId;
};

/**
 * Count unread notifications using platform read state when available, otherwise using DotE's marker.
 */
export const countUnreadNotifications = ({
  notifications,
  markerId,
  markerAt,
}: {
  notifications: DotENotification[];
  markerId?: string;
  markerAt?: string;
}): number => {
  const markerIndex = markerId
    ? notifications.findIndex((notification) => resolveNotificationId(notification) === markerId)
    : -1;

  if (markerIndex >= 0 && !markerAt) {
    return markerIndex;
  }

  return notifications.filter((notification) =>
    isUnreadNotification({
      notification,
      markerId,
      markerAt,
    }),
  ).length;
};
