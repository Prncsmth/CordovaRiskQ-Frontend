import { addIncomingNotification } from "./notifications";
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
