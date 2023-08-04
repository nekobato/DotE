import { InjectionKey } from "vue";
import { createStore, Store, useStore as baseUseStore } from "vuex";
import * as types from "../../../mutation-types";
import state, { State } from "./state";
import { ipcInvoke, ipcSend } from "@/utils/ipc";
import { Post } from "@/types/Post";

// for Browser debug
if (!window.ipc) {
  window.ipc = {
    send: () => {},
    invoke: async (event: string, payload?: any) => {},
    on: () => {},
  };
}

window.ipc.on("SET_OPACITY", (_: any, payload: string) => {
  store.commit("changeOpacity", { value: parseInt(payload, 10) });
});

const hideOnTaskBar = localStorage.getItem("Settings.hideOnTaskBar");

if (hideOnTaskBar === "false") {
  ipcSend(types.SET_HIDE_ON_TASKBAR, { toggle: hideOnTaskBar });
}

const store = createStore({
  state,
  mutations: {
    setUsers(state, users) {
      state.users = users;
    },
    setTimeline(state, timeline) {
      state.timeline = { ...state.timeline, ...timeline };
    },
    addPostList(state, postList: Post[]) {
      state.timeline.postList = [...postList, ...state.timeline.postList];
    },
    setMisskeyEmojis(state, emojis) {
      state.timeline.misskeyEmojis = emojis;
    },
  },
  actions: {
    async fetchAndStoreUsers({ commit, state }) {
      window.ipc.invoke("db:get-users").then((accounts) => {
        commit("setUsers", accounts);
        if (!state.timeline.user) {
          commit("setTimeline", { user: accounts[0] });
        }
      });
    },
    async fetchAndStoreAllMisskeyEmojis({ commit, state }, instanceUrl: string) {
      const data = await ipcInvoke("api", {
        method: "misskey:getEmojis",
        instanceUrl,
      });
      console.log(data);
      commit("setMisskeyEmojis", data.emojis);
    },
    async createMisskeyReaction({ state }, { postId, reaction }) {
      state.timeline.postList.find((post) => post.id === postId)!.myReaction = reaction;
      await ipcInvoke("api", {
        method: "misskey:createReaction",
        instanceUrl: state.timeline.instanceUrl,
        token: state.timeline.user?.token,
        noteId: postId,
        reaction,
      });
    },
    async deleteMisskeyReaction({ state }, { postId, reaction }) {
      state.timeline.postList.find((post) => post.id === postId)!.myReaction = undefined;
      await ipcInvoke("api", {
        method: "misskey:deleteReaction",
        instanceUrl: state.timeline.instanceUrl,
        token: state.timeline.user?.token,
        noteId: postId,
        reaction,
      });
    },
    async fetchMisskeyNoteReactions({ state }, { postId }) {
      const res = await ipcInvoke("api", {
        method: "misskey:getNoteReactions",
        instanceUrl: state.timeline.instanceUrl,
        token: state.timeline.user?.token,
        noteId: postId,
      });
    },
  },
});

export const key: InjectionKey<Store<State>> = Symbol();

export function useStore() {
  return baseUseStore(key);
}

export default store;
