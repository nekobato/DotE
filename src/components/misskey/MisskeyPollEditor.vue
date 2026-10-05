<script setup lang="ts">
import { useId } from "vue";
import type { MisskeyPollDraft } from "@shared/misskey-poll";

const model = defineModel<MisskeyPollDraft>({ required: true });
const props = defineProps<{ disabled: boolean; error: string }>();
const emit = defineEmits<{ edit: [] }>();
const id = useId();
const update = (patch: Partial<MisskeyPollDraft>) => {
  model.value = { ...model.value, ...patch };
  emit("edit");
};
const updateChoice = (index: number, event: Event) => {
  update({
    choices: model.value.choices.map((choice, i) => (i === index ? (event.target as HTMLInputElement).value : choice)),
  });
};
const removeChoice = (index: number) => update({ choices: model.value.choices.filter((_, i) => i !== index) });
</script>

<template>
  <fieldset class="poll-editor" :disabled="props.disabled" :aria-describedby="`${id}-hint ${id}-error`">
    <legend>投票</legend>
    <p class="hint" :id="`${id}-hint`">選択肢は2〜10個、各50文字以内で入力してください。</p>
    <div class="choice" v-for="(choice, index) in model.choices" :key="index">
      <label :for="`${id}-choice-${index}`">選択肢{{ index + 1 }}</label>
      <input
        class="nn-text-field"
        type="text"
        :id="`${id}-choice-${index}`"
        :name="`pollChoice${index}`"
        :value="choice"
        :aria-invalid="Boolean(props.error)"
        @input="updateChoice(index, $event)"
      />
      <button
        class="nn-button size-small"
        type="button"
        :disabled="model.choices.length <= 2"
        :aria-label="`選択肢${index + 1}を削除`"
        @click="removeChoice(index)"
      >
        削除
      </button>
    </div>
    <button
      class="nn-button size-small add-choice"
      type="button"
      :disabled="model.choices.length >= 10"
      @click="update({ choices: [...model.choices, ''] })"
    >
      選択肢を追加
    </button>
    <label class="multiple"
      ><input
        type="checkbox"
        name="pollMultiple"
        :checked="model.multiple"
        @change="update({ multiple: ($event.target as HTMLInputElement).checked })"
      />複数選択を許可</label
    >
    <div class="deadline">
      <label :for="`${id}-deadline`">締切</label>
      <select
        class="nn-select"
        :id="`${id}-deadline`"
        name="pollDeadline"
        :value="model.expiredAfter ?? ''"
        @change="
          update({
            expiredAfter: ($event.target as HTMLSelectElement).value
              ? Number(($event.target as HTMLSelectElement).value)
              : null,
          })
        "
      >
        <option value="">締切なし</option>
        <option value="300000">5分後</option>
        <option value="1800000">30分後</option>
        <option value="3600000">1時間後</option>
        <option value="86400000">1日後</option>
        <option value="604800000">7日後</option>
      </select>
    </div>
    <p class="error" :id="`${id}-error`" role="alert" v-if="props.error">{{ props.error }}</p>
  </fieldset>
</template>

<style lang="scss" scoped>
.poll-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  margin: 8px 0 0;
  padding: 10px;
  color: var(--color-text-body);
  font-size: 0.75rem;
  background: var(--dote-background-color);
  border: 1px solid var(--dote-color-white-t2);
  border-radius: 8px;
  legend {
    padding: 0 4px;
  }
  .hint,
  .error {
    margin: 0;
    line-height: 1.5;
  }
  .hint {
    color: var(--dote-color-white-t5);
  }
  .error {
    font-weight: bold;
  }
  .choice {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 6px;
    align-items: center;
  }
  .choice input {
    width: 100%;
    min-height: 32px;
  }
  .add-choice {
    align-self: flex-start;
  }
  .multiple,
  .deadline {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .deadline select {
    min-height: 32px;
  }
}
</style>
