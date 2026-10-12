jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  Accuracy: { High: 4 },
}));

import * as Location from "expo-location";

import { liveLocationWatcherStats, subscribeToLiveLocation } from "./liveLocationWatcher";

const requestForegroundPermissionsAsync = Location.requestForegroundPermissionsAsync as jest.Mock;
const watchPositionAsync = Location.watchPositionAsync as jest.Mock;

type Callback = (position: { coords: { latitude: number; longitude: number } }) => void;

let callbacks: Callback[];
let removes: jest.Mock[];

// Lets the async permission + watch setup finish.
const settle = () => new Promise<void>((resolve) => setImmediate(() => resolve()));

beforeEach(() => {
  jest.clearAllMocks();
  callbacks = [];
  removes = [];
  requestForegroundPermissionsAsync.mockResolvedValue({ status: "granted" });
  watchPositionAsync.mockImplementation(async (_options: unknown, callback: Callback) => {
    callbacks.push(callback);
    const remove = jest.fn();
    removes.push(remove);
    return { remove };
  });
});

describe("subscribeToLiveLocation", () => {
  it("shares one native watcher between subscribers and stops it after the last leaves", async () => {
    const a = jest.fn();
    const b = jest.fn();
    const unsubA = subscribeToLiveLocation(a);
    const unsubB = subscribeToLiveLocation(b);
    await settle();

    expect(watchPositionAsync).toHaveBeenCalledTimes(1);
    expect(liveLocationWatcherStats()).toEqual({ subscribers: 2, watching: true });

    callbacks[0]({ coords: { latitude: 10.25, longitude: 123.95 } });
    expect(a).toHaveBeenCalledWith(expect.objectContaining({ latitude: 10.25, longitude: 123.95 }));
    expect(b).toHaveBeenCalledTimes(1);

    unsubA();
    expect(removes[0]).not.toHaveBeenCalled();
    unsubB();
    expect(removes[0]).toHaveBeenCalledTimes(1);
    expect(liveLocationWatcherStats()).toEqual({ subscribers: 0, watching: false });
  });

  it("asks for a continuous high-accuracy stream", async () => {
    const unsub = subscribeToLiveLocation(jest.fn());
    await settle();
    expect(watchPositionAsync).toHaveBeenCalledWith(
      expect.objectContaining({ accuracy: 4, timeInterval: 1000 }),
      expect.any(Function),
    );
    unsub();
  });

  it("replays the latest fix to a late subscriber", async () => {
    const unsubA = subscribeToLiveLocation(jest.fn());
    await settle();
    callbacks[0]({ coords: { latitude: 10.3, longitude: 124 } });

    const late = jest.fn();
    const unsubLate = subscribeToLiveLocation(late);
    expect(late).toHaveBeenCalledWith(expect.objectContaining({ latitude: 10.3, longitude: 124 }));
    unsubA();
    unsubLate();
  });

  it("removes a watcher that only finished starting after everyone left", async () => {
    const unsub = subscribeToLiveLocation(jest.fn());
    unsub();
    await settle();
    // Permission was already in flight; the watch must not survive.
    expect(liveLocationWatcherStats().watching).toBe(false);
    if (removes.length) expect(removes[0]).toHaveBeenCalled();
  });

  it("starts a fresh watcher (no stale fix) for the next session", async () => {
    const first = subscribeToLiveLocation(jest.fn());
    await settle();
    callbacks[0]({ coords: { latitude: 10.3, longitude: 124 } });
    first();

    const next = jest.fn();
    const second = subscribeToLiveLocation(next);
    await settle();
    expect(next).not.toHaveBeenCalled();
    expect(watchPositionAsync).toHaveBeenCalledTimes(2);
    second();
  });

  it("unsubscribing twice is harmless", async () => {
    const keep = subscribeToLiveLocation(jest.fn());
    const unsub = subscribeToLiveLocation(jest.fn());
    await settle();
    unsub();
    unsub();
    expect(liveLocationWatcherStats().subscribers).toBe(1);
    keep();
  });

  it("doesn't start when permission is denied", async () => {
    requestForegroundPermissionsAsync.mockResolvedValue({ status: "denied" });
    const unsub = subscribeToLiveLocation(jest.fn());
    await settle();
    expect(watchPositionAsync).not.toHaveBeenCalled();
    unsub();
  });
});
