import { ipcInvoke } from "@/utils/ipc";
import { User } from "@prisma/client";
import { defineStore } from "pinia";

export const useUsersStore = defineStore("users", {
  state: (): User[] => [],
  actions: {
    async init() {
      const users = await ipcInvoke("db:get-users");
      this.$state = users;
    },
  },
});
