import {
  CHECK_IN_INTERVAL_MS,
  UPLOAD_INTERVAL_MS,
  easeInOutCubic,
  interpolateCoordinate,
  routeOriginDecision,
  movementThresholdMeters,
  uploadDecision,
} from "./liveTracking";

const METER_LAT = 1 / 111_195;
const BASE = { latitude: 10.25, longitude: 123.95 };
const north = (meters: number) => ({ latitude: BASE.latitude + meters * METER_LAT, longitude: BASE.longitude });

describe("uploadDecision", () => {
  it("always sends the first fix", () => {
    expect(uploadDecision(null, 0, BASE, 1000)).toBe("move");
  });

  it("sends once the responder has moved 2 m (a few steps)", () => {
    expect(uploadDecision(BASE, 0, north(2.5), 2000)).toBe("move");
  });

  it("skips GPS jitter under 2 m", () => {
    expect(uploadDecision(BASE, 0, north(1.5), 2000)).toBe("skip");
  });

  it("uploads every 2 s", () => {
    expect(UPLOAD_INTERVAL_MS).toBe(2000);
  });

  it("checks in (same spot) every 10 s while stationary", () => {
    expect(CHECK_IN_INTERVAL_MS).toBe(10_000);
    expect(uploadDecision(BASE, 0, north(1), CHECK_IN_INTERVAL_MS - 1)).toBe("skip");
    expect(uploadDecision(BASE, 0, north(1), CHECK_IN_INTERVAL_MS)).toBe("check-in");
  });

  it("treats a hop within the GPS accuracy as jitter, not movement", () => {
    // A ±4 m fix: a 3 m wander isn't movement, 4.5 m is.
    expect(uploadDecision(BASE, 0, north(3), 2000, 4)).toBe("skip");
    expect(uploadDecision(BASE, 0, north(3), CHECK_IN_INTERVAL_MS, 4)).toBe("check-in");
    expect(uploadDecision(BASE, 0, north(4.5), 2000, 4)).toBe("move");
  });

  it("a poor fix can't hold a walking responder back past 5 m", () => {
    // ±40 m indoors/under cover used to need 40 m (~30 s on foot); now 5 m.
    expect(uploadDecision(BASE, 0, north(5.5), 2000, 40)).toBe("move");
    expect(uploadDecision(BASE, 0, north(4.5), 2000, 40)).toBe("skip");
  });

  it("never needs less than 2 m or more than 5 m to count as moving", () => {
    expect(movementThresholdMeters(null)).toBe(2);
    expect(movementThresholdMeters(1)).toBe(2);
    expect(movementThresholdMeters(3)).toBe(3);
    expect(movementThresholdMeters(400)).toBe(5);
  });
});

describe("routeOriginDecision", () => {
  const last = { coords: BASE, at: 0, key: "r1" };

  it("routes immediately with no previous route", () => {
    expect(routeOriginDecision(null, BASE, "r1", 0)).toEqual({ action: "update" });
  });

  it("routes immediately when switching to another responder", () => {
    expect(routeOriginDecision(last, north(1), "r2", 500)).toEqual({ action: "update" });
  });

  it("keeps the route while the origin has moved less than 30 m", () => {
    expect(routeOriginDecision(last, north(25), "r1", 60_000)).toEqual({ action: "keep" });
  });

  it("re-routes after 30 m once 10 s have passed", () => {
    expect(routeOriginDecision(last, north(40), "r1", 10_000)).toEqual({ action: "update" });
  });

  it("waits out the rest of the 10 s when 30 m comes sooner", () => {
    expect(routeOriginDecision(last, north(40), "r1", 4000)).toEqual({ action: "wait", retryInMs: 6000 });
  });
});

describe("marker glide", () => {
  it("eases from 0 to 1, clamped", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(2)).toBe(1);
  });

  it("interpolates between two coordinates", () => {
    const to = { latitude: 10.26, longitude: 123.96 };
    expect(interpolateCoordinate(BASE, to, 0)).toEqual(BASE);
    expect(interpolateCoordinate(BASE, to, 1)).toEqual(to);
    const half = interpolateCoordinate(BASE, to, 0.5);
    expect(half.latitude).toBeCloseTo(10.255);
    expect(half.longitude).toBeCloseTo(123.955);
  });
});
