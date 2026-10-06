import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { compile, createRenderer, h, nextTick, ref, ssrContextKey, type App } from "vue";
import { compileScript, parse } from "vue/compiler-sfc";
import Composer from "./create.vue";

// The Node test configuration compiles SFCs for SSR; use the same template for the host renderer.
const { descriptor } = parse(readFileSync(new URL("./create.vue", import.meta.url), "utf8"));
Composer.render = compile(descriptor.template!.content, {
  prefixIdentifiers: true,
  hoistStatic: false,
  bindingMetadata: compileScript(descriptor, { id: "composer-test" }).bindings,
});

const { ipcInvoke, ipcSend } = vi.hoisted(() => ({ ipcInvoke: vi.fn(), ipcSend: vi.fn() }));
vi.mock("@/utils/ipc", () => ({ ipcInvoke, ipcSend, getPathForFile: () => "/tmp/image.png" }));
vi.mock("@/components/PostItem/BlueskyPost.vue", () => ({ default: { render: () => null } }));
vi.mock("@/components/PostItem/MastodonToot.vue", () => ({ default: { render: () => null } }));
vi.mock("@/components/PostItem/MisskeyNote.vue", () => ({ default: { render: () => null } }));
vi.mock("@/components/EmojiPicker.vue", () => ({ default: { render: () => null } }));
vi.mock("@iconify/vue", () => ({ Icon: { render: () => null } }));
vi.mock("element-plus", async () => {
  const { h } = await import("vue");
  return {
    ElAvatar: { render: () => null },
    ElInput: {
      props: ["modelValue"],
      emits: ["update:modelValue"],
      setup(props: { modelValue: string }, { attrs, emit }: any) {
        return () =>
          h("textarea", {
            ...attrs,
            value: props.modelValue,
            "onUpdate:modelValue": (value: string) => emit("update:modelValue", value),
          });
      },
    },
  };
});
vi.mock("@/components/common/DoteButton.vue", async () => {
  const { h } = await import("vue");
  return {
    default: {
      inheritAttrs: false,
      setup:
        (_: unknown, { attrs, slots }: any) =>
        () =>
          h("button", attrs, slots.default?.()),
    },
  };
});

// Vue's host renderer exercises the real composer without adding a DOM dependency.
type HostNode = {
  tagName: string;
  props: Record<string, any>;
  children: HostNode[];
  parent: HostNode | null;
  text: string;
  value: unknown;
  options: HostNode[];
  addEventListener: () => void;
  focus: () => void;
  getRootNode: () => Document;
};
const node = (tagName: string): HostNode => ({
  tagName: tagName.toUpperCase(),
  props: {},
  children: [],
  parent: null,
  text: "",
  value: "",
  get options() {
    return this.children.filter((child) => child.tagName === "OPTION");
  },
  addEventListener() {},
  focus: vi.fn(),
  getRootNode: () => document,
});
const renderer = createRenderer<HostNode, HostNode>({
  createElement: node,
  createText: (text) => Object.assign(node("text"), { text }),
  createComment: () => node("comment"),
  setText: (node, text) => {
    node.text = text;
  },
  setElementText: (node, text) => {
    node.text = text;
    node.children = [];
  },
  patchProp: (node, key, _previous, value) => {
    node.props[key] = value;
    if (key === "value") node.value = value;
  },
  insert(node, parent, anchor) {
    if (node.parent) node.parent.children.splice(node.parent.children.indexOf(node), 1);
    node.parent = parent;
    const index = anchor ? parent.children.indexOf(anchor) : -1;
    parent.children.splice(index < 0 ? parent.children.length : index, 0, node);
  },
  remove(node) {
    node.parent?.children.splice(node.parent.children.indexOf(node), 1);
    node.parent = null;
  },
  parentNode: (node) => node.parent,
  nextSibling: (node) => node.parent?.children[node.parent.children.indexOf(node) + 1] ?? null,
});

const account = { id: "user", name: "QA", instanceId: 1, token: "test" };
const timeline = { id: "timeline", userId: "user", available: true };
const failure = { ok: false, error: { type: "network", message: "offline" } };
let app: App;
const flush = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
};

beforeEach(() => {
  vi.stubGlobal("Document", EventTarget);
  vi.stubGlobal("document", new EventTarget());
  vi.stubGlobal(
    "Image",
    class {
      naturalWidth = 1;
      naturalHeight = 1;
      onload?: () => void;
      set src(_value: string) {
        this.onload?.();
      }
    },
  );
  ipcSend.mockReset();
  ipcInvoke.mockReset().mockImplementation(async (event, payload) => {
    if (event === "db:get-users") return [account];
    if (event === "db:get-timeline-all") return [timeline];
    if (event === "db:get-instance-all")
      return [{ id: 1, type: "mastodon", name: "Mastodon", url: "https://mastodon.example" }];
    if (event === "settings:all") return { font: {} };
    if (event === "api" && payload.method === "mastodon:uploadMedia")
      return { ok: true, data: { id: "media", url: "https://mastodon.example/image.png" } };
    if (event === "api") return { ok: true, data: { id: "post" } };
  });
});
afterEach(() => {
  app?.unmount();
  vi.unstubAllGlobals();
});

