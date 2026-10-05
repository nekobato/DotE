import { afterEach, describe, expect, it, vi } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import { createPinia, setActivePinia } from "pinia";
import type { MisskeyNote } from "@shared/types/misskey";
import type { InstanceStore } from "@shared/types/store";
import { useStore } from "@/store";
import MisskeyPoll from "./MisskeyPoll.vue";

afterEach(() => vi.useRealTimers());
async function render({ multiple = false, voted = false, expiresAt = null as string | null, canVote = true } = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const root = useStore();
  root.users = [{ id: "account", instanceId: "instance", name: "fixture", token: "fixture", avatarUrl: "" }];
  root.instances = [
    { id: "instance", type: "misskey", url: "https://misskey.example", name: "Misskey" },
  ] as InstanceStore[];
  root.timelines = [
    {
      id: "home",
      userId: "account",
      channel: "misskey:homeTimeline",
      available: true,
      options: {},
      updateInterval: 60_000,
      posts: [],
      notifications: [],
      pendingNewPosts: [],
      readmoreLocked: false,
    },
  ];
  const note = {
    id: "poll",
    poll: {
      multiple,
      expiresAt,
      choices: [
        { text: "紅茶🌸", votes: 3, isVoted: voted },
        { text: "コーヒー", votes: 1, isVoted: false },
      ],
    },
  } as MisskeyNote;
  return renderToString(
    createSSRApp(MisskeyPoll, { note, canVote, currentInstanceUrl: "https://misskey.example" }).use(pinia),
  );
}
const disabledCount = (html: string) => html.match(/<button\b[^>]*\bdisabled/g)?.length ?? 0;

describe("Misskey poll display", () => {
  it("shows choices, counts, mode and an accessible vote label", async () => {
    const html = await render();
    expect(html).toContain('aria-label="紅茶🌸・3票"');
    expect(html).toContain("1つの選択肢に投票");
    expect(html).toContain("計4票");
    expect(html).toContain("未投票");
    expect(html).toContain("締切なし");
    expect(disabledCount(html)).toBe(0);
  });
  it("marks the selected choice and disables a completed single-choice poll", async () => {
    const html = await render({ voted: true });
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("✓ 投票済み");
    expect(disabledCount(html)).toBe(2);
  });
  it("keeps the remaining choices available for multiple selection", async () => {
    const html = await render({ multiple: true, voted: true });
    expect(html).toContain("複数選択可・選択肢ごとに投票");
    expect(disabledCount(html)).toBe(1);
  });
  it("displays results and disables voting at expiry", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-05T12:00:00Z"));
    const html = await render({ expiresAt: "2026-10-05T12:00:00Z" });
    expect(html).toContain("投票は終了しました");
    expect(html).toContain('datetime="2026-10-05T12:00:00Z"');
    expect(disabledCount(html)).toBe(2);
  });
  it("never offers voting in a composer preview", async () => {
    expect(disabledCount(await render({ canVote: false }))).toBe(2);
  });
});
