jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  Accuracy: { Highest: 5 },
}));

import * as Location from "expo-location";

import { getCurrentLocation, getVerifiedLocation } from "./location.service";

const requestForegroundPermissionsAsync =
  Location.requestForegroundPermissionsAsync as jest.Mock;
const getCurrentPositionAsync = Location.getCurrentPositionAsync as jest.Mock;
const getLastKnownPositionAsync = Location.getLastKnownPositionAsync as jest.Mock;

describe("getCurrentLocation", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns the fresh GPS fix when it resolves before the timeout", async () => {
    requestForegroundPermissionsAsync.mockResolvedValue({ status: "granted" });
    getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 10.25, longitude: 123.95 },
    });

    const result = await getCurrentLocation();

    expect(result).toEqual({ latitude: 10.25, longitude: 123.95 });
    expect(getLastKnownPositionAsync).not.toHaveBeenCalled();
  });

  it("falls back to the last known position when the fresh fix never resolves", async () => {
    requestForegroundPermissionsAsync.mockResolvedValue({ status: "granted" });
    // Simulates a real device that can't get a GPS lock (e.g. indoors) --
    // getCurrentPositionAsync has no built-in timeout, so it just hangs.
    getCurrentPositionAsync.mockReturnValue(new Promise(() => {}));
    getLastKnownPositionAsync.mockResolvedValue({
      coords: { latitude: 10.26, longitude: 123.96 },
    });

    const resultPromise = getCurrentLocation();
    await jest.advanceTimersByTimeAsync(10_000);
    const result = await resultPromise;

    expect(result).toEqual({ latitude: 10.26, longitude: 123.96 });
  });

  it("returns undefined when the fresh fix times out and no cached position exists", async () => {
    requestForegroundPermissionsAsync.mockResolvedValue({ status: "granted" });
    getCurrentPositionAsync.mockReturnValue(new Promise(() => {}));
    getLastKnownPositionAsync.mockResolvedValue(null);

    const resultPromise = getCurrentLocation();
    await jest.advanceTimersByTimeAsync(10_000);
    const result = await resultPromise;

    expect(result).toBeUndefined();
  });
});

describe("getVerifiedLocation", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns denied when permission is refused", async () => {
    requestForegroundPermissionsAsync.mockResolvedValue({ status: "denied" });

    const result = await getVerifiedLocation();

    expect(result).toEqual({ status: "denied" });
    expect(getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it("returns granted with coords when a fresh fix resolves before the timeout", async () => {
    requestForegroundPermissionsAsync.mockResolvedValue({ status: "granted" });
    getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 10.2515, longitude: 123.9499 },
    });

    const result = await getVerifiedLocation();

    expect(result).toEqual({
      status: "granted",
      coords: { latitude: 10.2515, longitude: 123.9499 },
    });
  });

  it("returns unavailable when the fresh fix times out", async () => {
    requestForegroundPermissionsAsync.mockResolvedValue({ status: "granted" });
    getCurrentPositionAsync.mockReturnValue(new Promise(() => {}));

    const resultPromise = getVerifiedLocation();
    await jest.advanceTimersByTimeAsync(10_000);
    const result = await resultPromise;

    expect(result).toEqual({ status: "unavailable" });
  });
});
