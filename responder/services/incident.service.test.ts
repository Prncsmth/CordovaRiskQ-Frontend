import { toCompletedIncident, toIncident } from "./incident.service";

describe("toIncident", () => {
  it("maps the roster into team and myStatus", () => {
    const incident = toIncident({
      id: "inc-1",
      category: "fire",
      locationLabel: "Near the market",
      latitude: 10.25,
      longitude: 123.95,
      urgency: "high",
      status: "on_the_way",
      responders: [
        { id: "r1", name: "Alice", status: "on_the_way" },
        { id: "r2", name: "Bob", status: "joined" },
      ],
      myStatus: "on_the_way",
      createdAt: "2026-01-01T12:00:00.000Z",
      updatedAt: "2026-01-01T12:00:00.000Z",
    });

    expect(incident.team).toEqual([
      { id: "r1", name: "Alice", status: "on_the_way" },
      { id: "r2", name: "Bob", status: "joined" },
    ]);
    expect(incident.myStatus).toBe("on_the_way");
    expect(incident.createdAt).toBe("2026-01-01T12:00:00.000Z");
  });

  it("defaults team to an empty array and myStatus to pending when the backend omits them", () => {
    const incident = toIncident({
      id: "inc-2",
      category: "flood",
      locationLabel: "Riverside",
      latitude: null,
      longitude: null,
      urgency: "medium",
      status: "pending",
      createdAt: "2026-01-01T12:00:00.000Z",
      updatedAt: "2026-01-01T12:00:00.000Z",
    });

    expect(incident.team).toEqual([]);
    expect(incident.myStatus).toBe("pending");
  });
});

describe("toCompletedIncident", () => {
  it("maps an API row into a completed-incident history item", () => {
    const item = toCompletedIncident({
      id: "inc-3",
      category: "fire",
      locationLabel: "Near the market",
      latitude: 10.25,
      longitude: 123.95,
      urgency: "high",
      status: "completed",
      createdAt: "2026-01-01T12:00:00.000Z",
      updatedAt: "2026-01-03T09:30:00.000Z",
    });

    expect(item).toEqual({
      id: "inc-3",
      type: "Fire",
      location: "Near the market",
      completedDate: new Date("2026-01-03T09:30:00.000Z").toLocaleDateString(),
      ref: "INC-3",
    });
  });

  it("falls back to the raw category when it's not in CATEGORY_LABELS", () => {
    const item = toCompletedIncident({
      id: "inc-4",
      category: "unmapped-category",
      locationLabel: "Riverside",
      latitude: null,
      longitude: null,
      urgency: "low",
      status: "completed",
      createdAt: "2026-01-01T12:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });

    expect(item.type).toBe("unmapped-category");
  });
});