async function mount(data: Record<string, unknown> = {}) {
  const payload = ref({ timelineId: "timeline", userId: "user", ...data });
  const root = node("root");
  app = renderer.createApp({ setup: () => () => h(Composer, { data: payload.value }) });
  app.provide(ssrContextKey, { modules: new Set() });
  app.mount(root);
  await flush();
  const all = (current = root): HostNode[] => [current, ...current.children.flatMap((child) => all(child))];
  const find = (predicate: (node: HostNode) => boolean) => {
    const found = all().find(predicate);
    if (!found) throw new Error("Composer control not found");
    return found;
  };
  const field = (name: string) => find((node) => node.props.name === name);
  const body = () => find((node) => node.tagName === "TEXTAREA");
  const optionsButton = all().find((node) => node.props["aria-controls"] === "mastodon-post-options");
  if (optionsButton) {
    optionsButton.props.onClick();
    await nextTick();
  }
  const send = async () => {
    await find((node) => node.props.class?.includes("post-action")).props.onClick();
    await flush();
  };
  return { payload, all, find, field, body, send };
}
const apiCalls = (method: string) =>
  ipcInvoke.mock.calls
    .filter(([event, payload]) => event === "api" && payload.method === method)
    .map(([, payload]) => payload);

describe("Mastodon composer", () => {
  it("sends the selected options and normalizes the language while retaining the reply target", async () => {
    const composer = await mount({ mode: "reply", replyToId: "parent" });
    composer.body().props["onUpdate:modelValue"]("本文");
    composer.field("visibility").props["onUpdate:modelValue"]("private");
    composer.field("spoilerText").props["onUpdate:modelValue"]("警告");
    composer.field("sensitive").props["onUpdate:modelValue"](true);
    composer.field("language").props["onUpdate:modelValue"]("EN");
    await nextTick();
    await composer.send();
    expect(apiCalls("mastodon:postStatus")[0]).toMatchObject({
      status: "本文",
      inReplyToId: "parent",
      visibility: "private",
      spoilerText: "警告",
      sensitive: true,
      language: "en",
    });
    expect(ipcSend).toHaveBeenCalledWith("post:close");
  });

  it("omits optional server defaults and resets options for a new payload", async () => {
    const composer = await mount();
    composer.field("visibility").props["onUpdate:modelValue"]("direct");
    composer.field("spoilerText").props["onUpdate:modelValue"]("古い警告");
    composer.field("sensitive").props["onUpdate:modelValue"](true);
    composer.field("language").props["onUpdate:modelValue"]("ja");
    composer.payload.value = { ...composer.payload.value };
    await flush();
    composer.body().props["onUpdate:modelValue"]("新しい投稿");
    await nextTick();
    await composer.send();
    const payload = apiCalls("mastodon:postStatus")[0];
    expect(payload).toMatchObject({ status: "新しい投稿", spoilerText: "", sensitive: false });
    expect(payload).not.toHaveProperty("visibility");
    expect(payload).not.toHaveProperty("language");
  });

  it("blocks an invalid language and focuses its field without uploading or publishing", async () => {
    const composer = await mount();
    composer.body().props["onUpdate:modelValue"]("本文");
    composer.field("language").props["onUpdate:modelValue"]("j");
    await nextTick();
    composer.find((node) => node.props["aria-controls"] === "mastodon-post-options").props.onClick();
    await nextTick();
    await composer.send();
    expect(apiCalls("mastodon:postStatus")).toHaveLength(0);
    expect(composer.field("language").focus).toHaveBeenCalledOnce();
    expect(composer.field("language").props["aria-invalid"]).toBe(true);
  });

  it("keeps boost mode independent of composer options", async () => {
    const composer = await mount({ mode: "boost", post: { id: "original", account: {}, media_attachments: [] } });
    expect(composer.all().some((node) => node.props.class === "mastodon-options")).toBe(false);
    await composer.send();
    expect(apiCalls("mastodon:reblog")[0]).toMatchObject({ id: "original" });
    expect(apiCalls("mastodon:postStatus")).toHaveLength(0);
  });

  it("updates edited or cleared alt text after a failed post, and blocks posting if the update fails", async () => {
    const original = ipcInvoke.getMockImplementation()!;
    let failDescription = false;
    ipcInvoke.mockImplementation(async (event, payload) => {
      if (event === "api" && payload.method === "mastodon:postStatus") return failure;
      if (event === "api" && payload.method === "mastodon:updateMedia" && failDescription) return failure;
      return original(event, payload);
    });
    const composer = await mount();
    const file = new File(["image"], "image.png", { type: "image/png" });
    await composer
      .find((node) => node.props.class === "file-input")
      .props.onChange({ target: { files: [file], value: "" } });
    await nextTick();
    const alt = () => composer.find((node) => node.props.class === "nn-text-field attachment-alt-input");
    alt().props["onUpdate:modelValue"]("最初の説明");
    await nextTick();
    await composer.send();
    expect(apiCalls("mastodon:uploadMedia")[0].description).toBe("最初の説明");
    expect(apiCalls("mastodon:updateMedia")).toHaveLength(0);
    expect(ipcSend).not.toHaveBeenCalledWith("post:close");

    alt().props["onUpdate:modelValue"]("変更した説明");
    await composer.send();
    expect(apiCalls("mastodon:updateMedia")[0].description).toBe("変更した説明");
    alt().props["onUpdate:modelValue"]("");
    failDescription = true;
    await composer.send();
    expect(apiCalls("mastodon:updateMedia")[1].description).toBe("");
    expect(apiCalls("mastodon:postStatus")).toHaveLength(2);
    expect(apiCalls("mastodon:uploadMedia")).toHaveLength(1);
    expect(composer.all().some((node) => node.text.includes("説明を保存できませんでした"))).toBe(true);

    failDescription = false;
    await composer.send();
    expect(apiCalls("mastodon:updateMedia")[2].description).toBe("");
    expect(apiCalls("mastodon:postStatus")).toHaveLength(3);
    expect(apiCalls("mastodon:uploadMedia")).toHaveLength(1);
  });
});
