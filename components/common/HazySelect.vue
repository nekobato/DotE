<script setup lang="ts">
import { Teleport } from "vue";
import { Select, SelectContent, SelectLabel, SelectOption, SelectPositioner, SelectTrigger } from "@ark-ui/vue";
import { useProp } from "element-plus";

const props = defineProps({
  placeholder: {
    type: String,
    required: true,
  },
  options: {
    type: Array as PropType<{ label: string; value: string }[]>,
    required: true,
  },
});
</script>
<template>
  <Select>
    <SelectTrigger>
      <button>{{ placeholder }}</button>
    </SelectTrigger>
    <Teleport to="body">
      <SelectPositioner>
        <SelectContent>
          <SelectOption
            v-for="option in props.options"
            :key="option.value"
            :value="option.value"
            :label="option.label"
          />
        </SelectContent>
      </SelectPositioner>
    </Teleport>
  </Select>
</template>
