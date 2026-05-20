import { Agent, BlobRef } from "@atproto/api";
import type {
  AppBskyEmbedImages,
  AppBskyEmbedRecord,
  AppBskyEmbedRecordWithMedia,
  AppBskyFeedPost,
} from "@atproto/api";
import type { OAuthSession } from "@atproto/oauth-client";
import { createBlueskyAgent } from "../oauth/agent";
import { getBlueskyOAuthClient } from "../oauth/client";
import { resolveUploadFileData } from "./helpers";

const BLUESKY_IMAGE_MAX_COUNT = 4;
const BLUESKY_IMAGE_MAX_BYTES = 1_000_000;

type BlueskyPostRef = {
  uri: string;
  cid: string;
};

type BlueskyImageAspectRatio = {
  width: number;
  height: number;
};

type BlueskyUploadedImage = {
  blob: unknown;
  alt?: string;
  aspectRatio?: BlueskyImageAspectRatio;
};

type SerializedBlueskyBlob = {
  cid: string;
  mimeType: string;
  size: number;
};

type BlueskyImagesEmbed = AppBskyEmbedImages.Main & {
  $type: "app.bsky.embed.images";
};

type BlueskyRecordEmbed = AppBskyEmbedRecord.Main & {
  $type: "app.bsky.embed.record";
};

const restoreSession = async (did: string, refresh: boolean | "auto" = "auto"): Promise<OAuthSession> => {
  if (!did) throw new Error("Bluesky DID is required");
  const client = await getBlueskyOAuthClient();
  return client.restore(did, refresh);
};

const withAgent = async <T>(did: string, fn: (agent: Agent, session: OAuthSession) => Promise<T>): Promise<T> => {
  const session = await restoreSession(did);
  const agent = createBlueskyAgent(session);
  return fn(agent, session);
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

/**
 * Serialize BlobRef across IPC without relying on class prototypes surviving the round-trip.
 */
const serializeBlobRef = (blob: BlobRef): SerializedBlueskyBlob => ({
  cid: blob.ref.toString(),
  mimeType: blob.mimeType,
  size: blob.size,
});

/**
 * Ensure BlobRef serializes as the typed blob shape expected by app.bsky.feed.post.
 */
const toTypedBlobRef = (blob: BlobRef, fallbackSize = -1): BlobRef => {
  return new BlobRef(blob.ref, blob.mimeType, blob.size >= 0 ? blob.size : fallbackSize);
};

const extractCidString = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (!isRecord(value)) return undefined;

  const link = value.$link ?? value["/"];
  if (typeof link === "string") return link;
  return undefined;
};

/**
 * Restore a BlobRef received from renderer IPC before putting it into an ATProto record.
 */
const restoreBlobRef = (value: unknown): BlobRef => {
  if (value instanceof BlobRef) return toTypedBlobRef(value);

  const blob = BlobRef.asBlobRef(value);
  if (blob) return toTypedBlobRef(blob);

  if (!isRecord(value)) {
    throw new Error("Bluesky画像のblob参照を復元できませんでした");
  }

  if (value.original) {
    try {
      return restoreBlobRef(value.original);
    } catch {
      // Fall through and try the copied top-level fields.
    }
  }

  const mimeType = typeof value.mimeType === "string" ? value.mimeType : undefined;
  const size = typeof value.size === "number" ? value.size : -1;
  const cid = typeof value.cid === "string" ? value.cid : extractCidString(value.ref);

  if (!cid || !mimeType) {
    throw new Error("Bluesky画像のblob参照を復元できませんでした");
  }

  const blobRef = BlobRef.fromJsonRef({ cid, mimeType });
  return toTypedBlobRef(blobRef, size);
};

export const blueskyGetProfile = async ({ did }: { did: string }) => {
  return withAgent(did, async (agent) => {
    const res = await agent.getProfile({ actor: did });
    return res.data;
  });
};

export const blueskyGetTimeline = async ({
  did,
  cursor,
  limit = 30,
}: {
  did: string;
  cursor?: string;
  limit?: number;
}) => {
  return withAgent(did, async (agent) => {
    const res = await agent.getTimeline({ cursor, limit });
    return res.data;
  });
};

