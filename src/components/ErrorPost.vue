<script setup lang="ts">
import { useStore, type ErrorItem } from "@/store";
import { Icon } from "@iconify/vue";
import { onMounted } from "vue";
import { type PropType } from "vue";

const store = useStore();

const props = defineProps({
  error: {
    type: Object as PropType<ErrorItem & { index: number }>,
    required: true,
  },
});

const deleteError = (index: number) => {
  store.$state.errors.splice(index, 1);
};

onMounted(() => {
  setTimeout(() => {
    deleteError(props.error.index);
  }, 5000);
});
</script>

<template>
  <div class="dote-error-post">
    <div class="icon">
      <Icon icon="mingcute:alert-fill" class="nn-icon size-small" />
    </div>
    <p class="error-body">
      {{ props.error.message }}
    </p>
    <div class="actions">
      <button class="nn-button action" @click="deleteError(props.error.index)">
        <Icon class="nn-icon size-xsmall" icon="mingcute:close-line" />
      </button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.dote-error-post {
  display: flex;
  align-items: center;
  height: 56px;
  margin-bottom: 8px;
  padding: 8px;
  color: var(--dote-text-color);
  background-color: var(--dote-background-color);
  border-radius: 8px;
}
.icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
}
.error-body {
  flex: 1;
  margin: 0;
  font-size: var(--font-size-14);
}
</style>
