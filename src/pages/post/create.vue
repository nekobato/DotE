<script setup lang="ts">
import DoteAlert from "@/components/common/DoteAlert.vue";
import DoteButton from "@/components/common/DoteButton.vue";
import BlueskyPost from "@/components/PostItem/BlueskyPost.vue";
import MastodonToot from "@/components/PostItem/MastodonToot.vue";
import MisskeyNote from "@/components/PostItem/MisskeyNote.vue";
import EmojiPicker from "@/components/EmojiPicker.vue";
import Mfm from "@/components/misskey/Mfm.vue";
import type { BlueskyPost as BlueskyPostType } from "@/types/bluesky";
import type { MastodonToot as MastodonTootType } from "@/types/mastodon";
import { getPathForFile, ipcInvoke, ipcSend } from "@/utils/ipc";
import { AppBskyFeedDefs } from "@atproto/api";
import { Icon } from "@iconify/vue";
import type { MisskeyEntities, MisskeyNote as MisskeyNoteType } from "@shared/types/misskey";
import type { Instance, Settings, Timeline, User } from "@shared/types/store";
import { ElAvatar, ElInput } from "element-plus";
import { computed, nextTick, onBeforeUnmount, onMounted, PropType, reactive, ref } from "vue";
import type { ApiInvokeResult } from "@shared/types/ipc";

type PageProps = {
  post?: MisskeyNoteType | MastodonTootType | BlueskyPostType;
  emojis?: MisskeyEntities.EmojiSimple[];
  mode?: "boost";
};

type UploadStatus = "ready" | "uploading" | "uploaded" | "failed";

type AttachmentItem = {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  previewUrl?: string;
  status: UploadStatus;
  fileId?: string;
  mediaId?: string;
  error?: string;
};

type FileWithPath = File & { path?: string };

