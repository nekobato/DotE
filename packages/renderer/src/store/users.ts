import { ipcInvoke } from "@/utils/ipc";
import { User } from "@prisma/client";
import { defineStore } from "pinia";

export const useUsersStore = defineStore("users", {
  state: (): User[] => [],
  getters: {
    users: (state) => state,
    isEmpty: (state) => {
      return state.length === 0;
    },
  },
  actions: {
    async init() {
      const users = await ipcInvoke("db:get-users");
      this.$state = users;
    },
    async create(user: Omit<User, "id">) {
      await ipcInvoke("db:upsert-user", {
        name: user.name,
        username: user.username,
        instanceType: user.instanceType,
        instanceUrl: user.instanceUrl,
        token: user.token,
        avatarUrl: user.avatarUrl || "",
      });
      this.init();
    },
    async delete(id: number) {
      await ipcInvoke("db:delete-user", { id });
      this.init();
    },
  },
});
