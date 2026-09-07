import { toIncident } from "./incident.service";

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
    });

    expect(incident.team).toEqual([
      { id: "r1", name: "Alice", status: "on_the_way" },
      { id: "r2", name: "Bob", status: "joined" },
    ]);
    expect(incident.myStatus).toBe("on_the_way");
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
    });

    expect(incident.team).toEqual([]);
    expect(incident.myStatus).toBe("pending");
  });
});
