<script setup lang="ts">
const props = defineProps({
  placeholder: {
    type: String,
    required: true,
  },
  options: {
    type: Array as PropType<{ label: string; value: string }[]>,
    required: true,
  },
  default: {
    type: String,
    default: "",
  },
});
</script>
<template>
  <select class="nn-select size-small" :value="props.default" @change="$emit('change')">
    <option value="" disabled>{{ placeholder }}</option>
    <option v-for="option in options" :key="option.value" :value="option.value">
      {{ option.label }}
    </option>
  </select>
</template>
