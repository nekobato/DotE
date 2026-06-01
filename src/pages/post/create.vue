<script setup lang="ts">
import DoteAlert from "@/components/common/DoteAlert.vue";
import DoteButton from "@/components/common/DoteButton.vue";
import BlueskyPost from "@/components/PostItem/BlueskyPost.vue";
import MastodonToot from "@/components/PostItem/MastodonToot.vue";
import MisskeyNote from "@/components/PostItem/MisskeyNote.vue";
import EmojiPicker from "@/components/EmojiPicker.vue";
import type { BlueskyPost as BlueskyPostType } from "@/types/bluesky";
import { toBlueskyFeedPost, type BlueskyReplyRef } from "@/utils/bluesky";
import type { MastodonToot as MastodonTootType, MediaAttachment as MastodonMediaAttachment } from "@/types/mastodon";
import { getPathForFile, ipcInvoke, ipcSend } from "@/utils/ipc";
import { AppBskyFeedDefs } from "@atproto/api";
import type { BlobRef } from "@atproto/api";
import { Icon } from "@iconify/vue";
import type { MisskeyEntities, MisskeyNote as MisskeyNoteType } from "@shared/types/misskey";
import type { Instance, Settings, Timeline, User } from "@shared/types/store";
import { ElAvatar, ElInput } from "element-plus";
import { computed, nextTick, onBeforeUnmount, onMounted, PropType, reactive, ref, watch } from "vue";
import type { ApiInvokeResult } from "@shared/types/ipc";

type PageProps = {
  post?: MisskeyNoteType | MastodonTootType | BlueskyPostType;
  emojis?: MisskeyEntities.EmojiSimple[];
  mode?: "boost" | "reply";
  replyToId?: string;
  blueskyReplyTo?: BlueskyReplyRef;
  timelineId?: string;
  userId?: string;
};

type UploadStatus = "ready" | "uploading" | "processing" | "uploaded" | "failed";

type BlueskyImageAspectRatio = {
  width: number;
  height: number;
};

type AttachmentItem = {
  id: string;
  name: string;
  path?: string;
  fileDataBase64?: string;
  size: number;
  type: string;
  previewUrl?: string;
  status: UploadStatus;
  fileId?: string;
  mediaId?: string;
  blob?: BlobRef;
  altText?: string;
  aspectRatio?: BlueskyImageAspectRatio;
  error?: string;
};

type MastodonGetMediaResult =
  | {
      state: "processed";
      media: MastodonMediaAttachment;
    }
  | {
      state: "processing";
      media?: MastodonMediaAttachment;
    };

type FileWithPath = File & { path?: string };

type TextInputRef = {
  focus?: () => void;
  textarea?: HTMLTextAreaElement | null;
};

const submitTextMap = {
  note: "Note",
  renote: "Renote",
  quote: "Quote",
  reply: "Reply",
  toot: "Toot",
  boost: "Boost",
  post: "Post",
  repost: "Repost",
};

const BLUESKY_IMAGE_MAX_COUNT = 4;
const BLUESKY_IMAGE_MAX_BYTES = 1_000_000;
const BLUESKY_CREATED_POST_FETCH_RETRY_DELAYS_MS = [0, 500, 1_000, 1_500, 2_500, 4_000] as const;
const MASTODON_MEDIA_PROCESSING_TIMEOUT_MS = 120_000;
const MASTODON_MEDIA_PROCESSING_RETRY_DELAYS_MS = [1_000, 2_000, 3_000, 5_000] as const;
const imageExtensionMimeTypes: Record<string, string> = {
  avif: "image/avif",
  bmp: "image/bmp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  tif: "image/tiff",
  tiff: "image/tiff",
  webp: "image/webp",
};
const imageMimeTypeExtensions: Record<string, string> = {
  "image/avif": "avif",
  "image/bmp": "bmp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/tiff": "tiff",
  "image/webp": "webp",
};

const props = defineProps({
  data: {
    type: Object as PropType<PageProps>,
    required: true,
  },
});

const state = reactive({
  user: undefined as User | undefined,
  timeline: undefined as Timeline | undefined,
  instance: undefined as Instance | undefined,
  settings: undefined as Settings | undefined,
  post: {
    isSending: false,
    error: "",
  },
});
const text = ref("");
const textCw = ref("");
const showEmojiPicker = ref(false);
const showMisskeyOptions = ref(false);
const emojiPickerRef = ref<{
  focusSearch: () => void;
  resetSearch: () => void;
} | null>(null);
const textInputRef = ref<TextInputRef | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const attachments = ref<AttachmentItem[]>([]);
let postContextRequestId = 0;
const misskeyVisibility = ref<"public" | "home" | "followers" | null>(null);
const misskeyLocalOnly = ref(false);
const misskeyNoExtractMentions = ref(false);
const misskeyNoExtractHashtags = ref(false);
const misskeyNoExtractEmojis = ref(false);
const misskeyNoExtractLinks = ref(false);
const postFontStyle = computed(() => ({
  ...(state.settings?.font.family ? { fontFamily: state.settings.font.family } : {}),
}));
const canUseEmojiPicker = computed(() => state.instance?.type === "misskey" && (props.data.emojis?.length ?? 0) > 0);
const canUseAttachments = computed(
  () => state.instance?.type === "misskey" || state.instance?.type === "mastodon" || state.instance?.type === "bluesky",
);
const canUseMisskeyOptions = computed(() => state.instance?.type === "misskey");
const attachmentAccept = computed(() => (state.instance?.type === "bluesky" ? "image/*" : undefined));
const hasUploadingAttachments = computed(() =>
  attachments.value.some((item) => item.status === "uploading" || item.status === "processing"),
);
const hasFailedAttachments = computed(() => attachments.value.some((item) => item.status === "failed"));
const uploadedMisskeyFileIds = computed(() =>
  attachments.value.filter((item) => item.status === "uploaded" && item.fileId).map((item) => item.fileId as string),
);
const uploadedMastodonMediaIds = computed(() =>
  attachments.value.filter((item) => item.status === "uploaded" && item.mediaId).map((item) => item.mediaId as string),
);
const uploadedBlueskyImages = computed(() =>
  attachments.value
    .filter((item) => item.status === "uploaded" && item.blob)
    .map((item) => ({
      blob: item.blob as BlobRef,
      alt: item.altText ?? "",
      ...(item.aspectRatio ? { aspectRatio: item.aspectRatio } : {}),
    })),
);
const hasAttachments = computed(() => attachments.value.length > 0);
const isBoostMode = computed(() => props.data.mode === "boost");
const isReplyMode = computed(() => props.data.mode === "reply");

