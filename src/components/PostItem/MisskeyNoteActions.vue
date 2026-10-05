<script setup lang="ts">
import { ElDialog, ElMessage } from "element-plus";
import { computed, ref, useId, useTemplateRef, watch } from "vue";
import type { MisskeyNote } from "@shared/types/misskey";
import type { PostAction } from "@/types/post-action";
import { useTimelineStore } from "@/store/timeline";
import { useMisskeyNoteManagementStore } from "@/store/misskeyNoteManagement";
import PostActionDropdown from "./PostActionDropdown.vue";

const props = defineProps<{
  note: MisskeyNote;
  currentInstanceUrl?: string;
  actions: PostAction[];
  createdAt?: string;
}>();
const emit = defineEmits<{ select: [command: string] }>();
const timeline = useTimelineStore();
const management = useMisskeyNoteManagementStore();
const actionMenu = useTemplateRef("actionMenu");
const id = useId();
const params = computed(() => {
  const userId = timeline.currentUser?.id;
  if (
    !userId ||
    timeline.currentInstance?.type !== "misskey" ||
    timeline.currentInstance.url !== props.currentInstanceUrl
  )
    return undefined;
  return { userId, instanceUrl: props.currentInstanceUrl, noteId: props.note.id };
});
const entry = computed(() => (params.value ? management.entryFor(params.value) : undefined));
const scope = computed(() => `${params.value?.userId}:${params.value?.instanceUrl}:${params.value?.noteId}`);
const working = computed(() => Boolean(entry.value?.busy || entry.value?.loading || entry.value?.clipsLoading));
const open = ref(false);
const dialog = ref<"clip" | "unrenote">("clip");
const dialogScope = ref("");
const selectedClip = ref("");
const clip = computed(() => entry.value?.clips.find((item) => item.id === selectedClip.value));
const alreadyClipped = computed(() => entry.value?.clippedIds.includes(selectedClip.value));

watch(scope, () => {
  open.value = false;
  selectedClip.value = "";
});

const actions = computed<PostAction[]>(() => {
  if (!entry.value) return props.actions;
  const stateDisabled = working.value || !entry.value.state || entry.value.unsupported.includes("state");
  return [
    ...props.actions,
    {
      command: "favorite",
      icon: "mingcute:bookmark-line",
      label: entry.value.state?.isFavorited ? "お気に入りを解除" : "お気に入りに追加",
      disabled: stateDisabled || entry.value.unsupported.includes("favorite"),
    },
    {
      command: "clip",
      icon: "mingcute:paperclip-line",
      label: "クリップに追加",
      disabled: working.value || entry.value.unsupported.includes("clip"),
    },
    {
      command: "mute-thread",
      icon: "mingcute:notification-off-line",
      label: entry.value.state?.isMutedThread ? "スレッドのミュートを解除" : "スレッドをミュート",
      disabled: stateDisabled || entry.value.unsupported.includes("mute"),
    },
    {
      command: "unrenote",
      icon: "mingcute:repeat-fill",
      label: "自分のRenote・引用を取り消す",
      disabled: working.value || entry.value.unsupported.includes("unrenote"),
    },
  ];
});

const loadState = () => {
  if (params.value) void management.loadState(params.value);
};
const loadClips = (more = false) => {
  if (params.value) void management.loadClips(params.value, more);
};
const selectAction = (command: string) => {
  if (actions.value.find((item) => item.command === command)?.disabled) return;
  const current = params.value;
  if (!current || !entry.value) {
    emit("select", command);
    return;
  }
  switch (command) {
    case "favorite":
      void management.setState(current, "favorite", !entry.value.state?.isFavorited);
      return;
    case "mute-thread":
      void management.setState(current, "mute", !entry.value.state?.isMutedThread);
      return;
    case "clip":
    case "unrenote":
      dialog.value = command;
      dialogScope.value = scope.value;
      selectedClip.value = "";
      open.value = true;
      if (command === "clip") loadClips();
      return;
    default:
      emit("select", command);
  }
};

const addToClip = async () => {
  if (!params.value || dialogScope.value !== scope.value || !clip.value || working.value) return;
  const currentScope = scope.value;
  const ok = await management.addToClip(params.value, selectedClip.value);
  if (ok && currentScope === scope.value) open.value = false;
};
const unrenote = async () => {
  if (!params.value || dialogScope.value !== scope.value || working.value) return;
  const currentScope = scope.value;
  const ok = await management.unrenote(params.value);
  if (ok && currentScope === scope.value) {
    open.value = false;
    ElMessage.success("この投稿への自分のRenote・引用を取り消しました");
  }
};
const closeDialog = (done: () => void) => {
  if (!entry.value?.busy) done();
};
</script>

