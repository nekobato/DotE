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

const resolveRecordFromEmbed = (
  embed: unknown,
): AppBskyEmbedRecord.ViewRecord | undefined => {
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
    return record as AppBskyFeedPost.Record;
  }
  return undefined;
};

export const extractReposter = (
  entry: AppBskyFeedDefs.FeedViewPost,
): AppBskyActorDefs.ProfileViewBasic | undefined => {
  const reason = extractRepostReason(entry);
  return reason?.by;
};
