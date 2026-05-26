import {
  AppBskyActorDefs,
  AppBskyEmbedExternal,
  AppBskyEmbedImages,
  AppBskyEmbedRecord,
  AppBskyEmbedRecordWithMedia,
  AppBskyFeedDefs,
  AppBskyFeedPost,
  AppBskyNotificationListNotifications,
} from "@atproto/api";
import type { BlueskyFeedPost, BlueskyPostType } from "@/types/bluesky";
import type { Attachment } from "@shared/types/post";
import { BlueskyChannelName } from "@shared/types/store";

export const blueskyChannelsMap: Record<BlueskyChannelName, string> = {
  "bluesky:homeTimeline": "ホーム",
  "bluesky:notifications": "通知",
};

export const blueskyChannels: BlueskyChannelName[] = Object.keys(blueskyChannelsMap) as BlueskyChannelName[];

export type BlueskyPostRef = {
  uri: string;
  cid: string;
};

export type BlueskyReplyRef = {
  root: BlueskyPostRef;
  parent: BlueskyPostRef;
};

/**
 * Resolve a stable DOM/read-state id for a Bluesky feed item.
 */
export const resolveBlueskyFeedItemId = (entry: AppBskyFeedDefs.FeedViewPost) => {
  if (entry.reason && AppBskyFeedDefs.isReasonRepost(entry.reason)) {
    const reasonId = entry.reason.uri || entry.reason.cid || `${entry.reason.by.did}:${entry.reason.indexedAt}`;
    return `${entry.post.uri}#${reasonId}`;
  }

  return entry.post.uri;
};

/**
 * Attach the app-local id used by generic timeline store helpers.
 */
export const withBlueskyFeedItemId = (entry: AppBskyFeedDefs.FeedViewPost): BlueskyFeedPost => {
  return {
    ...entry,
    id: resolveBlueskyFeedItemId(entry),
  };
};

/**
 * Remove duplicate Bluesky feed items while preserving their order.
 */
export const uniqueBlueskyFeedItems = (entries: AppBskyFeedDefs.FeedViewPost[]): BlueskyFeedPost[] => {
  const seen = new Set<string>();

  return entries.filter((entry) => {
    const id = resolveBlueskyFeedItemId(entry);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  }).map(withBlueskyFeedItemId);
};

/**
 * Resolve a stable id for a Bluesky notification item.
 */
export const resolveBlueskyNotificationId = (notification: AppBskyNotificationListNotifications.Notification) => {
  return `${notification.uri}#${notification.reasonSubject ?? notification.reason}`;
};

/**
 * Remove duplicate Bluesky notifications while preserving their order.
 */
