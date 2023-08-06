import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "element-plus/dist/index.css";
import "./styles/index.scss";
import { createPinia } from "pinia";

if (!window.ipc) {
  window.ipc = {
    send: () => {},
    invoke: async (event: string, payload?: any) => {},
    on: () => {},
  };
}

const pinia = createPinia();
const app = createApp(App);

app.use(router);
app.use(pinia);
app.mount("#app").$nextTick(window.removeLoading);
