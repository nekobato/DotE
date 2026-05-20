<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { ElDropdown, ElDropdownItem, ElDropdownMenu } from "element-plus";
import { computed, ref } from "vue";
import { formatPostDateTime } from "@/utils/postDate";

/**
 * Dropdown menu item displayed in the post action menu.
 */
type PostActionDropdownAction = {
  command: string;
  icon: string;
  label: string;
  disabled?: boolean;
};

const props = defineProps<{
  actions: PostActionDropdownAction[];
  createdAt?: string;
}>();

const emit = defineEmits<{
  select: [command: string];
}>();

const isDropdownOpen = ref(false);

const formattedCreatedAt = computed(() => formatPostDateTime(props.createdAt));

/**
 * Emit a selected action command from Element Plus dropdown events.
 */
const selectAction = (command: string | number | object) => {
  if (typeof command === "string") {
    emit("select", command);
  }
};

/**
 * Keep the trigger visible while the dropdown menu is open.
 */
const setDropdownOpen = (visible: boolean) => {
  isDropdownOpen.value = visible;
};
</script>

<template>
  <div class="dote-post-actions" :class="{ 'is-open': isDropdownOpen }" v-if="props.actions.length">
    <time
      class="dote-post-action-created-at"
      v-if="formattedCreatedAt"
      :datetime="props.createdAt"
      :title="formattedCreatedAt"
    >
      {{ formattedCreatedAt }}
    </time>
    <ElDropdown
      trigger="click"
      placement="bottom-end"
      popper-class="dote-post-action-dropdown-popper"
      @command="selectAction"
      @visible-change="setDropdownOpen"
    >
      <button class="dote-post-action" type="button" aria-label="投稿アクション" title="投稿アクション">
        <Icon class="nn-icon size-xsmall" icon="mingcute:chat-4-line" />
      </button>
      <template #dropdown>
        <ElDropdownMenu>
          <ElDropdownItem
            v-for="action in props.actions"
            :key="action.command"
            :command="action.command"
            :disabled="action.disabled"
          >
            <span class="dote-post-action-dropdown-item">
              <Icon class="nn-icon size-xsmall" :icon="action.icon" />
              <span>{{ action.label }}</span>
            </span>
          </ElDropdownItem>
        </ElDropdownMenu>
      </template>
    </ElDropdown>
  </div>
</template>

<style scoped lang="scss">
:global(.dote-post .dote-post-actions) {
  position: absolute;
  top: 4px;
  right: 4px;
  display: inline-flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  margin: 0 0 0 auto;
  padding: 0;
  overflow: hidden;
  background: transparent;
  visibility: hidden;
}

:global(.dote-post:hover .dote-post-actions),
:global(.dote-post:focus-within .dote-post-actions),
:global(.dote-post .dote-post-actions.is-open) {
  visibility: visible;
}

.dote-post-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: auto;
  min-width: 32px;
  height: 20px;
  margin: 0;
  padding: 0 8px;
  color: var(--dote-color-white-t4);
  font-size: var(--post-action--font-size);
  line-height: var(--post-action--line-height);
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  appearance: none;

  &:hover,
  &:focus-visible {
    background: var(--dote-color-white-t1);
    filter: brightness(0.9);
  }

  &:focus-visible {
    outline: 1px solid var(--dote-color-white-t4);
    outline-offset: -1px;
  }

  > .nn-icon {
    width: 16px;
    height: 16px;
    color: var(--dote-color-white);
  }
}

.dote-post-action-created-at {
  display: inline-flex;
  align-items: center;
  height: 20px;
  color: var(--dote-color-white-t3);
  font-weight: bold;
  font-size: var(--font-size-10);
  line-height: var(--font-size-10);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

:global(.dote-post-action-dropdown-popper .el-dropdown-menu) {
  min-width: 144px;
  padding: 4px;
  background: var(--dote-background-color);
  border: 1px solid var(--dote-border-color);
}

:global(.dote-post-action-dropdown-popper .el-dropdown-menu__item) {
  min-height: 28px;
  padding: 0 8px;
  color: var(--dote-color-white);
  font-size: var(--font-size-12);
  line-height: 28px;
  border-radius: 4px;
}

:global(.dote-post-action-dropdown-popper .el-dropdown-menu__item:not(.is-disabled):hover),
:global(.dote-post-action-dropdown-popper .el-dropdown-menu__item:not(.is-disabled):focus) {
  color: var(--dote-color-white);
  background: var(--dote-color-white-t1);
}

:global(.dote-post-action-dropdown-item) {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  min-width: 112px;
}

:global(.dote-post-action-dropdown-item .nn-icon) {
  width: 16px;
  height: 16px;
  color: var(--dote-color-white);
}
</style>