const submitTextMap = {
  note: "Note",
  renote: "Renote",
  quote: "Quote",
  toot: "Toot",
  boost: "Boost",
  post: "Post",
  repost: "Repost",
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
const showMfmPreview = ref(false);
const showMisskeyOptions = ref(false);
const emojiPickerRef = ref<{
  focusSearch: () => void;
  resetSearch: () => void;
} | null>(null);
const textInputRef = ref<{ textarea?: HTMLTextAreaElement | null } | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const attachments = ref<AttachmentItem[]>([]);
const misskeyVisibility = ref<"public" | "home" | "followers" | null>(null);
const misskeyLocalOnly = ref(false);
const misskeyNoExtractMentions = ref(false);
const misskeyNoExtractHashtags = ref(false);
const misskeyNoExtractEmojis = ref(false);
const misskeyNoExtractLinks = ref(false);
const postFontStyle = computed(() => ({
  ...(state.settings?.font.family ? { fontFamily: state.settings.font.family } : {}),
}));
const canUseEmojiPicker = computed(
  () => state.instance?.type === "misskey" && (props.data.emojis?.length ?? 0) > 0,
);
const canUseMfmPreview = computed(() => state.instance?.type === "misskey");
const canUseAttachments = computed(
  () => state.instance?.type === "misskey" || state.instance?.type === "mastodon",
);
const canUseMisskeyOptions = computed(() => state.instance?.type === "misskey");
const hasUploadingAttachments = computed(() => attachments.value.some((item) => item.status === "uploading"));
const hasFailedAttachments = computed(() => attachments.value.some((item) => item.status === "failed"));
const uploadedMisskeyFileIds = computed(() =>
  attachments.value.filter((item) => item.status === "uploaded" && item.fileId).map((item) => item.fileId as string),
);
const uploadedMastodonMediaIds = computed(() =>
  attachments.value.filter((item) => item.status === "uploaded" && item.mediaId).map((item) => item.mediaId as string),
);
const hasAttachments = computed(() => attachments.value.length > 0);
const isBoostMode = computed(() => props.data.mode === "boost");
const boostTargetId = computed(() => {
  if (!isBoostMode.value) return undefined;
  const target = props.data.post as MastodonTootType | undefined;
  return target?.id;
});

const handleApiResult = <T>(result: ApiInvokeResult<T>, message: string): T | undefined => {
  if (!result.ok) {
    state.post.error = message;
    console.error(message, result.error);
    return undefined;
  }
  return result.data;
};

const mastodonToot = computed(() => {
  if (state.instance?.type === "mastodon" && props.data.post) {
    return {
      account: {
        name: state.user?.name,
        host: state.instance?.url,
        avatarUrl: state.user?.avatarUrl,
      },
      reblog: props.data.post as MastodonTootType["reblog"],
    } as unknown as MastodonTootType;
  }
});

const misskeyNote = computed(() => {
  if (state.instance?.type === "misskey") {
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

    // Add embed if we're quoting a post
    if (quotePost) {
      mockPost.post.embed = {
        $type: "app.bsky.embed.record#view",
        record: quotePost,
      };
    }

    return mockPost;
  }
  return null;
});

const submitType = computed(() => {
  if (state.instance?.type === "misskey") {
    if (misskeyNote.value?.renote) {
      return text.value ? "quote" : "renote";
    }
    return "note";
  }
  if (state.instance?.type === "mastodon") {
    if (isBoostMode.value) {
      return "boost";
    }
    if (mastodonToot.value) {
      return "boost";
    }
    return "toot";
  }
  if (state.instance?.type === "bluesky") {
    if (props.data.post) {
      return text.value ? "quote" : "repost";
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

  if (submitType.value === "note" || submitType.value === "toot" || submitType.value === "post") {
    if (state.instance?.type === "misskey") {
      return text.value.length > 0 || hasAttachments.value;
    }
    if (state.instance?.type === "mastodon") {
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

const clearAttachments = () => {
  attachments.value.forEach((item) => {
    if (item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
  });
  attachments.value = [];
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

const uploadMastodonMedia = async (item: AttachmentItem): Promise<boolean> => {
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
    updateAttachment(item.id, (current) => ({
      ...current,
      status: "uploaded",
      mediaId: (res as { id: string }).id,
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

const addAttachment = async (file: File) => {
  const filePath = getPathForFile(file) || (file as FileWithPath).path;
  if (!filePath) {
    state.post.error = "ファイルパスを取得できませんでした";
    return;
  }

  const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
  const item: AttachmentItem = {
    id: createAttachmentId(),
    name: file.name,
    path: filePath,
    size: file.size,
    type: file.type,
    previewUrl,
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

const postToMisskey = async () => {
  const targetNote = props.data.post as MisskeyNoteType | null;
  const renoteId = targetNote?.renoteId && !targetNote.text ? targetNote.renoteId : targetNote?.id;
  if (!(await uploadMisskeyAttachments())) {
    return;
  }
  const fileIds = uploadedMisskeyFileIds.value.length ? uploadedMisskeyFileIds.value : null;

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
    // replyId: null,
    renoteId: renoteId || null,
    fileIds,
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
    // inReplyToId: null,
    mediaIds,
    // sensitive: false,
    // spoilerText: null,
    // visibility: "public",
  });
  const res = handleApiResult(result, `${state.instance?.name ?? "Mastodon"} への投稿に失敗しました`);
  if (res?.id) {
    text.value = "";
    clearAttachments();
    ipcSend("post:close");
  }
};

const postToBluesky = async () => {
  const targetPost = props.data.post as BlueskyPostType | null;
  const quoteRef = targetPost ? { uri: targetPost.uri, cid: targetPost.cid } : undefined;
  const did = state.user?.blueskySession?.did;
  if (!did) {
    throw new Error("Blueskyアカウントの認証情報が見つかりませんでした");
  }

  const result = await ipcInvoke("api", {
    method: "bluesky:createPost",
    did,
    text: text.value,
    quote: quoteRef,
  });

  const res = handleApiResult(result, `${state.instance?.name ?? "Bluesky"} への投稿に失敗しました`);
  if (res && (res as any).uri) {
    text.value = "";
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

const toggleMfmPreview = () => {
  showMfmPreview.value = !showMfmPreview.value;
};

const toggleMisskeyOptions = () => {
  showMisskeyOptions.value = !showMisskeyOptions.value;
};
const onSelectEmoji = async (emoji: MisskeyEntities.EmojiSimple) => {
  await insertEmojiAtCursor(emoji.name);
};

onBeforeUnmount(() => {
  clearAttachments();
});

onMounted(async () => {
  const users = await ipcInvoke("db:get-users");
  const timelines = await ipcInvoke("db:get-timeline-all");
  const instances = await ipcInvoke("db:get-instance-all");
  state.settings = await ipcInvoke("settings:all");
  state.timeline = timelines.find((timeline: any) => timeline.available);
  state.user = users.find((user: any) => user.id === state.timeline?.userId);
  state.instance = instances.find((instance: any) => instance.id === state.user?.instanceId);
});

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
  <div class="post" :style="postFontStyle">
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
        <div class="post-tools" v-if="!isBoostMode && (canUseEmojiPicker || canUseMfmPreview)">
          <button v-if="canUseEmojiPicker" class="nn-button size-small tool-button" @click="toggleEmojiPicker">
            <Icon icon="mingcute:emoji-line" class="nn-icon size-xsmall" />
            <span>絵文字</span>
          </button>
          <button
            v-if="canUseMfmPreview"
            class="nn-button size-small tool-button"
            :class="{ active: showMfmPreview }"
            @click="toggleMfmPreview"
          >
            <Icon icon="mingcute:eye-2-line" class="nn-icon size-xsmall" />
            <span>プレビュー</span>
          </button>
        </div>
        <div class="post-tools" v-if="!isBoostMode && canUseMisskeyOptions">
          <button
            class="nn-button size-small tool-button"
            :class="{ active: showMisskeyOptions }"
            @click="toggleMisskeyOptions"
          >
            <Icon icon="mingcute:settings-4-line" class="nn-icon size-xsmall" />
            <span>投稿設定</span>
          </button>
        </div>
        <div class="post-tools" v-if="!isBoostMode && canUseAttachments">
          <button class="nn-button size-small tool-button" @click="openFilePicker">
            <Icon icon="mingcute:attachment-line" class="nn-icon size-xsmall" />
            <span>添付</span>
          </button>
          <input class="file-input" type="file" multiple ref="fileInputRef" @change="onSelectFiles" />
        </div>
        <div class="emoji-picker-panel" v-if="!isBoostMode && canUseEmojiPicker && showEmojiPicker">
          <EmojiPicker ref="emojiPickerRef" :emojis="props.data.emojis || []" @select="onSelectEmoji" />
        </div>
        <div class="mfm-preview-panel" v-if="!isBoostMode && canUseMfmPreview && showMfmPreview">
          <div class="mfm-preview-header">MFM プレビュー</div>
          <div class="mfm-preview-body">
            <Mfm :text="text" :emojis="props.data.emojis || []" :host="state.instance?.url" postStyle="all" />
            <div class="mfm-preview-empty" v-if="text.length === 0">本文を入力するとプレビューが表示されます</div>
          </div>
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
                <span class="status" v-if="item.status === 'uploaded'">完了</span>
                <span class="status error" v-if="item.status === 'failed'">失敗</span>
              </div>
              <div class="attachment-error" v-if="item.error">{{ item.error }}</div>
            </div>
            <button
              class="nn-button size-small tool-button remove"
              :disabled="item.status === 'uploading'"
              @click="removeAttachment(item.id)"
            >
              <Icon icon="mingcute:close-line" class="nn-icon size-xsmall" />
            </button>
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
        v-if="blueskyPost"
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
  margin-left: auto;
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
.mfm-preview-panel {
  margin-top: 8px;
  overflow: hidden;
  border: 1px solid var(--dote-color-white-t1);
  border-radius: 8px;
  background-color: var(--dote-background-color);
}
.mfm-preview-header {
  padding: 6px 10px;
  color: var(--dote-color-white-t5);
  font-size: 0.65rem;
  border-bottom: 1px solid var(--dote-color-white-t1);
}
.mfm-preview-body {
  max-height: 240px;
  padding: 8px 10px;
  overflow-y: auto;
}
.mfm-preview-empty {
  color: var(--dote-color-white-t3);
  font-size: 0.7rem;
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
.attachment-error {
  color: #ff9b9b;
  font-size: 0.6rem;
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
