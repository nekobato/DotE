<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { MisskeyNote } from "@shared/types/misskey";
import { canVoteMisskeyPoll, isMisskeyPollExpired } from "@shared/misskey-poll";
import { useTimelineStore } from "@/store/timeline";
import { useMisskeyStore } from "@/store/misskey";

const props = withDefaults(defineProps<{ note: MisskeyNote; currentInstanceUrl?: string; canVote?: boolean }>(), {
  canVote: false,
});
const timeline = computed(() => (props.canVote ? useTimelineStore() : undefined));
const store = computed(() => (props.canVote ? useMisskeyStore() : undefined));
const poll = computed(() => props.note.poll);
const now = ref(Date.now());
const error = ref("");
const userId = computed(() => timeline.value?.currentUser?.id);
const hasAccount = computed(() =>
  Boolean(
    userId.value &&
    timeline.value?.currentInstance?.type === "misskey" &&
    timeline.value.currentInstance.url === props.currentInstanceUrl,
  ),
);
const isSending = computed(() => Boolean(userId.value && store.value?.isVotingInPoll(userId.value, props.note.id)));
const total = computed(() => poll.value?.choices.reduce((sum, choice) => sum + choice.votes, 0) ?? 0);
const expired = computed(() => Boolean(poll.value && isMisskeyPollExpired(poll.value, now.value)));
const voted = computed(() => poll.value?.choices.some((choice) => choice.isVoted));
const status = computed(() => (expired.value ? "投票は終了しました" : voted.value ? "投票済み" : "未投票"));
const disabled = (index: number) =>
  !hasAccount.value || isSending.value || !poll.value || !canVoteMisskeyPoll(poll.value, index, now.value);

let mounted = false;
let expiryTimer: ReturnType<typeof setTimeout> | undefined;
const scheduleExpiry = () => {
  clearTimeout(expiryTimer);
  now.value = Date.now();
  const remaining = Date.parse(poll.value?.expiresAt ?? "") - now.value;
  if (mounted && remaining > 0) expiryTimer = setTimeout(scheduleExpiry, Math.min(remaining + 1, 2_147_483_647));
};
onMounted(() => {
  mounted = true;
  scheduleExpiry();
});
onBeforeUnmount(() => {
  mounted = false;
  clearTimeout(expiryTimer);
});
watch(() => poll.value?.expiresAt, scheduleExpiry);
watch(
  () => `${userId.value}:${props.note.id}`,
  () => {
    error.value = "";
  },
);

const vote = async (choice: number) => {
  if (disabled(choice) || !userId.value || !props.currentInstanceUrl || !store.value) return;
  const scope = `${userId.value}:${props.note.id}`;
  error.value = "";
  const ok = await store.value.voteInPoll({
    note: props.note,
    choice,
    userId: userId.value,
    instanceUrl: props.currentInstanceUrl,
  });
  if (scope === `${userId.value}:${props.note.id}` && !ok)
    error.value = "投票に失敗しました。投稿を更新してからもう一度お試しください";
};
</script>

<template>
  <section class="poll" v-if="poll" aria-label="投票" :aria-busy="isSending">
    <p class="instruction">{{ poll.multiple ? "複数選択可・選択肢ごとに投票" : "1つの選択肢に投票" }}</p>
    <button
      class="choice"
      type="button"
      v-for="(choice, index) in poll.choices"
      :key="index"
      :class="{ 'is-voted': choice.isVoted }"
      :disabled="disabled(index)"
      :aria-pressed="choice.isVoted"
      :aria-label="`${choice.text}・${choice.votes}票${choice.isVoted ? '・投票済み' : ''}`"
      @click="vote(index)"
    >
      <span class="bar" aria-hidden="true" :style="{ width: `${total ? (choice.votes / total) * 100 : 0}%` }" />
      <span class="label">{{ choice.text }}<span class="voted" v-if="choice.isVoted"> ✓ 投票済み</span></span>
      <span class="count">{{ choice.votes }}票</span>
    </button>
    <p class="summary" aria-live="polite">
      計{{ total }}票 · {{ isSending ? "投票中…" : status }}
      <template v-if="poll.expiresAt">
        · 締切 <time :datetime="poll.expiresAt">{{ new Date(poll.expiresAt).toLocaleString("ja-JP") }}</time></template
      >
      <template v-else> · 締切なし</template>
    </p>
    <p class="error" v-if="error" role="alert">{{ error }}</p>
  </section>
</template>

<style lang="scss" scoped>
.poll {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  margin-top: 6px;
  color: var(--color-text-body);
  font-size: var(--font-size-12);
  .instruction,
  .summary,
  .error {
    margin: 0;
    line-height: 1.5;
  }
  .summary {
    color: var(--dote-color-white-t5);
  }
  .error {
    font-weight: bold;
  }
  .choice {
    position: relative;
    display: flex;
    gap: 8px;
    align-items: center;
    justify-content: space-between;
    min-height: 32px;
    padding: 6px 8px;
    overflow: hidden;
    color: inherit;
    text-align: left;
    background: var(--dote-color-white-t1);
    border: 1px solid var(--dote-color-white-t2);
    border-radius: 4px;
    &:not(:disabled) {
      cursor: pointer;
    }
    &:focus-visible {
      outline: 2px solid var(--color-text-body);
      outline-offset: 2px;
    }
    &.is-voted {
      border-color: var(--color-text-body);
    }
  }
  .bar {
    position: absolute;
    inset: 0 auto 0 0;
    background: var(--dote-color-white-t2);
  }
  .label {
    position: relative;
    overflow-wrap: anywhere;
  }
  .count {
    position: relative;
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
  }
  .voted {
    font-size: var(--font-size-10);
  }
}
</style>
