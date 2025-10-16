import {
  AppBskyActorDefs,
  AppBskyEmbedExternal,
  AppBskyEmbedImages,
  AppBskyEmbedRecord,
  AppBskyEmbedRecordWithMedia,
  AppBskyFeedDefs,
  AppBskyFeedPost,
} from "@atproto/api";
import { BlueskyPostType } from "@/types/bluesky";
import type { Attachment } from "@shared/types/post";
import { BlueskyChannelName } from "@shared/types/store";

export const blueskyChannelsMap: Record<BlueskyChannelName, string> = {
  "bluesky:homeTimeline": "ホーム",
};

export const blueskyChannels: BlueskyChannelName[] = Object.keys(blueskyChannelsMap) as BlueskyChannelName[];

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
  if (
    embed &&
    (AppBskyEmbedRecord.isView(embed) || AppBskyEmbedRecordWithMedia.isView(embed))
  ) {
    return ["quote", "quoted"];
  }

  return ["post"];
};

const collectAttachmentsFromEmbed = (embed: unknown, attachments: Attachment[]): void => {
  if (!embed) return;

  if (AppBskyEmbedImages.isView(embed)) {
    attachments.push(
      ...embed.images.map((image) => ({
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
    attachments.push({
      type: "url",
      url: embed.external.uri,
    });
    return;
  }

  if (AppBskyEmbedRecordWithMedia.isView(embed)) {
    collectAttachmentsFromEmbed(embed.media, attachments);
    collectAttachmentsFromEmbed(embed.record, attachments);
    return;
  }

  if (AppBskyEmbedRecord.isView(embed)) {
    const record = embed.record;
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

const resolveRecordFromEmbed = (
  embed: unknown,
): AppBskyEmbedRecord.ViewRecord | undefined => {
  if (!embed) return;

  if (AppBskyEmbedRecord.isView(embed) && AppBskyEmbedRecord.isViewRecord(embed.record)) {
    return embed.record;
  }

  if (AppBskyEmbedRecordWithMedia.isView(embed)) {
    const recordView = embed.record;
    if (AppBskyEmbedRecord.isView(recordView) && AppBskyEmbedRecord.isViewRecord(recordView.record)) {
      return recordView.record;
    }
  }

  return undefined;
};

export const extractQuotedRecord = (
  entry: AppBskyFeedDefs.FeedViewPost,
): AppBskyEmbedRecord.ViewRecord | undefined => {
  return resolveRecordFromEmbed(entry.post.embed);
};

export const extractRepostReason = (
  entry: AppBskyFeedDefs.FeedViewPost,
): AppBskyFeedDefs.ReasonRepost | undefined => {
  if (entry.reason && AppBskyFeedDefs.isReasonRepost(entry.reason)) {
    return entry.reason;
  }
  return undefined;
};

export const extractPrimaryRecord = (
  entry: AppBskyFeedDefs.FeedViewPost,
): AppBskyFeedPost.Record | undefined => {
  const record = entry.post.record;
  if (AppBskyFeedPost.isRecord(record)) {
    return record;
  }
  return undefined;
};

export const extractReposter = (
  entry: AppBskyFeedDefs.FeedViewPost,
): AppBskyActorDefs.ProfileViewBasic | undefined => {
  const reason = extractRepostReason(entry);
  return reason?.by;
};
