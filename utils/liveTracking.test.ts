import {
  CHECK_IN_INTERVAL_MS,
  easeInOutCubic,
  interpolateCoordinate,
  routeOriginDecision,
  shouldUploadFix,
} from "./liveTracking";

const METER_LAT = 1 / 111_195;
const BASE = { latitude: 10.25, longitude: 123.95 };
const north = (meters: number) => ({ latitude: BASE.latitude + meters * METER_LAT, longitude: BASE.longitude });

describe("shouldUploadFix", () => {
  it("always sends the first fix", () => {
    expect(shouldUploadFix(null, 0, BASE, 1000)).toBe(true);
  });

  it("sends once the responder has moved 10 m", () => {
    expect(shouldUploadFix(BASE, 0, north(10.5), 3000)).toBe(true);
  });

  it("skips GPS jitter under 10 m", () => {
    expect(shouldUploadFix(BASE, 0, north(4), 3000)).toBe(false);
  });

  it("checks in every 15 s while stationary", () => {
    expect(shouldUploadFix(BASE, 0, north(2), CHECK_IN_INTERVAL_MS - 1)).toBe(false);
    expect(shouldUploadFix(BASE, 0, north(2), CHECK_IN_INTERVAL_MS)).toBe(true);
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
