<script setup lang="ts">
import DoteLoading from "@/components/common/DoteLoading.vue";

const props = defineProps({
  status: {
    type: String,
    default: "default" as "default" | "loading" | "error" | "empty",
  },
});
</script>

<template>
  <div class="dote-post-list">
    <slot />
    <DoteLoading class="loading" v-if="props.status === 'loading'" />
  </div>
</template>

<style lang="scss" scoped>
.dote-post-list {
  display: flex;
  flex-direction: column;
  width: 100%;
  background-color: var(--dote-background-color);
  border: 1px solid var(--dote-border-color);
  border-radius: 8px;
}

.loading {
  padding: 24px 0;
}
</style>
