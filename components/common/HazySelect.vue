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
  value: {
    type: String,
  },
  name: {
    type: String,
    required: true,
  },
});
</script>
<template>
  <select class="nn-select size-small" :name="props.name" @change="$emit('change')" :value="props.value">
    <option value="" disabled>{{ placeholder }}</option>
    <option v-for="option in options" :key="option.value" :value="option.value">
      {{ option.label }}
    </option>
  </select>
</template>
