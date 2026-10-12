import {
  RESPONDER_NOTIFICATION_TTL_MS,
  addIncomingNotification,
  visibleNotifications,
  withNotificationRead,
} from "./notifications";
import type { AppNotification } from "@/services/notification.service";

function makeNotification(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: "1",
    type: "announcement",
    title: "Title",
    body: "Body",
    read: false,
    referenceId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("addIncomingNotification", () => {
  it("prepends a new notification to the front of the list", () => {
    const existing = [makeNotification({ id: "old", createdAt: "2026-01-01T00:00:00.000Z" })];
    const incoming = makeNotification({ id: "new", createdAt: "2026-01-02T00:00:00.000Z" });

    const result = addIncomingNotification(existing, incoming);

    expect(result.map((n) => n.id)).toEqual(["new", "old"]);
  });

  it("does not duplicate a notification that's already in the list", () => {
    const existing = [makeNotification({ id: "dup" })];
    const incoming = makeNotification({ id: "dup" });

    const result = addIncomingNotification(existing, incoming);

    expect(result).toHaveLength(1);
    expect(result).toEqual(existing);
  });

  it("does not mutate the input array", () => {
    const existing = [makeNotification({ id: "old" })];
    const original = [...existing];

    addIncomingNotification(existing, makeNotification({ id: "new" }));

    expect(existing).toEqual(original);
  });
});

describe("visibleNotifications", () => {
  const now = new Date("2026-10-12T12:00:00.000Z").getTime();
  const fresh = makeNotification({ id: "fresh", createdAt: "2026-10-12T00:00:00.000Z" });
  const almost = makeNotification({
    id: "almost",
    createdAt: new Date(now - RESPONDER_NOTIFICATION_TTL_MS + 1000).toISOString(),
  });
  const expired = makeNotification({ id: "expired", createdAt: "2026-10-11T11:59:59.000Z", read: true });

  it("drops a responder's notifications once they are 24 hours old, read or not", () => {
    expect(visibleNotifications([fresh, almost, expired], "responder", now).map((n) => n.id)).toEqual([
      "fresh",
      "almost",
    ]);
  });

  it("leaves a citizen's list as it was", () => {
    expect(visibleNotifications([fresh, expired], "citizen", now)).toHaveLength(2);
    expect(visibleNotifications([fresh, expired], undefined, now)).toHaveLength(2);
  });
});

describe("withNotificationRead", () => {
  it("clears only that notification's unread state and keeps it in the list", () => {
    const list = [makeNotification({ id: "a" }), makeNotification({ id: "b" })];
    const next = withNotificationRead(list, "a");
    expect(next.map((n) => [n.id, n.read])).toEqual([
      ["a", true],
      ["b", false],
    ]);
    // Same createdAt, so its 24-hour expiry doesn't move.
    expect(next[0].createdAt).toBe(list[0].createdAt);
  });
});
