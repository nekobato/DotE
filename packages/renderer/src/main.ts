import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import store, { key } from "./store";
import "element-plus/dist/index.css";
import "./styles/index.scss";
import { createPinia } from "pinia";

const app = createApp(App);
const pinia = createPinia();

app.use(router);
app.use(store, key);
app.use(pinia);
app.mount("#app").$nextTick(window.removeLoading);