const boostTargetId = computed(() => {
  if (!isBoostMode.value) return undefined;
  const target = props.data.post as MastodonTootType | undefined;
  return target?.id;
});

const misskeyReplyTarget = computed(() => {
  if (!isReplyMode.value) return null;
  if (state.instance?.type !== "misskey") return null;
  return props.data.post as MisskeyNoteType | null;
});

const mastodonReplyTarget = computed(() => {
  if (!isReplyMode.value) return null;
  if (state.instance?.type !== "mastodon") return null;
  return props.data.post as MastodonTootType | null;
});

const blueskyReplyTarget = computed(() => {
  if (!isReplyMode.value) return null;
  if (state.instance?.type !== "bluesky") return null;
  const target = props.data.post as BlueskyPostType | null;
  if (!target) return null;
  return { post: target } as AppBskyFeedDefs.FeedViewPost;
});

const blueskyReplyTo = computed(() => {
  if (!isReplyMode.value || state.instance?.type !== "bluesky") return undefined;
  if (props.data.blueskyReplyTo) return props.data.blueskyReplyTo;
  const target = props.data.post as BlueskyPostType | undefined;
  if (!target) return undefined;
  return {
    root: { uri: target.uri, cid: target.cid },
    parent: { uri: target.uri, cid: target.cid },
  };
});

const replyToId = computed(() => {
  if (!isReplyMode.value) return undefined;
  if (state.instance?.type === "misskey") {
    return props.data.replyToId ?? (misskeyReplyTarget.value?.id || undefined);
  }
  if (state.instance?.type === "mastodon") {
    return props.data.replyToId ?? (mastodonReplyTarget.value?.id || undefined);
  }
  return props.data.replyToId;
});

const handleApiResult = <T,>(result: ApiInvokeResult<T>, message: string): T | undefined => {
  if (!result.ok) {
    state.post.error = message;
    console.error(message, result.error);
    return undefined;
  }
  return result.data;
};

/**
 * Infer a MIME type from a file extension when clipboard data omits file.type.
 */
const inferFileTypeFromName = (fileName: string): string | undefined => {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (!extension) return undefined;
  return imageExtensionMimeTypes[extension];
};

/**
 * Resolve the best MIME type available for upload and local validation.
 */
const resolveAttachmentFileType = (file: File): string => {
  return file.type || inferFileTypeFromName(file.name) || "application/octet-stream";
};

/**
 * Resolve a stable upload filename for clipboard images that do not carry a name.
 */
const resolveAttachmentFileName = (file: File, fileType: string): string => {
  if (file.name) return file.name;
  const extension = imageMimeTypeExtensions[fileType] ?? "bin";
  return `pasted-image.${extension}`;
};

/**
 * Check whether a File represents an image, including clipboard files with empty MIME type.
 */
const isImageFile = (file: File): boolean => {
  return resolveAttachmentFileType(file).startsWith("image/");
};

/**
 * Resolve the timeline that should own the current post-window payload.
 */
const resolvePostTimeline = (timelines: Timeline[]): Timeline | undefined => {
  if (props.data.timelineId) {
    return timelines.find((timeline) => timeline.id === props.data.timelineId);
  }

  if (props.data.userId) {
    return (
      timelines.find((timeline) => timeline.userId === props.data.userId && timeline.available) ??
      timelines.find((timeline) => timeline.userId === props.data.userId)
    );
  }

  return timelines.find((timeline) => timeline.available);
};

/**
 * Resolve the user that should be used as the posting account.
 */
const resolvePostUser = (users: User[], timeline?: Timeline): User | undefined => {
  const userId = props.data.userId ?? timeline?.userId;
  if (!userId) return undefined;
  return users.find((user) => user.id === userId);
};

/**
 * Refresh the post-window account, timeline, instance, and settings from persisted state.
 */
const loadPostContext = async () => {
  const requestId = ++postContextRequestId;
  const [users, timelines, instances, settings] = await Promise.all([
    ipcInvoke("db:get-users"),
    ipcInvoke("db:get-timeline-all"),
    ipcInvoke("db:get-instance-all"),
    ipcInvoke("settings:all"),
  ]);

  if (requestId !== postContextRequestId) return;

  const timeline = resolvePostTimeline(timelines);
  const user = resolvePostUser(users, timeline);
  state.settings = settings;
  state.timeline = timeline;
  state.user = user;
  state.instance = instances.find((instance) => instance.id === user?.instanceId);
};

const mastodonToot = computed(() => {
  if (state.instance?.type === "mastodon" && props.data.post) {
    const target = props.data.post as MastodonTootType;
    const original = target.reblog ?? target;
    const boosterAccount = {
      ...original.account,
      display_name: state.user?.name ?? original.account.display_name,
      avatar: state.user?.avatarUrl ?? original.account.avatar,
      url: original.account.url,
    } as MastodonTootType["account"];

    return {
      ...original,
      id: target.id ?? original.id,
      account: boosterAccount,
      reblog: original,
      media_attachments: original.media_attachments ?? [],
      sensitive: Boolean(original.sensitive),
      favourited: Boolean(original.favourited),
      favourites_count: original.favourites_count ?? 0,
    } as MastodonTootType;
  }
  return null;
});

const misskeyNote = computed(() => {
  if (state.instance?.type === "misskey" && !isReplyMode.value) {
    const renotePost = props.data.post as MisskeyNoteType;
    return {
      text: text.value,
      user: {
        name: state.user?.name,
        host: state.instance?.url,
        avatarUrl: state.user?.avatarUrl,
      },
      renote: renotePost ? (renotePost.renote && !renotePost.text ? renotePost.renote : renotePost) : null,
    } as MisskeyNoteType;
  }
  return null;
});

