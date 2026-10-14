import type { Route } from "@/services/directions.service";

import {
  INITIAL_ROUTES_STATE,
  applyRouteResponse,
  isRoutableCoordinate,
  routeTargetKey,
  sameDestination,
  type RoutesState,
} from "./routeRequests";

const DEST = { latitude: 10.26, longitude: 123.95 };
const OTHER_DEST = { latitude: 10.3, longitude: 123.9 };

function route(label: number): Route {
  return {
    coordinates: [
      { latitude: 10.25, longitude: 123.94 + label / 1000 },
      DEST,
    ],
    distanceKm: label,
    durationMin: label,
  };
}

describe("routeTargetKey", () => {
  it("is the same for the same destination and travel mode", () => {
    expect(routeTargetKey(DEST, "walking")).toBe(routeTargetKey({ ...DEST }, "walking"));
  });

  it("changes with the destination or the travel mode", () => {
    expect(routeTargetKey(DEST, "walking")).not.toBe(routeTargetKey(OTHER_DEST, "walking"));
    expect(routeTargetKey(DEST, "walking")).not.toBe(routeTargetKey(DEST, "driving"));
  });
});

describe("sameDestination", () => {
  it("is true for the same place by another travel mode", () => {
    expect(sameDestination(routeTargetKey(DEST, "walking"), routeTargetKey(DEST, "driving"))).toBe(true);
  });

  it("is false for a different place", () => {
    expect(sameDestination(routeTargetKey(DEST, "walking"), routeTargetKey(OTHER_DEST, "walking"))).toBe(false);
  });
});

describe("applyRouteResponse", () => {
  const target = routeTargetKey(DEST, "walking");

  it("shows the first route for a destination", () => {
    const next = applyRouteResponse(INITIAL_ROUTES_STATE, { seq: 1, targetKey: target, routes: [route(1)] }, 1);
    expect(next).toEqual({ targetKey: target, routes: [route(1)], status: "ok" });
  });

  it("replaces the route with the recalculated one from a newer origin", () => {
    const first = applyRouteResponse(INITIAL_ROUTES_STATE, { seq: 1, targetKey: target, routes: [route(1)] }, 1);
    const next = applyRouteResponse(first, { seq: 2, targetKey: target, routes: [route(2)] }, 2);
    expect(next.routes).toEqual([route(2)]);
  });

  it("drops an older response that arrives after a newer request was made", () => {
    const current: RoutesState = { targetKey: target, routes: [route(3)], status: "ok" };
    // Request 2's answer lands while request 3 is already the latest.
    expect(applyRouteResponse(current, { seq: 2, targetKey: target, routes: [route(2)] }, 3)).toBe(current);
  });

  it("keeps the last good route when a recalculation fails, and marks it failed", () => {
    const current: RoutesState = { targetKey: target, routes: [route(1)], status: "ok" };
    const next = applyRouteResponse(current, { seq: 2, targetKey: target, routes: [] }, 2);
    expect(next.routes).toEqual([route(1)]);
    expect(next.status).toBe("failed");
  });

  it("never keeps a route for a different destination or mode after a failure", () => {
    const current: RoutesState = { targetKey: target, routes: [route(1)], status: "ok" };
    const otherTarget = routeTargetKey(OTHER_DEST, "walking");
    const next = applyRouteResponse(current, { seq: 2, targetKey: otherTarget, routes: [] }, 2);
    expect(next).toEqual({ targetKey: otherTarget, routes: [], status: "failed" });
  });

  it("a successful route for a new destination replaces the old destination's route", () => {
    const current: RoutesState = { targetKey: target, routes: [route(1)], status: "ok" };
    const otherTarget = routeTargetKey(OTHER_DEST, "driving");
    const next = applyRouteResponse(current, { seq: 2, targetKey: otherTarget, routes: [route(9)] }, 2);
    expect(next).toEqual({ targetKey: otherTarget, routes: [route(9)], status: "ok" });
  });

  it("recovers to ok after a failure once a recalculation succeeds", () => {
    const failed: RoutesState = { targetKey: target, routes: [route(1)], status: "failed" };
    expect(applyRouteResponse(failed, { seq: 3, targetKey: target, routes: [route(3)] }, 3).status).toBe("ok");
  });
});

describe("isRoutableCoordinate", () => {
  it("accepts a real position", () => {
    expect(isRoutableCoordinate({ latitude: 10.25, longitude: 123.95 })).toBe(true);
  });

  it.each([
    ["undefined", undefined],
    ["NaN", { latitude: Number.NaN, longitude: 123.95 }],
    ["out of range", { latitude: 95, longitude: 123.95 }],
    ["0,0", { latitude: 0, longitude: 0 }],
  ])("rejects %s so no route is requested from it", (_label, coords) => {
    expect(isRoutableCoordinate(coords)).toBe(false);
  });
});
