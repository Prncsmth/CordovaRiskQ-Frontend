import { applyEvacuationCenterUpdate } from "./evacuationCenters";
import type { EvacuationCenter } from "@/services/evacuation.service";

function makeCenter(overrides: Partial<EvacuationCenter> = {}): EvacuationCenter {
  return {
    id: "center-1",
    name: "Test Center",
    address: "Somewhere",
    category: "evacuation_center",
    distanceKm: 1.2,
    status: "open",
    facilities: ["Water"],
    latitude: 10.25,
    longitude: 123.95,
    ...overrides,
  };
}

describe("applyEvacuationCenterUpdate", () => {
  it("updates only status and facilities on the matching center", () => {
    const list = [makeCenter({ id: "center-1", distanceKm: 3.4 })];

    const result = applyEvacuationCenterUpdate(list, {
      id: "center-1",
      status: "full",
      facilities: ["Water", "Medical Aid"],
    });

    expect(result[0]).toEqual(
      makeCenter({ id: "center-1", distanceKm: 3.4, status: "full", facilities: ["Water", "Medical Aid"] }),
    );
  });

  it("leaves other centers in the list untouched", () => {
    const other = makeCenter({ id: "center-2", name: "Other" });
    const list = [makeCenter({ id: "center-1" }), other];

    const result = applyEvacuationCenterUpdate(list, {
      id: "center-1",
      status: "full",
      facilities: [],
    });

    expect(result[1]).toEqual(other);
  });

  it("returns the list unchanged if the id isn't found", () => {
    const list = [makeCenter({ id: "center-1" })];

    const result = applyEvacuationCenterUpdate(list, {
      id: "unknown",
      status: "full",
      facilities: [],
    });

    expect(result).toEqual(list);
  });

  it("does not mutate the input array", () => {
    const list = [makeCenter({ id: "center-1" })];
    const original = JSON.parse(JSON.stringify(list));

    applyEvacuationCenterUpdate(list, { id: "center-1", status: "full", facilities: [] });

    expect(list).toEqual(original);
  });
});
