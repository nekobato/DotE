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

const { ipcInvoke, ipcSend, getPathForFile } = vi.hoisted(() => ({
  ipcInvoke: vi.fn(),
  ipcSend: vi.fn(),
  getPathForFile: vi.fn(),
}));
vi.mock("@/utils/ipc", () => ({ ipcInvoke, ipcSend, getPathForFile }));
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
let mounted = false;
const flush = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await nextTick();
};

beforeEach(() => {
  vi.stubGlobal(
    "FileReader",
    class {
      result: string | null = null;
      onload?: () => void;
      readAsDataURL(file: File) {
        void file.arrayBuffer().then((bytes) => {
          this.result = `data:${file.type};base64,${Buffer.from(bytes).toString("base64")}`;
          this.onload?.();
        });
      }
    },
  );
  getPathForFile.mockReset().mockReturnValue("/tmp/image.png");
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
  if (mounted) app?.unmount();
  mounted = false;
  vi.unstubAllGlobals();
});

async function mount(data: Record<string, unknown> = {}) {
  const payload = ref<InstanceType<typeof Composer>["$props"]["data"]>({
    timelineId: "timeline",
    userId: "user",
    ...data,
  });
  const root = node("root");
  app = renderer.createApp({ setup: () => () => h(Composer, { data: payload.value }) });
  app.provide(ssrContextKey, { modules: new Set() });
  app.mount(root);
  mounted = true;
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

const providerMethods = {
  misskey: {
    upload: "misskey:uploadFile",
    post: "misskey:createNote",
    uploaded: { id: "file" },
    posted: { createdNote: { id: "note" } },
  },
  mastodon: {
    upload: "mastodon:uploadMedia",
    post: "mastodon:postStatus",
    uploaded: { id: "media", url: "https://example.test/media" },
    posted: { id: "post" },
  },
  bluesky: {
    upload: "bluesky:uploadImage",
    post: "bluesky:createPost",
    uploaded: { blob: { ref: "blob", mimeType: "image/png", size: 5 } },
    posted: { uri: "at://did:plc:user/app.bsky.feed.post/new", cid: "cid" },
  },
};
const deferred = () => {
  let resolve!: (value: unknown) => void;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
function configureProvider(type: keyof typeof providerMethods) {
  const original = ipcInvoke.getMockImplementation()!;
  ipcInvoke.mockImplementation(async (event, payload) => {
    if (event === "db:get-users")
      return ["user", "other"].map((id, index) => ({
        ...account,
        id,
        instanceId: index + 1,
        token: id,
        blueskySession: { did: `did:plc:${id}` },
      }));
    if (event === "db:get-timeline-all")
      return [timeline, { ...timeline, id: "other-timeline", userId: "other", available: false }];
    if (event === "db:get-instance-all")
      return [1, 2].map((id) => ({ id, type, name: type, url: `https://${id}.example.test` }));
    if (event === "api" && payload.method === providerMethods[type].upload)
      return { ok: true, data: providerMethods[type].uploaded };
    if (event === "api" && payload.method === providerMethods[type].post)
      return { ok: true, data: providerMethods[type].posted };
    if (event === "api" && payload.method === "bluesky:getPosts")
      return {
        ok: true,
        data: {
          posts: [
            {
              uri: providerMethods.bluesky.posted.uri,
              cid: "cid",
              author: { did: "did:plc:user", handle: "user.test" },
              record: { text: "original" },
            },
          ],
        },
      };
    return original(event, payload);
  });
}
async function attach(composer: Awaited<ReturnType<typeof mount>>) {
  await composer
    .find((node) => node.props.class === "file-input")
    .props.onChange({ target: { files: [new File(["image"], "image.png", { type: "image/png" })], value: "" } });
}

describe("composer operation isolation", () => {
  it("reflects an already published Bluesky post after the normal post shell closes the composer", async () => {
    configureProvider("bluesky");
    const hydration = deferred(),
      original = ipcInvoke.getMockImplementation()!;
    ipcInvoke.mockImplementation((event, payload) =>
      event === "api" && payload.method === "bluesky:getPosts" ? hydration.promise : original(event, payload),
    );
    const composer = await mount();
    composer.body().props["onUpdate:modelValue"]("approved post");
    await nextTick();
    await composer.send();
    expect(ipcSend).toHaveBeenCalledWith("post:close");
    // The real post shell clears pagedata and unmounts create.vue on post:close.
    composer.payload.value = {};
    await flush();
    app.unmount();
    mounted = false;
    hydration.resolve({
      ok: true,
      data: {
        posts: [
          {
            uri: providerMethods.bluesky.posted.uri,
            cid: "cid",
            author: { did: "did:plc:user", handle: "user.test" },
            record: { text: "approved post" },
          },
        ],
      },
    });
    await flush();
    expect(ipcSend).toHaveBeenCalledWith(
      "timeline:add-post",
      expect.objectContaining({ userId: "user", timelineId: "timeline" }),
    );
  });
  it.each(["misskey", "mastodon", "bluesky"] as const)(
    "keeps the approved %s text and account immutable while uploading",
    async (type) => {
      configureProvider(type);
      const composer = await mount();
      await attach(composer);
      composer.body().props["onUpdate:modelValue"]("approved snapshot");
      await nextTick();
      const upload = deferred(),
        original = ipcInvoke.getMockImplementation()!;
      ipcInvoke.mockImplementation((event, payload) =>
        event === "api" && payload.method === providerMethods[type].upload ? upload.promise : original(event, payload),
      );
      const pending = composer.send();
      await flush();
      composer.body().props["onUpdate:modelValue"]("later edit");
      upload.resolve({ ok: true, data: providerMethods[type].uploaded });
      await pending;
      const request = apiCalls(providerMethods[type].post)[0];
      expect(request.text ?? request.status).toBe("approved snapshot");
      if (type === "bluesky") expect(request.did).toBe("did:plc:user");
      else expect(request).toMatchObject({ token: "user", instanceUrl: "https://1.example.test" });
      expect(ipcSend).toHaveBeenCalledWith("post:close");
    },
  );
  it.each(["misskey", "mastodon", "bluesky"] as const)(
    "cancels a delayed %s upload for both same-account and cross-account replacements",
    async (type) => {
      configureProvider(type);
      for (const crossAccount of [false, true]) {
        const composer = await mount();
        await attach(composer);
        composer.body().props["onUpdate:modelValue"]("original approved text");
        const upload = deferred();
        const original = ipcInvoke.getMockImplementation()!;
        ipcInvoke.mockImplementation((event, payload) =>
          event === "api" && payload.method === providerMethods[type].upload
            ? upload.promise
            : original(event, payload),
        );
        const before = apiCalls(providerMethods[type].post).length;
        const pending = composer.send();
        await flush();
        composer.payload.value = {
          userId: crossAccount ? "other" : "user",
          timelineId: crossAccount ? "other-timeline" : "timeline",
        };
        await flush();
        composer.body().props["onUpdate:modelValue"]("replacement private draft");
        upload.resolve({ ok: true, data: providerMethods[type].uploaded });
        await pending;
        expect(apiCalls(providerMethods[type].post)).toHaveLength(before);
        expect(composer.body().value).toBe("replacement private draft");
        expect(ipcSend).not.toHaveBeenCalledWith("post:close");
        app.unmount();
        mounted = false;
        ipcInvoke.mockImplementation(original);
      }
    },
  );

  it.each(["misskey", "mastodon", "bluesky"] as const)(
    "keeps a replacement draft intact after a delayed %s publication success or failure",
    async (type) => {
      configureProvider(type);
      const original = ipcInvoke.getMockImplementation()!;
      for (const ok of [true, false]) {
        const composer = await mount();
        composer.body().props["onUpdate:modelValue"]("approved original");
        await nextTick();
        const publication = deferred();
        ipcInvoke.mockImplementation((event, payload) =>
          event === "api" && payload.method === providerMethods[type].post
            ? publication.promise
            : original(event, payload),
        );
        const pending = composer.send();
        await flush();
        composer.payload.value = { timelineId: "other-timeline", userId: "other" };
        await flush();
        composer.body().props["onUpdate:modelValue"]("new private draft");
        publication.resolve(ok ? { ok: true, data: providerMethods[type].posted } : failure);
        await pending;
        expect(composer.body().value).toBe("new private draft");
        expect(ipcSend).not.toHaveBeenCalledWith("post:close");
        expect(ipcSend.mock.calls.some(([event]) => event === "timeline:add-post")).toBe(false);
        expect(composer.all().some((node) => node.text.includes("投稿に失敗"))).toBe(false);
        app.unmount();
        mounted = false;
        ipcInvoke.mockImplementation(original);
      }
    },
  );

  it("does not let an old completion clear a new submission's busy flag", async () => {
    configureProvider("mastodon");
    const original = ipcInvoke.getMockImplementation()!;
    const old = deferred(),
      current = deferred();
    let count = 0;
    ipcInvoke.mockImplementation((event, payload) =>
      event === "api" && payload.method === "mastodon:postStatus"
        ? ++count === 1
          ? old.promise
          : current.promise
        : original(event, payload),
    );
    const composer = await mount();
    composer.body().props["onUpdate:modelValue"]("old");
    await nextTick();
    const first = composer.send();
    await flush();
    composer.payload.value = { timelineId: "other-timeline", userId: "other" };
    await flush();
    composer.body().props["onUpdate:modelValue"]("new");
    await nextTick();
    const second = composer.send();
    await flush();
    old.resolve({ ok: true, data: { id: "old" } });
    await first;
    expect(composer.find((node) => node.props.class?.includes("post-action")).props.disabled).toBe(true);
    current.resolve({ ok: true, data: { id: "new" } });
    await second;
    expect(ipcSend.mock.calls.filter(([event]) => event === "post:close")).toHaveLength(1);
  });

  it("discards a delayed file read after replacement and unmounted upload responses", async () => {
    configureProvider("mastodon");
    getPathForFile.mockReturnValue("");
    const originalFileReader = globalThis.FileReader;
    let finishRead!: () => void;
    vi.stubGlobal(
      "FileReader",
      class {
        result = "data:image/png;base64,aW1hZ2U=";
        onload?: () => void;
        readAsDataURL() {
          finishRead = () => this.onload?.();
        }
      },
    );
    const composer = await mount();
    const reading = attach(composer);
    await nextTick();
    composer.payload.value = { userId: "other", timelineId: "other-timeline" };
    await flush();
    finishRead();
    await reading;
    expect(composer.all().some((node) => node.props.class === "attachment-item")).toBe(false);
    vi.stubGlobal("FileReader", originalFileReader);
    getPathForFile.mockReturnValue("/tmp/image.png");
    await attach(composer);
    const upload = deferred(),
      original = ipcInvoke.getMockImplementation()!;
    ipcInvoke.mockImplementation((event, payload) =>
      event === "api" && payload.method === "mastodon:uploadMedia" ? upload.promise : original(event, payload),
    );
    const pending = composer.send();
    await flush();
    app.unmount();
    mounted = false;
    upload.resolve({ ok: true, data: providerMethods.mastodon.uploaded });
    await pending;
    expect(apiCalls("mastodon:postStatus")).toHaveLength(0);
    expect(ipcSend).not.toHaveBeenCalledWith("post:close");
  });
});

describe("Mastodon composer", () => {
  it("waits for a selected native video's bytes before allowing Send", async () => {
    let finishRead!: () => void;
    vi.stubGlobal(
      "FileReader",
      class {
        result = "data:video/mp4;base64,dmlkZW8=";
        onload?: () => void;
        readAsDataURL() {
          finishRead = () => this.onload?.();
        }
      },
    );
    const composer = await mount();
    composer.body().props["onUpdate:modelValue"]("video post");
    await nextTick();
    const selection = composer
      .find((node) => node.props.class === "file-input")
      .props.onChange({ target: { files: [new File(["video"], "video.mp4", { type: "video/mp4" })], value: "" } });
    await composer.send();
    expect(apiCalls("mastodon:postStatus")).toHaveLength(0);
    expect(ipcSend).not.toHaveBeenCalledWith("post:close");
    finishRead();
    await selection;
    await composer.send();
    expect(apiCalls("mastodon:uploadMedia")[0]).toMatchObject({ fileDataBase64: "dmlkZW8=", fileType: "video/mp4" });
    expect(apiCalls("mastodon:postStatus")[0].mediaIds).toEqual(["media"]);
  });
  it.each(["selection", "paste"])("uploads only the %s File's bytes, ignoring a forged native path", async (source) => {
    const composer = await mount();
    const file = new File(["chosen-by-user"], "chosen.png", { type: "image/png" });
    Object.defineProperty(file, "path", { value: "/private/secret" });
    if (source === "selection") {
      await composer
        .find((node) => node.props.class === "file-input")
        .props.onChange({ target: { files: [file], value: "" } });
    } else {
      const preventDefault = vi.fn();
      await composer
        .find((node) => node.props.onPaste)
        .props.onPaste({ clipboardData: { files: [file], items: [] }, preventDefault });
      expect(preventDefault).toHaveBeenCalledOnce();
    }
    await composer.send();
    const request = apiCalls("mastodon:uploadMedia")[0];
    expect(request).toMatchObject({
      fileName: "chosen.png",
      fileType: "image/png",
      fileDataBase64: Buffer.from("chosen-by-user").toString("base64"),
    });
    expect(request).not.toHaveProperty("filePath");
  });
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
