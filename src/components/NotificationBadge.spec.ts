import { describe, expect, it } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import NotificationBadge from "./NotificationBadge.vue";

describe("notification badge rendered by the timeline header", () => {
  it("hides zero unread notifications", async () => {
    const html = await renderToString(createSSRApp(NotificationBadge, { count: 0 }));
    expect(html).not.toContain("notification-badge");
  });
  it.each([
    [1, "1"],
    [99, "99"],
    [100, "99+"],
    [120, "99+"],
  ] as const)("renders %i unread notifications", async (count, label) => {
    const html = await renderToString(createSSRApp(NotificationBadge, { count }));
    expect(html).toContain(`aria-label="未読通知 ${count} 件"`);
    expect(html).toContain(`>${label}</span>`);
  });
});
