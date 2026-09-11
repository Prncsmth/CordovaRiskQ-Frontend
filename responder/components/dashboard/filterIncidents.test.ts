import { filterIncidents, type IncidentFilters } from "./filterIncidents";
import type { Incident } from "@/responder/types/responder";

// Exact coordinates of real entries in constants/cordovaBarangays.ts, so
// getNearestBarangay resolves them deterministically (distance to an
// identical point is always the minimum).
const BUAGSONG_COORDS = { latitude: 10.2507, longitude: 123.9403 };
const GABI_COORDS = { latitude: 10.2626, longitude: 123.9606 };

function makeIncident(overrides: Partial<Incident> & { id: string }): Incident {
  return {
    type: "Fire",
    location: "Test Location",
    urgency: "low",
    status: "pending",
    team: [],
    myStatus: "pending",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function noFilters(): IncidentFilters {
  return { search: "", urgencies: new Set(), types: new Set(), barangayIds: new Set() };
}

describe("filterIncidents", () => {
  it("returns every incident when no filters are active", () => {
    const incidents = [
      makeIncident({ id: "a" }),
      makeIncident({ id: "b" }),
    ];

    expect(filterIncidents(incidents, noFilters())).toEqual(incidents);
  });

  it("matches search text against the incident type", () => {
    const incidents = [
      makeIncident({ id: "a", type: "Fire" }),
      makeIncident({ id: "b", type: "Flood" }),
    ];

    const result = filterIncidents(incidents, { ...noFilters(), search: "fire" });

    expect(result.map((i) => i.id)).toEqual(["a"]);
  });

  it("matches search text against the incident location, case-insensitively", () => {
    const incidents = [
      makeIncident({ id: "a", location: "Near Cordova Public Market" }),
      makeIncident({ id: "b", location: "Sabang Pier" }),
    ];

    const result = filterIncidents(incidents, { ...noFilters(), search: "MARKET" });

    expect(result.map((i) => i.id)).toEqual(["a"]);
  });

  it("matches search text against the incident's derived barangay name", () => {
    const incidents = [
      makeIncident({ id: "a", incidentCoords: BUAGSONG_COORDS }),
      makeIncident({ id: "b", incidentCoords: GABI_COORDS }),
    ];

    const result = filterIncidents(incidents, { ...noFilters(), search: "buagsong" });

    expect(result.map((i) => i.id)).toEqual(["a"]);
  });

  it("treats an incident with no coordinates as Unknown Location for search", () => {
    const incidents = [makeIncident({ id: "a" })];

    const result = filterIncidents(incidents, { ...noFilters(), search: "unknown location" });

    expect(result.map((i) => i.id)).toEqual(["a"]);
  });

  it("ORs multiple selected urgencies within the urgency filter", () => {
    const incidents = [
      makeIncident({ id: "a", urgency: "high" }),
      makeIncident({ id: "b", urgency: "medium" }),
      makeIncident({ id: "c", urgency: "low" }),
    ];

    const result = filterIncidents(incidents, {
      ...noFilters(),
      urgencies: new Set(["high", "low"]),
    });

    expect(result.map((i) => i.id)).toEqual(["a", "c"]);
  });

  it("ORs multiple selected types within the type filter", () => {
    const incidents = [
      makeIncident({ id: "a", type: "Fire" }),
      makeIncident({ id: "b", type: "Flood" }),
      makeIncident({ id: "c", type: "SOS Alert" }),
    ];

    const result = filterIncidents(incidents, {
      ...noFilters(),
      types: new Set(["Fire", "SOS Alert"]),
    });

    expect(result.map((i) => i.id)).toEqual(["a", "c"]);
  });

  it("ORs multiple selected barangays within the barangay filter", () => {
    const incidents = [
      makeIncident({ id: "a", incidentCoords: BUAGSONG_COORDS }),
      makeIncident({ id: "b", incidentCoords: GABI_COORDS }),
      makeIncident({ id: "c" }),
    ];

    const result = filterIncidents(incidents, {
      ...noFilters(),
      barangayIds: new Set(["buagsong", "unknown"]),
    });

    expect(result.map((i) => i.id)).toEqual(["a", "c"]);
  });

  it("ANDs across urgency, type, barangay, and search filters", () => {
    const incidents = [
      // matches every filter
      makeIncident({ id: "a", type: "Fire", urgency: "high", incidentCoords: BUAGSONG_COORDS }),
      // wrong urgency
      makeIncident({ id: "b", type: "Fire", urgency: "low", incidentCoords: BUAGSONG_COORDS }),
      // wrong barangay
      makeIncident({ id: "c", type: "Fire", urgency: "high", incidentCoords: GABI_COORDS }),
    ];

    const result = filterIncidents(incidents, {
      search: "fire",
      urgencies: new Set(["high"]),
      types: new Set(["Fire"]),
      barangayIds: new Set(["buagsong"]),
    });

    expect(result.map((i) => i.id)).toEqual(["a"]);
  });
});
