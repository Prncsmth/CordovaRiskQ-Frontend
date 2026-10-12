import {
  assignedBarangayFor,
  assignmentLabel,
  incidentsOutsideBarangay,
  sortForBarangay,
} from "./responderAssignment";
import type { Incident } from "@/responder/types/responder";

describe("assignedBarangayFor", () => {
  it("returns the barangay for a BDRRMO responder", () => {
    expect(assignedBarangayFor({ unit: "BDRRMO", assignedBarangay: "Day-as" })).toEqual({
      id: "day-as",
      name: "Day-as",
    });
  });

  it("matches the name case-insensitively", () => {
    expect(assignedBarangayFor({ unit: "BDRRMO", assignedBarangay: "san miguel" })?.id).toBe(
      "san-miguel",
    );
  });

  it("is null for MDRRMO, who cover the whole municipality", () => {
    expect(assignedBarangayFor({ unit: "MDRRMO", assignedBarangay: "Day-as" })).toBeNull();
  });

  it("is null when nothing is assigned or the name is unknown", () => {
    expect(assignedBarangayFor({ unit: "BDRRMO", assignedBarangay: null })).toBeNull();
    expect(assignedBarangayFor({ unit: "BDRRMO", assignedBarangay: "Nowhere" })).toBeNull();
    expect(assignedBarangayFor(null)).toBeNull();
  });

  it("uses the barangay when the unit is unset", () => {
    expect(assignedBarangayFor({ unit: null, assignedBarangay: "Gabi" })?.id).toBe("gabi");
  });
});

describe("assignmentLabel", () => {
  it("describes each kind of assignment", () => {
    expect(assignmentLabel({ unit: "BDRRMO", assignedBarangay: "Day-as" })).toBe(
      "Assigned to Day-as · BDRRMO",
    );
    expect(assignmentLabel({ unit: null, assignedBarangay: "Gabi" })).toBe("Assigned to Gabi");
    expect(assignmentLabel({ unit: "MDRRMO", assignedBarangay: null })).toBe(
      "All of Cordova · MDRRMO",
    );
    expect(assignmentLabel({ unit: "BDRRMO", assignedBarangay: null })).toBe(
      "No barangay assigned yet",
    );
  });

  it("is null before the profile has loaded", () => {
    expect(assignmentLabel(null)).toBeNull();
  });
});

describe("incidentsOutsideBarangay", () => {
  // Day-as and Poblacion centers (constants/cordovaBarangays.ts).
  const dayAs = { latitude: 10.2554, longitude: 123.9355 };
  const poblacion = { latitude: 10.2525, longitude: 123.9502 };
  const incident = (id: string, categoryId: string, incidentCoords: typeof dayAs | null) =>
    ({ id, categoryId, incidentCoords }) as unknown as Incident;

  const incidents = [
    incident("1", "fire", dayAs),
    incident("2", "sos", poblacion),
    incident("3", "flood", poblacion),
    // No location: it can't be placed in any barangay, so it counts as outside.
    incident("4", "sos", null),
  ];

  it("counts everything not in the selected barangay, including unknown locations", () => {
    expect(incidentsOutsideBarangay(incidents, "day-as")).toEqual({ count: 3, sosCount: 2 });
  });

  it("hides nothing when no barangay is selected", () => {
    expect(incidentsOutsideBarangay(incidents, null)).toEqual({ count: 0, sosCount: 0 });
  });
});

describe("sortForBarangay", () => {
  const make = (id: string, categoryId: string, urgency: string, createdAt: string) =>
    ({ id, categoryId, urgency, createdAt }) as unknown as Incident;

  it("puts SOS first, then higher urgency, then the newest", () => {
    const sorted = sortForBarangay([
      make("old-low", "fire", "low", "2026-10-10T01:00:00Z"),
      make("new-high", "fire", "high", "2026-10-10T05:00:00Z"),
      make("old-high", "flood", "high", "2026-10-10T02:00:00Z"),
      make("sos-low", "sos", "low", "2026-10-10T00:00:00Z"),
    ]);
    expect(sorted.map((i) => i.id)).toEqual(["sos-low", "new-high", "old-high", "old-low"]);
  });

  it("doesn't change the list it was given", () => {
    const list = [make("a", "fire", "low", "2026-10-10T01:00:00Z"), make("b", "sos", "low", "2026-10-10T01:00:00Z")];
    sortForBarangay(list);
    expect(list.map((i) => i.id)).toEqual(["a", "b"]);
  });
});
