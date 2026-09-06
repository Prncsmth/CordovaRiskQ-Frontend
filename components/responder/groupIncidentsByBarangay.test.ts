import {
  groupIncidentsByBarangay,
  sortIncidents,
  UNKNOWN_LOCATION_ID,
  UNKNOWN_LOCATION_NAME,
} from "./groupIncidentsByBarangay";
import type { Incident } from "@/types/responder";

// Exact coordinates of real entries in constants/cordovaBarangays.ts, so
// getNearestBarangay resolves them deterministically (distance to an
// identical point is always the minimum).
const BUAGSONG_COORDS = { latitude: 10.2507, longitude: 123.9403 };
const GABI_COORDS = { latitude: 10.2626, longitude: 123.9606 };
const POBLACION_COORDS = { latitude: 10.2525, longitude: 123.9502 };

function makeIncident(overrides: Partial<Incident> & { id: string }): Incident {
  return {
    type: "Test Incident",
    location: "Test Location",
    urgency: "low",
    status: "pending",
    maxResponders: 1,
    team: [],
    ...overrides,
  };
}

describe("sortIncidents", () => {
  it("sorts by urgency first, then by distance ascending with unknown distance last", () => {
    const incidents = [
      makeIncident({ id: "a", urgency: "low", distanceKm: 1 }),
      makeIncident({ id: "b", urgency: "high" }),
      makeIncident({ id: "c", urgency: "high", distanceKm: 3 }),
    ];

    const sorted = sortIncidents(incidents);

    expect(sorted.map((i) => i.id)).toEqual(["c", "b", "a"]);
  });
});

describe("groupIncidentsByBarangay", () => {
  it("returns an empty array for no incidents", () => {
    expect(groupIncidentsByBarangay([], {})).toEqual([]);
  });

  it("groups incidents by nearest barangay and sorts within a group", () => {
    const incidents = [
      makeIncident({ id: "a", urgency: "low", distanceKm: 2, incidentCoords: BUAGSONG_COORDS }),
      makeIncident({ id: "b", urgency: "high", distanceKm: 5, incidentCoords: BUAGSONG_COORDS }),
      makeIncident({ id: "c", urgency: "high", distanceKm: 1, incidentCoords: BUAGSONG_COORDS }),
    ];

    const groups = groupIncidentsByBarangay(incidents, {});

    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe("Buagsong");
    expect(groups[0].incidents.map((i) => i.id)).toEqual(["c", "b", "a"]);
  });

  it("prioritizes a barangay with a high-urgency incident over one with more incidents but no high urgency", () => {
    const incidents = [
      makeIncident({ id: "gabi-1", urgency: "medium", incidentCoords: GABI_COORDS }),
      makeIncident({ id: "gabi-2", urgency: "medium", incidentCoords: GABI_COORDS }),
      makeIncident({ id: "gabi-3", urgency: "low", incidentCoords: GABI_COORDS }),
      makeIncident({ id: "buagsong-1", urgency: "high", incidentCoords: BUAGSONG_COORDS }),
    ];

    const groups = groupIncidentsByBarangay(incidents, {});

    expect(groups.map((g) => g.name)).toEqual(["Buagsong", "Gabi"]);
  });

  it("breaks a tie in urgency by incident count", () => {
    const incidents = [
      makeIncident({ id: "gabi-1", urgency: "medium", incidentCoords: GABI_COORDS }),
      makeIncident({ id: "buagsong-1", urgency: "medium", incidentCoords: BUAGSONG_COORDS }),
      makeIncident({ id: "buagsong-2", urgency: "low", incidentCoords: BUAGSONG_COORDS }),
    ];

    const groups = groupIncidentsByBarangay(incidents, {});

    expect(groups.map((g) => g.name)).toEqual(["Buagsong", "Gabi"]);
  });

  it("breaks a tie in urgency and count by most recent first-seen activity", () => {
    const incidents = [
      makeIncident({ id: "gabi-1", urgency: "medium", incidentCoords: GABI_COORDS }),
      makeIncident({ id: "buagsong-1", urgency: "medium", incidentCoords: BUAGSONG_COORDS }),
    ];
    const firstSeenAt = { "gabi-1": 1000, "buagsong-1": 2000 };

    const groups = groupIncidentsByBarangay(incidents, firstSeenAt);

    expect(groups.map((g) => g.name)).toEqual(["Buagsong", "Gabi"]);
  });

  it("falls back to alphabetical order as the final tie-breaker", () => {
    const incidents = [
      makeIncident({ id: "gabi-1", urgency: "medium", incidentCoords: GABI_COORDS }),
      makeIncident({ id: "buagsong-1", urgency: "medium", incidentCoords: BUAGSONG_COORDS }),
    ];

    const groups = groupIncidentsByBarangay(incidents, {});

    expect(groups.map((g) => g.name)).toEqual(["Buagsong", "Gabi"]);
  });

  it("always sorts the Unknown Location bucket last, even with a high-urgency incident", () => {
    const incidents = [
      makeIncident({ id: "unknown-1", urgency: "high" }),
      makeIncident({ id: "poblacion-1", urgency: "low", incidentCoords: POBLACION_COORDS }),
    ];

    const groups = groupIncidentsByBarangay(incidents, {});

    expect(groups.map((g) => g.id)).toEqual(["poblacion", "unknown"]);
    expect(groups[1].name).toBe(UNKNOWN_LOCATION_NAME);
    expect(groups[1].id).toBe(UNKNOWN_LOCATION_ID);
  });
});