/**
 * Upload a local image file as a Bluesky blob that can be referenced by a post embed.
 */
export const blueskyUploadImage = async ({
  did,
  filePath,
  fileDataBase64,
  fileName,
  fileType,
}: {
  did: string;
  filePath?: string;
  fileDataBase64?: string;
  fileName?: string;
  fileType?: string;
}) => {
  const contentType = fileType || "application/octet-stream";
  if (!contentType.startsWith("image/")) {
    throw new Error("Blueskyに添付できるのは画像ファイルのみです");
  }

  return withAgent(did, async (agent) => {
    const { data } = await resolveUploadFileData({
      filePath,
      fileDataBase64,
      fileName,
      fallbackFileName: "upload",
    });
    if (data.byteLength > BLUESKY_IMAGE_MAX_BYTES) {
      throw new Error("Blueskyの画像添付は1,000,000 bytes以下にしてください");
    }

    const res = await agent.uploadBlob(data, {
      encoding: contentType,
    });
    return {
      ...res.data,
      blob: serializeBlobRef(res.data.blob),
    };
  });
};

/**
 * Build an app.bsky.embed.images payload from already-uploaded image blobs.
 */
const buildImagesEmbed = (images: BlueskyUploadedImage[]): BlueskyImagesEmbed | undefined => {
  if (!images.length) return undefined;
  if (images.length > BLUESKY_IMAGE_MAX_COUNT) {
    throw new Error("Blueskyの画像添付は最大4枚までです");
  }

  return {
    $type: "app.bsky.embed.images",
    images: images.map((image) => ({
      image: restoreBlobRef(image.blob),
      alt: image.alt ?? "",
      ...(image.aspectRatio ? { aspectRatio: image.aspectRatio } : {}),
    })),
  };
};

/**
 * Build the post embed, using recordWithMedia when a quote and media coexist.
 */
const buildPostEmbed = ({
  quote,
  images,
}: {
  quote?: BlueskyPostRef;
  images?: BlueskyUploadedImage[];
}): AppBskyFeedPost.Record["embed"] | undefined => {
  const imageEmbed = buildImagesEmbed(images ?? []);
  const recordEmbed: BlueskyRecordEmbed | undefined = quote
    ? {
        $type: "app.bsky.embed.record",
        record: {
          uri: quote.uri,
          cid: quote.cid,
        },
      }
    : undefined;

  if (recordEmbed && imageEmbed) {
    return {
      $type: "app.bsky.embed.recordWithMedia",
      record: recordEmbed,
      media: imageEmbed,
    } satisfies AppBskyEmbedRecordWithMedia.Main;
  }

  return imageEmbed ?? recordEmbed;
};

export const blueskyCreatePost = async ({
  did,
  text,
  replyTo,
  quote,
  images,
}: {
  did: string;
  text: string;
  replyTo?: BlueskyPostRef;
  quote?: BlueskyPostRef;
  images?: BlueskyUploadedImage[];
}) => {
  return withAgent(did, async (agent) => {
    const record: AppBskyFeedPost.Record = {
      $type: "app.bsky.feed.post",
      text,
      createdAt: new Date().toISOString(),
    };

    if (replyTo) {
      record.reply = {
        root: { uri: replyTo.uri, cid: replyTo.cid },
        parent: { uri: replyTo.uri, cid: replyTo.cid },
      };
    }

    const embed = buildPostEmbed({ quote, images });
    if (embed) {
      record.embed = embed;
    }

    const res = await agent.post(record);
    return res;
  });
};

export const blueskyLike = async ({ did, uri, cid }: { did: string; uri: string; cid: string }) => {
  return withAgent(did, async (agent) => {
    const res = await agent.like(uri, cid);
    return res;
  });
};

export const blueskyDeleteLike = async ({ did, uri }: { did: string; uri: string }) => {
  return withAgent(did, async (agent) => {
    await agent.deleteLike(uri);
    return;
  });
};