<template>
  <PostActionDropdown
    ref="actionMenu"
    :actions="actions"
    :createdAt="props.createdAt"
    @select="selectAction"
    @open="loadState"
  />
  <div class="feedback" v-if="entry && !open" aria-live="polite">
    <p v-if="working" role="status">操作の状態を確認中…</p>
    <p v-else-if="entry.error" role="alert">{{ entry.error }}</p>
    <p v-else-if="entry.message" role="status">{{ entry.message }}</p>
    <button class="nn-button size-small" type="button" v-if="entry.error" :disabled="working" @click="loadState">
      状態を再取得
    </button>
  </div>
  <ElDialog
    v-model="open"
    :title="dialog === 'clip' ? 'クリップに追加' : 'Renote・引用の取り消し'"
    width="min(420px, calc(100vw - 32px))"
    align-center
    append-to-body
    :before-close="closeDialog"
    :show-close="!entry?.busy"
    :close-on-click-modal="!entry?.busy"
    :close-on-press-escape="!entry?.busy"
    @closed="actionMenu?.focusTrigger()"
  >
    <div class="management-dialog" v-if="entry">
      <p class="account">操作するアカウント: {{ timeline.currentUser?.name }}</p>
      <template v-if="dialog === 'clip'">
        <p v-if="entry.clipsLoading" role="status">クリップを読み込み中…</p>
        <template v-if="entry.clips.length">
          <label :for="`${id}-clip`">追加先のクリップ</label>
          <select class="nn-select" :id="`${id}-clip`" v-model="selectedClip" :disabled="working" required>
            <option value="" disabled>クリップを選択してください</option>
            <option v-for="item in entry.clips" :key="item.id" :value="item.id">
              {{ item.name }}（{{ item.isPublic ? "公開" : "非公開" }}）
            </option>
          </select>
          <p class="description" v-if="clip?.description">{{ clip.description }}</p>
          <button
            class="nn-button size-small"
            type="button"
            v-if="entry.clipsHasMore"
            :disabled="working"
            @click="loadClips(true)"
          >
            さらに読み込む
          </button>
          <p v-if="alreadyClipped" role="status">このクリップには追加済みです</p>
        </template>
        <p v-else-if="entry.clipsLoaded && !entry.clipsLoading">
          クリップがありません。追加先のクリップをMisskeyで作成してください。
        </p>
        <p v-if="entry.error" role="alert">{{ entry.error }}</p>
        <button
          class="nn-button size-small"
          type="button"
          v-if="entry.error || (entry.clipsLoaded && !entry.clips.length)"
          :disabled="working"
          @click="loadClips()"
        >
          一覧を再取得
        </button>
      </template>
      <template v-else>
        <p>この投稿に対する、操作するアカウントのRenoteと引用をすべて削除します。</p>
        <p>引用に書いた本文や添付を含む投稿も削除されます。元の投稿と他のアカウントの投稿は残ります。</p>
        <p class="warning">この操作は元に戻せません。</p>
        <p v-if="entry.error" role="alert">{{ entry.error }}</p>
      </template>
    </div>
    <template #footer>
      <div class="dialog-actions">
        <button class="nn-button" type="button" :disabled="entry?.busy" @click="open = false">キャンセル</button>
        <button
          class="nn-button"
          type="button"
          v-if="dialog === 'clip'"
          :disabled="working || !clip || alreadyClipped || entry?.unsupported.includes('clip')"
          @click="addToClip"
        >
          {{ entry?.busy ? "追加中…" : "追加" }}
        </button>
        <button
          class="nn-button"
          type="button"
          v-else
          :disabled="working || entry?.unsupported.includes('unrenote')"
          @click="unrenote"
        >
          {{ entry?.busy ? "取り消し中…" : "Renote・引用をすべて取り消す" }}
        </button>
      </div>
    </template>
  </ElDialog>
</template>

<style scoped lang="scss">
.feedback,
.management-dialog {
  color: var(--color-text-body);
  font-size: var(--font-size-12);
  line-height: 1.5;
  overflow-wrap: anywhere;
  p {
    margin: 8px 0;
  }
}
.management-dialog {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 60vh;
  overflow-y: auto;
  select {
    width: 100%;
    min-width: 0;
    min-height: 36px;
  }
  button {
    align-self: flex-start;
  }
  .warning {
    font-weight: bold;
  }
}
.dialog-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}
</style>