export const uniqueBlueskyNotifications = (notifications: AppBskyNotificationListNotifications.Notification[]) => {
  const seen = new Set<string>();

  return notifications.filter((notification) => {
    const id = resolveBlueskyNotificationId(notification);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

/**
 * Convert a Bluesky post-like value into the strong reference required by reply and quote records.
 */
const toBlueskyPostRef = (value: unknown): BlueskyPostRef | undefined => {
  if (typeof value !== "object" || value === null) return undefined;
  const post = value as Partial<BlueskyPostRef>;
  if (typeof post.uri !== "string" || typeof post.cid !== "string") return undefined;
  return { uri: post.uri, cid: post.cid };
};

/**
 * Resolve the root and immediate parent references for replying to a Bluesky feed item.
 */
export const resolveBlueskyReplyRef = (entry: AppBskyFeedDefs.FeedViewPost): BlueskyReplyRef => {
  const parent = toBlueskyPostRef(entry.post);
  if (!parent) {
    throw new Error("Blueskyの返信対象が見つかりませんでした");
  }

  return {
    root: toBlueskyPostRef(entry.reply?.root) ?? parent,
    parent,
  };
};

export const deriveBlueskyPostKind = (entry: AppBskyFeedDefs.FeedViewPost): BlueskyPostType[] => {
  if (entry.reply && AppBskyFeedDefs.isReplyRef(entry.reply)) {
    return ["reply"];
  }

  if (entry.reason) {
    if (AppBskyFeedDefs.isReasonRepost(entry.reason)) {
      return ["repost", "reposted"];
    }
  }

  const embed = entry.post.embed;
  if (embed && (AppBskyEmbedRecord.isView(embed) || AppBskyEmbedRecordWithMedia.isView(embed))) {
    return ["quote", "quoted"];
  }

  return ["post"];
};

const collectAttachmentsFromEmbed = (embed: unknown, attachments: Attachment[]): void => {
  if (!embed) return;

  if (AppBskyEmbedImages.isView(embed)) {
    const view = embed as AppBskyEmbedImages.View;
    attachments.push(
      ...view.images.map((image) => ({
        type: "image" as const,
        url: image.fullsize,
        thumbnailUrl: image.thumb,
        size: {
          width: image.aspectRatio?.width,
          height: image.aspectRatio?.height,
        },
      })),
    );
    return;
  }

  if (AppBskyEmbedExternal.isView(embed)) {
    const view = embed as AppBskyEmbedExternal.View;
    attachments.push({
      type: "url",
      url: view.external.uri,
    });
    return;
  }

  if (AppBskyEmbedRecordWithMedia.isView(embed)) {
    const view = embed as AppBskyEmbedRecordWithMedia.View;
    collectAttachmentsFromEmbed(view.media, attachments);
    collectAttachmentsFromEmbed(view.record, attachments);
    return;
  }

  if (AppBskyEmbedRecord.isView(embed)) {
    const view = embed as AppBskyEmbedRecord.View;
    const record = view.record;
    if (AppBskyEmbedRecord.isViewRecord(record) && record.embeds) {
      record.embeds.forEach((nestedEmbed) => collectAttachmentsFromEmbed(nestedEmbed, attachments));
    }
  }
};

export const extractBlueskyAttachments = (entry: AppBskyFeedDefs.FeedViewPost): Attachment[] => {
  const attachments: Attachment[] = [];
  collectAttachmentsFromEmbed(entry.post.embed, attachments);
  return attachments;
};

const resolveRecordFromEmbed = (embed: unknown): AppBskyEmbedRecord.ViewRecord | undefined => {
  if (!embed) return;

  if (AppBskyEmbedRecord.isView(embed)) {
    const view = embed as AppBskyEmbedRecord.View;
    if (AppBskyEmbedRecord.isViewRecord(view.record)) {
      return view.record as AppBskyEmbedRecord.ViewRecord;
    }
  }

  if (AppBskyEmbedRecordWithMedia.isView(embed)) {
    const view = embed as AppBskyEmbedRecordWithMedia.View;
    const recordView = view.record;
    if (AppBskyEmbedRecord.isView(recordView) && AppBskyEmbedRecord.isViewRecord(recordView.record)) {
      return recordView.record as AppBskyEmbedRecord.ViewRecord;
    }
  }

  return undefined;
};

export const extractQuotedRecord = (entry: AppBskyFeedDefs.FeedViewPost): AppBskyEmbedRecord.ViewRecord | undefined => {
  return resolveRecordFromEmbed(entry.post.embed);
};

export const extractRepostReason = (entry: AppBskyFeedDefs.FeedViewPost): AppBskyFeedDefs.ReasonRepost | undefined => {
  if (entry.reason && AppBskyFeedDefs.isReasonRepost(entry.reason)) {
    return entry.reason;
  }
  return undefined;
};

export const extractPrimaryRecord = (entry: AppBskyFeedDefs.FeedViewPost): AppBskyFeedPost.Record | undefined => {
  const record = entry.post.record;
  if (AppBskyFeedPost.isRecord(record)) {
    return record as AppBskyFeedPost.Record;
  }
  return undefined;
};

export const extractReposter = (entry: AppBskyFeedDefs.FeedViewPost): AppBskyActorDefs.ProfileViewBasic | undefined => {
  const reason = extractRepostReason(entry);
  return reason?.by;
};
