import { mergeIncidentUpdate } from "./mergeIncidentUpdate";
import type { Incident } from "@/types/responder";

const baseIncident: Incident = {
  id: "inc-1",
  type: "Fire",
  location: "Near the market",
  urgency: "high",
  status: "lobby",
  team: [{ id: "r1", name: "Alice", status: "joined" }],
  myStatus: "on_the_way",
  distanceKm: 2.4,
};

describe("mergeIncidentUpdate", () => {
  it("merges status and team from the update, preserving myStatus and distanceKm", () => {
    const merged = mergeIncidentUpdate(baseIncident, {
      id: "inc-1",
      status: "on_the_way",
      responders: [
        { id: "r1", name: "Alice", status: "on_the_way" },
        { id: "r2", name: "Bob", status: "joined" },
      ],
      respondersCount: 2,
      acceptedByResponderId: "r1",
      updatedAt: "2026-09-08T00:00:00.000Z",
    });

    expect(merged.status).toBe("on_the_way");
    expect(merged.team).toEqual([
      { id: "r1", name: "Alice", status: "on_the_way" },
      { id: "r2", name: "Bob", status: "joined" },
    ]);
    expect(merged.myStatus).toBe("on_the_way");
    expect(merged.distanceKm).toBe(2.4);
  });

  it("ignores an update for a different incident id", () => {
    const merged = mergeIncidentUpdate(baseIncident, {
      id: "inc-2",
      status: "arrived",
      responders: [],
      respondersCount: 0,
      acceptedByResponderId: null,
      updatedAt: "2026-09-08T00:00:00.000Z",
    });

    expect(merged).toBe(baseIncident);
  });
});