const blueskyPost = computed(() => {
  if (state.instance?.type === "bluesky" && state.user) {
    const quotePost = props.data.post as BlueskyPostType;
    const mockPost: AppBskyFeedDefs.FeedViewPost = {
      post: {
        uri: "",
        cid: "",
        author: {
          did: state.user.blueskySession?.did || "",
          handle: state.user.name || "",
          displayName: state.user.name || "",
          avatar: state.user.avatarUrl,
        },
        record: {
          text: text.value,
          createdAt: new Date().toISOString(),
          $type: "app.bsky.feed.post",
        },
        likeCount: 0,
        repostCount: 0,
        indexedAt: new Date().toISOString(),
        viewer: {},
      },
    };

    // Add embed if we're quoting a post.
    if (quotePost && !isReplyMode.value) {
      mockPost.post.embed = {
        $type: "app.bsky.embed.record#view",
        record: {
          $type: "app.bsky.embed.record#viewRecord",
          uri: quotePost.uri,
          cid: quotePost.cid,
          author: quotePost.author,
          value: quotePost.record,
          indexedAt: quotePost.indexedAt,
          labels: quotePost.labels,
        },
      };
    }

    return mockPost;
  }
  return null;
});

const submitType = computed(() => {
  if (state.instance?.type === "misskey") {
    if (isReplyMode.value) {
      return "reply";
    }
    if (misskeyNote.value?.renote) {
      return text.value ? "quote" : "renote";
    }
    return "note";
  }
  if (state.instance?.type === "mastodon") {
    if (isBoostMode.value) {
      return "boost";
    }
    if (isReplyMode.value) {
      return "reply";
    }
    if (mastodonToot.value) {
      return "boost";
    }
    return "toot";
  }
  if (state.instance?.type === "bluesky") {
    if (isReplyMode.value) {
      return "reply";
    }
    if (props.data.post) {
      return text.value || hasAttachments.value ? "quote" : "repost";
    }
    return "post";
  }
  return "post";
});

