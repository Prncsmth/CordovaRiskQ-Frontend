import { selectNearestIncidents } from "./selectNearestIncidents";
import type { Incident } from "@/types/responder";

function makeIncident(overrides: Partial<Incident> & { id: string }): Incident {
  return {
    type: "Fire",
    location: "Test Location",
    urgency: "low",
    status: "pending",
    team: [],
    myStatus: "pending",
    ...overrides,
  };
}

describe("selectNearestIncidents", () => {
  it("returns the closest incidents first", () => {
    const incidents = [
      makeIncident({ id: "far", distanceKm: 5 }),
      makeIncident({ id: "near", distanceKm: 0.5 }),
      makeIncident({ id: "mid", distanceKm: 2 }),
    ];

    expect(selectNearestIncidents(incidents, 3).map((i) => i.id)).toEqual([
      "near",
      "mid",
      "far",
    ]);
  });

  it("caps the result at count", () => {
    const incidents = [
      makeIncident({ id: "a", distanceKm: 1 }),
      makeIncident({ id: "b", distanceKm: 2 }),
      makeIncident({ id: "c", distanceKm: 3 }),
    ];

    expect(selectNearestIncidents(incidents, 2).map((i) => i.id)).toEqual([
      "a",
      "b",
    ]);
  });

  it("excludes incidents with no known distance", () => {
    const incidents = [
      makeIncident({ id: "known", distanceKm: 1 }),
      makeIncident({ id: "unknown" }),
    ];

    expect(selectNearestIncidents(incidents, 3).map((i) => i.id)).toEqual([
      "known",
    ]);
  });

  it("returns an empty array when nothing has a known distance", () => {
    const incidents = [makeIncident({ id: "a" }), makeIncident({ id: "b" })];

    expect(selectNearestIncidents(incidents, 3)).toEqual([]);
  });
});