const canSubmit = computed(() => {
  if (state.post.isSending) {
    return false;
  }
  if (hasUploadingAttachments.value || hasFailedAttachments.value) {
    return false;
  }

  if (
    submitType.value === "note" ||
    submitType.value === "reply" ||
    submitType.value === "toot" ||
    submitType.value === "post"
  ) {
    if (state.instance?.type === "misskey") {
      return text.value.length > 0 || hasAttachments.value;
    }
    if (state.instance?.type === "mastodon") {
      return text.value.length > 0 || hasAttachments.value;
    }
    if (state.instance?.type === "bluesky") {
      return text.value.length > 0 || hasAttachments.value;
    }
    return text.value.length > 0;
  }
  return true;
});

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size}B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)}KB`;
  return `${(size / (1024 * 1024)).toFixed(1)}MB`;
};

const updateAttachment = (id: string, updater: (item: AttachmentItem) => AttachmentItem) => {
  attachments.value = attachments.value.map((item) => (item.id === id ? updater(item) : item));
};

const createAttachmentId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

/**
 * Load image dimensions for Bluesky aspectRatio metadata.
 */
const loadImageAspectRatio = (previewUrl?: string): Promise<BlueskyImageAspectRatio | undefined> => {
  if (!previewUrl) return Promise.resolve(undefined);

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      resolve(width > 0 && height > 0 ? { width, height } : undefined);
    };
    image.onerror = () => resolve(undefined);
    image.src = previewUrl;
  });
};

/**
 * Read a renderer File as base64 so pasted clipboard images can be uploaded without a filesystem path.
 */
const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("ファイルデータを読み込めませんでした"));
        return;
      }
      const separatorIndex = reader.result.indexOf(",");
      resolve(separatorIndex >= 0 ? reader.result.slice(separatorIndex + 1) : reader.result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("ファイルデータを読み込めませんでした"));
    reader.readAsDataURL(file);
  });
};

const clearAttachments = () => {
  attachments.value.forEach((item) => {
    if (item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
  });
  attachments.value = [];
};

/**
 * Reset composer-local state when the post window is opened for a new payload.
 */
const resetComposerState = () => {
  text.value = "";
  textCw.value = "";
  state.post.error = "";
  state.post.isSending = false;
  showEmojiPicker.value = false;
  showMisskeyOptions.value = false;
  misskeyVisibility.value = null;
  misskeyLocalOnly.value = false;
  misskeyNoExtractMentions.value = false;
  misskeyNoExtractHashtags.value = false;
  misskeyNoExtractEmojis.value = false;
  misskeyNoExtractLinks.value = false;
  clearAttachments();
};

/**
 * Validate Bluesky's image-only attachment limits before adding a file.
 */
const validateBlueskyAttachment = (file: File): boolean => {
  if (attachments.value.length >= BLUESKY_IMAGE_MAX_COUNT) {
    state.post.error = "Blueskyの画像添付は最大4枚までです";
    return false;
  }
  if (!isImageFile(file)) {
    state.post.error = "Blueskyに添付できるのは画像ファイルのみです";
    return false;
  }
  if (file.size > BLUESKY_IMAGE_MAX_BYTES) {
    state.post.error = "Blueskyの画像添付は1,000,000 bytes以下にしてください";
    return false;
  }
  return true;
};

const uploadMisskeyFile = async (item: AttachmentItem): Promise<boolean> => {
  updateAttachment(item.id, (current) => ({
    ...current,
    status: "uploading",
    error: undefined,
  }));
  try {
    const result = await ipcInvoke("api", {
      method: "misskey:uploadFile",
      instanceUrl: state.instance?.url,
      token: state.user?.token,
      filePath: item.path,
      fileDataBase64: item.fileDataBase64,
      fileName: item.name,
      fileType: item.type,
    });
    const res = handleApiResult(result, `${state.instance?.name ?? "Misskey"} へのアップロードに失敗しました`);
    if (!res || !(res as { id?: string }).id) {
      updateAttachment(item.id, (current) => ({
        ...current,
        status: "failed",
        error: "アップロードに失敗しました",
      }));
      return false;
    }
    updateAttachment(item.id, (current) => ({
      ...current,
      status: "uploaded",
      fileId: (res as { id: string }).id,
    }));
    return true;
  } catch (error) {
    updateAttachment(item.id, (current) => ({
      ...current,
      status: "failed",
      error: "アップロードに失敗しました",
    }));
    if (error instanceof Error) {
      state.post.error = error.message;
    } else {
      state.post.error = "アップロードに失敗しました";
    }
    return false;
  }
};

const uploadMisskeyAttachments = async (): Promise<boolean> => {
  const targets = attachments.value.filter((item) => item.status === "ready" || item.status === "failed");
  for (const item of targets) {
    const ok = await uploadMisskeyFile(item);
    if (!ok) {
      return false;
    }
  }
  return true;
};

/**
 * Check whether the attachment is still present while a cancellable Mastodon processing wait is running.
 */
const hasAttachment = (id: string): boolean => {
  return attachments.value.some((item) => item.id === id);
};

/**
 * Mark an attachment as failed and expose the same message in the composer error area.
 */
const failAttachment = (id: string, message: string) => {
  updateAttachment(id, (current) => ({
    ...current,
    status: "failed",
    error: message,
  }));
  state.post.error = message;
};

/**
 * Resolve the delay for the next Mastodon media processing poll.
 */
const resolveMastodonMediaProcessingDelay = (attempt: number): number => {
  return MASTODON_MEDIA_PROCESSING_RETRY_DELAYS_MS[
    Math.min(attempt, MASTODON_MEDIA_PROCESSING_RETRY_DELAYS_MS.length - 1)
  ];
};

/**
 * Poll a Mastodon media attachment until the processed media URL is available.
 */
const waitForMastodonMediaProcessing = async (itemId: string, mediaId: string): Promise<boolean> => {
  const startedAt = Date.now();
  let attempt = 0;

  updateAttachment(itemId, (current) => ({
    ...current,
    status: "processing",
    mediaId,
    error: undefined,
  }));

  while (hasAttachment(itemId)) {
    const elapsedMs = Date.now() - startedAt;
    const remainingMs = MASTODON_MEDIA_PROCESSING_TIMEOUT_MS - elapsedMs;
    if (remainingMs <= 0) {
      failAttachment(itemId, "メディアの処理がタイムアウトしました。しばらくしてから再試行してください");
      return false;
    }

    await wait(Math.min(resolveMastodonMediaProcessingDelay(attempt), remainingMs));
    if (!hasAttachment(itemId)) return false;

    let result: ApiInvokeResult<unknown>;
    try {
      result = await ipcInvoke("api", {
        method: "mastodon:getMedia",
        instanceUrl: state.instance?.url,
        token: state.user?.token,
        id: mediaId,
      });
    } catch (error) {
      failAttachment(itemId, "メディアの処理確認に失敗しました。再試行してください");
      console.error("Mastodonメディア処理確認に失敗しました", error);
      return false;
    }

    if (!hasAttachment(itemId)) return false;

    if (!result.ok) {
      failAttachment(itemId, "メディアの処理確認に失敗しました。再試行してください");
      console.error("Mastodonメディア処理確認に失敗しました", result.error);
      return false;
    }

    const mediaResult = result.data as MastodonGetMediaResult | null;
    if (mediaResult?.state === "processed" && mediaResult.media?.id) {
      updateAttachment(itemId, (current) => ({
        ...current,
        status: "uploaded",
        mediaId: mediaResult.media.id,
        error: undefined,
      }));
      return true;
    }

    attempt += 1;
  }

  return false;
};

const uploadMastodonMedia = async (item: AttachmentItem): Promise<boolean> => {
  if (item.mediaId) {
    return waitForMastodonMediaProcessing(item.id, item.mediaId);
  }

  updateAttachment(item.id, (current) => ({
    ...current,
    status: "uploading",
    error: undefined,
  }));
  try {
    const result = await ipcInvoke("api", {
      method: "mastodon:uploadMedia",
      instanceUrl: state.instance?.url,
      token: state.user?.token,
      filePath: item.path,
      fileDataBase64: item.fileDataBase64,
      fileName: item.name,
      fileType: item.type,
    });
    const res = handleApiResult(result, `${state.instance?.name ?? "Mastodon"} へのアップロードに失敗しました`);
    if (!res || !(res as { id?: string }).id) {
      updateAttachment(item.id, (current) => ({
        ...current,
        status: "failed",
        error: "アップロードに失敗しました",
      }));
      return false;
    }

    const media = res as MastodonMediaAttachment;
    if (media.url === null) {
      return waitForMastodonMediaProcessing(item.id, media.id);
    }

    updateAttachment(item.id, (current) => ({
      ...current,
      status: "uploaded",
      mediaId: media.id,
    }));
    return true;
  } catch (error) {
    updateAttachment(item.id, (current) => ({
      ...current,
      status: "failed",
      error: "アップロードに失敗しました",
    }));
    if (error instanceof Error) {
      state.post.error = error.message;
    } else {
      state.post.error = "アップロードに失敗しました";
    }
    return false;
  }
};

const uploadMastodonAttachments = async (): Promise<boolean> => {
  const targets = attachments.value.filter((item) => item.status === "ready" || item.status === "failed");
  for (const item of targets) {
    const ok = await uploadMastodonMedia(item);
    if (!ok) {
      return false;
    }
  }
  return true;
};

/**
 * Upload one image file to Bluesky and keep the returned BlobRef on the attachment.
 */
const uploadBlueskyImage = async (item: AttachmentItem, did: string): Promise<boolean> => {
  updateAttachment(item.id, (current) => ({
    ...current,
    status: "uploading",
    error: undefined,
  }));
  try {
    const result = await ipcInvoke("api", {
      method: "bluesky:uploadImage",
      did,
      filePath: item.path,
      fileDataBase64: item.fileDataBase64,
      fileName: item.name,
      fileType: item.type,
    });
    const res = handleApiResult(result, `${state.instance?.name ?? "Bluesky"} へのアップロードに失敗しました`);
    const blob = (res as { blob?: BlobRef } | undefined)?.blob;
    if (!blob) {
      updateAttachment(item.id, (current) => ({
        ...current,
        status: "failed",
        error: "アップロードに失敗しました",
      }));
      return false;
    }
    updateAttachment(item.id, (current) => ({
      ...current,
      status: "uploaded",
      blob,
    }));
    return true;
  } catch (error) {
    updateAttachment(item.id, (current) => ({
      ...current,
      status: "failed",
      error: "アップロードに失敗しました",
    }));
    if (error instanceof Error) {
      state.post.error = error.message;
    } else {
      state.post.error = "アップロードに失敗しました";
    }
    return false;
  }
};

/**
 * Upload pending Bluesky image attachments in selection order.
 */
const uploadBlueskyAttachments = async (did: string): Promise<boolean> => {
  const targets = attachments.value.filter((item) => item.status === "ready" || item.status === "failed");
  for (const item of targets) {
    const ok = await uploadBlueskyImage(item, did);
    if (!ok) {
      return false;
    }
  }
  return true;
};

const addAttachment = async (file: File) => {
  if (state.instance?.type === "bluesky" && !validateBlueskyAttachment(file)) {
    return;
  }

  state.post.error = "";
  const filePath = getPathForFile(file) || (file as FileWithPath).path || undefined;
  let fileDataBase64: string | undefined;
  try {
    fileDataBase64 = filePath ? undefined : await readFileAsBase64(file);
  } catch (error) {
    state.post.error = error instanceof Error ? error.message : "ファイルデータを読み込めませんでした";
    return;
  }
  const fileType = resolveAttachmentFileType(file);
  const previewUrl = isImageFile(file) ? URL.createObjectURL(file) : undefined;
  const aspectRatio = await loadImageAspectRatio(previewUrl);
  const item: AttachmentItem = {
    id: createAttachmentId(),
    name: resolveAttachmentFileName(file, fileType),
    path: filePath,
    fileDataBase64,
    size: file.size,
    type: fileType,
    previewUrl,
    altText: "",
    aspectRatio,
    status: "ready",
  };

  attachments.value = [...attachments.value, item];
};

const onSelectFiles = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = Array.from(target.files ?? []);
  target.value = "";
  if (!files.length) return;
  if (!canUseAttachments.value) return;

  for (const file of files) {
    await addAttachment(file);
  }
};

/**
 * Extract image files from a paste event's clipboard data.
 */
const extractClipboardImageFiles = (clipboardData: DataTransfer | null): File[] => {
  if (!clipboardData) return [];

  const files = Array.from(clipboardData.files).filter(isImageFile);
  if (files.length) return files;

  return Array.from(clipboardData.items)
    .filter((item) => item.kind === "file")
    .map((item) => item.getAsFile())
    .filter((file): file is File => Boolean(file))
    .filter(isImageFile);
};

/**
 * Treat pasted clipboard images as post attachments while preserving normal text paste behavior.
 */
const onPaste = async (event: ClipboardEvent) => {
  if (isBoostMode.value || !canUseAttachments.value) return;

  const imageFiles = extractClipboardImageFiles(event.clipboardData);
  if (!imageFiles.length) return;

  event.preventDefault();
  for (const file of imageFiles) {
    await addAttachment(file);
  }
};

const openFilePicker = () => {
  fileInputRef.value?.click();
};

const removeAttachment = (id: string) => {
  const target = attachments.value.find((item) => item.id === id);
  if (target?.previewUrl) {
    URL.revokeObjectURL(target.previewUrl);
  }
  attachments.value = attachments.value.filter((item) => item.id !== id);
};

/**
 * Retry a failed attachment upload or resume Mastodon media processing checks.
 */
const retryAttachment = async (id: string) => {
  const item = attachments.value.find((attachment) => attachment.id === id);
  if (!item || item.status !== "failed") return;
  if (state.instance?.type !== "mastodon") return;

  state.post.error = "";
  await uploadMastodonMedia(item);
};

const postToMisskey = async () => {
  const targetNote = props.data.post as MisskeyNoteType | null;
  const replyId = isReplyMode.value ? (replyToId.value ?? null) : null;
  const renoteId = isReplyMode.value
    ? null
    : targetNote?.renoteId && !targetNote.text
      ? targetNote.renoteId
      : (targetNote?.id ?? null);
  if (!(await uploadMisskeyAttachments())) {
    return;
  }
  const fileIds = uploadedMisskeyFileIds.value.length ? uploadedMisskeyFileIds.value : undefined;

  const visibility = misskeyVisibility.value;
  const result = await ipcInvoke("api", {
    method: "misskey:createNote",
    instanceUrl: state.instance?.url,
    token: state.user?.token,
    i: state.user?.token,
    ...(visibility ? { visibility } : {}),
    // visibleUserIds: [],
    text: text.value || null,
    cw: textCw.value || null,
    localOnly: misskeyLocalOnly.value,
    noExtractMentions: misskeyNoExtractMentions.value,
    noExtractHashtags: misskeyNoExtractHashtags.value,
    noExtractEmojis: misskeyNoExtractEmojis.value,
    noExtractLinks: misskeyNoExtractLinks.value,
    // poll: null,
    replyId,
    renoteId: renoteId || null,
    ...(fileIds ? { fileIds } : {}),
  });
  const res = handleApiResult(result, `${state.instance?.name ?? "Misskey"} への投稿に失敗しました`);
  if (res?.createdNote) {
    text.value = "";
    textCw.value = "";
    clearAttachments();
    ipcSend("post:close");
  }
};

const postToMastodon = async () => {
  if (isBoostMode.value) {
    if (!boostTargetId.value) {
      state.post.error = "ブースト対象の投稿が見つかりませんでした";
      return;
    }
    const result = await ipcInvoke("api", {
      method: "mastodon:reblog",
      instanceUrl: state.instance?.url,
      token: state.user?.token,
      id: boostTargetId.value,
    });
    const res = handleApiResult(result, `${state.instance?.name ?? "Mastodon"} のブーストに失敗しました`);
    if (res) {
      ipcSend("timeline:add-post", {
        post: res as MastodonTootType,
        timelineId: props.data.timelineId ?? state.timeline?.id,
        userId: props.data.userId ?? state.user?.id,
      });
      ipcSend("post:close");
    }
    return;
  }

  if (!(await uploadMastodonAttachments())) {
    return;
  }
  const mediaIds = uploadedMastodonMediaIds.value.length ? uploadedMastodonMediaIds.value : undefined;
  const result = await ipcInvoke("api", {
    method: "mastodon:postStatus",
    instanceUrl: state.instance?.url,
    token: state.user?.token,
    status: text.value,
    ...(replyToId.value ? { inReplyToId: replyToId.value } : {}),
    mediaIds,
    // sensitive: false,
    // spoilerText: null,
    // visibility: "public",
  });
  const res = handleApiResult(result, `${state.instance?.name ?? "Mastodon"} への投稿に失敗しました`);
  if (res?.id) {
    ipcSend("timeline:add-post", {
      post: res as MastodonTootType,
      timelineId: props.data.timelineId ?? state.timeline?.id,
      userId: props.data.userId ?? state.user?.id,
    });
    text.value = "";
    clearAttachments();
    ipcSend("post:close");
  }
};

const wait = (ms: number) => {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
};

const fetchCreatedBlueskyPost = async ({ did, uri }: { did: string; uri: string }) => {
  let lastError: unknown;

  for (const delay of BLUESKY_CREATED_POST_FETCH_RETRY_DELAYS_MS) {
    if (delay > 0) {
      await wait(delay);
    }

    const result = await ipcInvoke("api", {
      method: "bluesky:getPosts",
      did,
      uris: [uri],
    });

    if (!result.ok) {
      lastError = result.error;
      continue;
    }

    const posts = (result.data as { posts?: AppBskyFeedDefs.PostView[] }).posts ?? [];
    const post = posts.find((candidate) => candidate.uri === uri) ?? posts[0];
    if (post) return post;
  }

  console.warn("Bluesky投稿は成功しましたが、タイムライン反映用の投稿取得に失敗しました", {
    uri,
    lastError,
  });
  return undefined;
};

/**
 * Hydrate a newly created Bluesky post and send it to the main timeline.
 */
const addCreatedBlueskyPostToTimeline = async ({
  did,
  uri,
  timelineId,
  userId,
}: {
  did: string;
  uri: string;
  timelineId?: string;
  userId?: string;
}) => {
  const post = await fetchCreatedBlueskyPost({ did, uri });
  if (!post) return;

  ipcSend("timeline:add-post", {
    post: toBlueskyFeedPost(post),
    timelineId,
    userId,
  });
};

const postToBluesky = async () => {
  const targetPost = props.data.post as BlueskyPostType | null;
  const quoteRef = !isReplyMode.value && targetPost ? { uri: targetPost.uri, cid: targetPost.cid } : undefined;
  const did = state.user?.blueskySession?.did;
  if (!did) {
    throw new Error("Blueskyアカウントの認証情報が見つかりませんでした");
  }

  if (!(await uploadBlueskyAttachments(did))) {
    return;
  }
  const images = uploadedBlueskyImages.value.length ? uploadedBlueskyImages.value : undefined;

  const result = await ipcInvoke("api", {
    method: "bluesky:createPost",
    did,
    text: text.value,
    replyTo: blueskyReplyTo.value,
    quote: quoteRef,
    images,
  });

  const res = handleApiResult(result, `${state.instance?.name ?? "Bluesky"} への投稿に失敗しました`);
  if (res && (res as any).uri) {
    void addCreatedBlueskyPostToTimeline({
      did,
      uri: (res as { uri: string }).uri,
      timelineId: props.data.timelineId ?? state.timeline?.id,
      userId: props.data.userId ?? state.user?.id,
    });
    text.value = "";
    clearAttachments();
    ipcSend("post:close");
  }
};

const submit = async () => {
  state.post.isSending = true;
  try {
    if (text) {
      switch (state.instance?.type) {
        case "misskey":
          await postToMisskey();
          break;
        case "mastodon":
          await postToMastodon();
          break;
        case "bluesky":
          await postToBluesky();
          break;
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      state.post.error = error.message;
    } else {
      state.post.error = "投稿中にエラーが発生しました";
    }
  } finally {
    state.post.isSending = false;
  }
};

const insertEmojiAtCursor = async (emojiName: string) => {
  const insertion = `:${emojiName}:`;
  const current = text.value;
  const textarea = textInputRef.value?.textarea;
  if (!textarea) {
    text.value = `${current}${insertion}`;
    return;
  }

  const start = textarea.selectionStart ?? current.length;
  const end = textarea.selectionEnd ?? current.length;
  text.value = `${current.slice(0, start)}${insertion}${current.slice(end)}`;

  await nextTick();
  textarea.focus();
  const nextPosition = start + insertion.length;
  textarea.setSelectionRange(nextPosition, nextPosition);
};

const toggleEmojiPicker = async () => {
  showEmojiPicker.value = !showEmojiPicker.value;
  if (showEmojiPicker.value) {
    await nextTick();
    emojiPickerRef.value?.focusSearch();
  }
};

const toggleMisskeyOptions = () => {
  showMisskeyOptions.value = !showMisskeyOptions.value;
};
const onSelectEmoji = async (emoji: MisskeyEntities.EmojiSimple) => {
  await insertEmojiAtCursor(emoji.name);
};

/**
 * Focus the writable post textarea after the page has rendered.
 */
const focusPostTextInput = async () => {
  if (isBoostMode.value) return;

  await nextTick();
  textInputRef.value?.focus?.();
  const textarea = textInputRef.value?.textarea;
  if (!textarea) return;

  textarea.focus();
  const cursorPosition = text.value.length;
  textarea.setSelectionRange(cursorPosition, cursorPosition);
};

onBeforeUnmount(() => {
  clearAttachments();
});

/**
 * Prepare the post window for the current payload.
 */
const preparePostPayload = async () => {
  resetComposerState();
  await loadPostContext();
  await focusPostTextInput();
};

onMounted(() => {
  void preparePostPayload();
});

watch(
  () => props.data,
  () => {
    void preparePostPayload();
  },
  { flush: "post" },
);

document.addEventListener("keydown", (e) => {
  if ((e.key === "Enter" && e.shiftKey) || (e.key === "Enter" && e.metaKey)) {
    e.preventDefault();
    if (canSubmit.value) {
      submit();
    }
  }
});
</script>

<template>
  <div class="post" :style="postFontStyle" @paste="onPaste">
    <div class="header">
      <ElAvatar :size="32" :src="state.user?.avatarUrl" class="dote-avatar" />
      <span class="username">{{ state.user?.name }}@{{ state.instance?.url.replace("https://", "") }}</span>
      <DoteButton class="post-action size-small" @click="submit" :disabled="!canSubmit" :loading="state.post.isSending">
        <span>{{ submitTextMap[submitType] }}</span>
        <Icon slot="icon" icon="mingcute:send-line" class="nn-icon size-xsmall" />
      </DoteButton>
    </div>
    <div class="post-layout">
      <div class="post-field-container">
        <ElInput
          class="post-field"
          :autosize="{ minRows: 2 }"
          type="textarea"
          v-model="text"
          ref="textInputRef"
          :disabled="isBoostMode"
        />
        <div class="post-tools" v-if="!isBoostMode && (canUseEmojiPicker || canUseMisskeyOptions || canUseAttachments)">
          <button v-if="canUseEmojiPicker" class="nn-button size-small tool-button" @click="toggleEmojiPicker">
            <Icon icon="mingcute:emoji-line" class="nn-icon size-xsmall" />
            <span>絵文字</span>
          </button>
          <button
            v-if="canUseMisskeyOptions"
            class="nn-button size-small tool-button"
            :class="{ active: showMisskeyOptions }"
            @click="toggleMisskeyOptions"
          >
            <Icon icon="mingcute:settings-4-line" class="nn-icon size-xsmall" />
            <span>投稿設定</span>
          </button>
          <button v-if="canUseAttachments" class="nn-button size-small tool-button" @click="openFilePicker">
            <Icon icon="mingcute:attachment-line" class="nn-icon size-xsmall" />
            <span>添付</span>
          </button>
          <input
            class="file-input"
            type="file"
            multiple
            ref="fileInputRef"
            :accept="attachmentAccept"
            @change="onSelectFiles"
          />
        </div>
        <div class="emoji-picker-panel" v-if="!isBoostMode && canUseEmojiPicker && showEmojiPicker">
          <EmojiPicker ref="emojiPickerRef" :emojis="props.data.emojis || []" @select="onSelectEmoji" />
        </div>
        <div class="misskey-options" v-if="!isBoostMode && canUseMisskeyOptions && showMisskeyOptions">
          <div class="misskey-options-row">
            <label class="nn-label">公開範囲</label>
            <select class="nn-select" v-model="misskeyVisibility">
              <option :value="null">default</option>
              <option value="public">public</option>
              <option value="home">home</option>
              <option value="followers">followers</option>
            </select>
          </div>
          <div class="misskey-options-row">
            <label class="nn-label">CW</label>
            <input class="nn-text-field cw-input" type="text" v-model="textCw" placeholder="内容に注意が必要な場合" />
          </div>
          <div class="misskey-options-group">
            <label class="nn-checkbox">
              <input type="checkbox" v-model="misskeyLocalOnly" />
              <span>ローカルのみに投稿</span>
            </label>
            <label class="nn-checkbox">
              <input type="checkbox" v-model="misskeyNoExtractMentions" />
              <span>メンションの自動抽出を無効化</span>
            </label>
            <label class="nn-checkbox">
              <input type="checkbox" v-model="misskeyNoExtractHashtags" />
              <span>ハッシュタグの自動抽出を無効化</span>
            </label>
            <label class="nn-checkbox">
              <input type="checkbox" v-model="misskeyNoExtractEmojis" />
              <span>絵文字の自動抽出を無効化</span>
            </label>
            <label class="nn-checkbox">
              <input type="checkbox" v-model="misskeyNoExtractLinks" />
              <span>リンクの自動抽出を無効化</span>
            </label>
          </div>
        </div>
        <div class="attachments-panel" v-if="!isBoostMode && attachments.length">
          <div class="attachment-item" v-for="item in attachments" :key="item.id" :class="[item.status]">
            <div class="attachment-preview" v-if="item.previewUrl">
              <img :src="item.previewUrl" :alt="item.name" />
            </div>
            <div class="attachment-info">
              <div class="attachment-name">{{ item.name }}</div>
              <div class="attachment-meta">
                <span>{{ formatFileSize(item.size) }}</span>
                <span class="status" v-if="item.status === 'ready'">未送信</span>
                <span class="status" v-if="item.status === 'uploading'">アップロード中</span>
                <span class="status" v-if="item.status === 'processing'">処理中</span>
                <span class="status" v-if="item.status === 'uploaded'">完了</span>
                <span class="status error" v-if="item.status === 'failed'">失敗</span>
              </div>
              <label class="attachment-alt" v-if="state.instance?.type === 'bluesky'">
                <span>Alt</span>
                <input
                  class="nn-text-field attachment-alt-input"
                  type="text"
                  v-model="item.altText"
                  placeholder="画像の説明"
                  :disabled="item.status === 'uploading'"
                />
              </label>
              <div class="attachment-error" v-if="item.error">{{ item.error }}</div>
            </div>
            <div class="attachment-actions">
              <button
                v-if="state.instance?.type === 'mastodon' && item.status === 'failed'"
                class="nn-button size-small tool-button retry"
                @click="retryAttachment(item.id)"
              >
                <Icon icon="mingcute:refresh-2-line" class="nn-icon size-xsmall" />
                <span>再試行</span>
              </button>
              <button
                class="nn-button size-small tool-button remove"
                :disabled="item.status === 'uploading'"
                @click="removeAttachment(item.id)"
              >
                <Icon icon="mingcute:close-line" class="nn-icon size-xsmall" />
              </button>
            </div>
          </div>
        </div>
        <DoteAlert class="mt-4" type="error" v-if="state.post.error">
          {{ state.post.error }}
        </DoteAlert>
      </div>
    </div>
    <div class="post-container">
      <MastodonToot
        v-if="isBoostMode && mastodonToot"
        class="post-item"
        :post="mastodonToot"
        :instanceUrl="state.instance?.url"
        :showReactions="false"
        :showActions="false"
        lineStyle="all"
      />
      <MastodonToot
        v-else-if="mastodonReplyTarget"
        class="post-item"
        :post="mastodonReplyTarget"
        :instanceUrl="state.instance?.url"
        :showReactions="false"
        :showActions="false"
        lineStyle="all"
      />
      <MisskeyNote
        v-if="misskeyReplyTarget"
        class="post-item"
        :post="misskeyReplyTarget"
        :emojis="props.data.emojis || []"
        :currentInstanceUrl="state.instance?.url"
        :hideCw="false"
        :showReactions="false"
        :showActions="false"
        lineStyle="all"
        theme="default"
      />
      <MisskeyNote
        v-if="misskeyNote"
        class="post-item"
        :post="misskeyNote"
        :emojis="props.data.emojis || []"
        :currentInstanceUrl="state.instance?.url"
        :hideCw="false"
        :showReactions="false"
        :showActions="false"
        lineStyle="all"
        theme="default"
      />
      <BlueskyPost
        v-if="blueskyReplyTarget"
        class="post-item"
        :post="blueskyReplyTarget"
        :currentInstanceUrl="state.instance?.url"
        :showReactions="false"
        :showActions="false"
        lineStyle="all"
        theme="default"
      />
      <BlueskyPost
        v-else-if="blueskyPost"
        class="post-item"
        :post="blueskyPost"
        :currentInstanceUrl="state.instance?.url"
        :showReactions="false"
        :showActions="false"
        lineStyle="all"
        theme="default"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.post {
  width: 100%;
  height: 100%;
  padding: 16px;
  background-color: var(--dote-background-color);
}
.header {
  display: flex;
  gap: 8px;
  align-items: center;
  .dote-avatar {
    border-radius: 50%;
  }
  .username {
    color: #fff;
    font-size: 0.8rem;
  }
  .post-action {
    width: 120px;
    margin: 0 0 0 auto;
    &:not(:disabled) {
      background-image: linear-gradient(90deg, #86b300, #4ab300, #4ab300);
      &:hover {
        background-position-x: 100%;
      }
    }
  }
}
.post-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  align-items: start;
}
.tools {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  margin-top: 8px;
  .tool-item {
    margin: 0;
  }
}
.post-field-container {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
}
.post-field {
  width: 100%;
  margin: 8px 0 0;
}
.post-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
}
.tool-button {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 4px 8px;
  color: var(--dote-color-white);
  font-size: 0.7rem;
  background: var(--dote-color-white-t1);
  border-radius: 6px;
  &:hover {
    background: var(--dote-color-white-t2);
  }
  &.active {
    background: var(--dote-color-white-t2);
  }
}
.tool-button.remove {
  padding: 4px;
}
.file-input {
  display: none;
}
.emoji-picker-panel {
  height: 240px;
  margin-top: 8px;
  overflow: hidden;
  border: 1px solid var(--dote-color-white-t1);
  border-radius: 8px;
  background-color: var(--dote-background-color);
}
.misskey-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
  padding: 10px;
  border: 1px solid var(--dote-color-white-t1);
  border-radius: 8px;
  background-color: var(--dote-background-color);
}
.misskey-options-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.misskey-options-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  .nn-checkbox span {
    color: var(--dote-color-white-t5);
    font-size: 0.65rem;
  }
}
.cw-input {
  width: 100%;
  height: 28px;
  font-size: 0.7rem;
}
.attachments-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
  padding: 8px;
  border: 1px solid var(--dote-color-white-t1);
  border-radius: 8px;
  background-color: var(--dote-background-color);
}
.attachment-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 6px;
  border: 1px solid var(--dote-color-white-t1);
  border-radius: 8px;
  background: var(--dote-color-white-t1);
  &.failed {
    border-color: rgba(255, 120, 120, 0.5);
  }
}
.attachment-preview {
  width: 48px;
  height: 48px;
  overflow: hidden;
  border-radius: 6px;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}
.attachment-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
}
.attachment-name {
  color: var(--dote-color-white);
  font-size: 0.7rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.attachment-meta {
  display: flex;
  gap: 8px;
  color: var(--dote-color-white-t5);
  font-size: 0.6rem;
}
.attachment-meta .status {
  &.error {
    color: #ff9b9b;
  }
}
.attachment-alt {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px;
  align-items: center;
  color: var(--dote-color-white-t5);
  font-size: 0.6rem;
}
.attachment-alt-input {
  min-width: 0;
  height: 24px;
  font-size: 0.65rem;
}
.attachment-error {
  color: #ff9b9b;
  font-size: 0.6rem;
}
.attachment-actions {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-left: auto;
}
.post-settings {
  display: flex;
  flex-direction: column;
  width: 50%;
  margin: auto 0 0 auto;
  .field-row {
    display: flex;
    align-items: center;
    width: 100%;
    span {
      color: #fff;
      font-size: 0.6rem;
    }
    .input {
      margin: 0 0 0 auto;
    }
    .select {
      width: 120px;
    }
  }
}
.post-container {
  margin-top: 16px;
  padding-top: 16px;
  /* dashed boarder */
  background-image: linear-gradient(
    to right,
    var(--dote-color-white-t2),
    var(--dote-color-white-t2) 4px,
    transparent 4px,
    transparent 6px
  );
  background-repeat: repeat-x;
  background-size: 8px 1px;

  .post-item {
    padding: 0;
  }
}
</style>
