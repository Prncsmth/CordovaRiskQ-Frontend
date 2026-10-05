import {
  advanceMovement,
  classifyHop,
  INITIAL_MOVEMENT_STATE,
  speedKmh,
  type MovementSample,
  type MovementState,
} from "./responderMovement";

// ~1 m of latitude, so hops can be written in meters.
const METER_LAT = 1 / 111_195;
const BASE = { latitude: 10.25, longitude: 123.95 };

// A sample `meters` north of BASE at `seconds` after t=0.
function at(meters: number, seconds: number): MovementSample {
  return { latitude: BASE.latitude + meters * METER_LAT, longitude: BASE.longitude, at: seconds * 1000 };
}

// Feeds a whole track in, starting from a fresh state.
function run(samples: MovementSample[], start: MovementState = INITIAL_MOVEMENT_STATE): MovementState {
  return samples.reduce(advanceMovement, start);
}

describe("speedKmh", () => {
  it("is distance over time", () => {
    // 100 m in 10 s = 36 km/h
    expect(speedKmh(at(0, 0), at(100, 10))).toBeCloseTo(36, 0);
  });

  it("is null without a positive time gap", () => {
    expect(speedKmh(at(0, 5), at(100, 5))).toBeNull();
    expect(speedKmh(at(0, 5), at(100, 4))).toBeNull();
  });
});

describe("classifyHop", () => {
  it("is vehicle above 10 km/h", () => {
    expect(classifyHop(at(0, 0), at(30, 3))).toBe("vehicle"); // 36 km/h
    expect(classifyHop(at(0, 0), at(36, 12))).toBe("vehicle"); // ~10.8 km/h
  });

  it("is walking below 6 km/h", () => {
    expect(classifyHop(at(0, 0), at(12, 9))).toBe("walking"); // 4.8 km/h
  });

  it("is ambiguous between 6 and 10 km/h", () => {
    expect(classifyHop(at(0, 0), at(20, 9))).toBe("ambiguous"); // 8 km/h
  });

  it("is stopped for a hop under 10 m, however short the time", () => {
    expect(classifyHop(at(0, 0), at(6, 1))).toBe("stopped");
  });

  it("ignores an implausible GPS jump", () => {
    expect(classifyHop(at(0, 0), at(2000, 3))).toBe("ignored"); // 2400 km/h
  });
});

describe("advanceMovement", () => {
  it("defaults to vehicle before there's any movement data", () => {
    expect(INITIAL_MOVEMENT_STATE.mode).toBe("vehicle");
    expect(run([at(0, 0)]).mode).toBe("vehicle");
  });

  it("switches to walking only after sustained walking speed", () => {
    const oneSlowHop = run([at(0, 0), at(12, 9)]);
    expect(oneSlowHop.mode).toBe("vehicle");
    const twoSlowHops = run([at(0, 0), at(12, 9), at(24, 18)]);
    expect(twoSlowHops.mode).toBe("walking");
  });

  it("switches back to vehicle only after sustained vehicle speed", () => {
    const walking = run([at(0, 0), at(12, 9), at(24, 18)]);
    expect(run([at(54, 21)], walking).mode).toBe("walking"); // one fast hop
    expect(run([at(54, 21), at(84, 24)], walking).mode).toBe("vehicle");
  });

  it("keeps the current icon through 6-10 km/h and resets the vote count", () => {
    const walking = run([at(0, 0), at(12, 9), at(24, 18)]);
    // 8 km/h hops: stays walking.
    expect(run([at(44, 27), at(64, 36)], walking).mode).toBe("walking");
    // fast, ambiguous, fast: the ambiguous hop breaks the streak.
    expect(run([at(54, 21), at(74, 30), at(104, 33)], walking).mode).toBe("walking");
  });

  it("keeps the last icon while stopped", () => {
    const walking = run([at(0, 0), at(12, 9), at(24, 18)]);
    const parked = run([at(26, 33), at(25, 48), at(27, 63)], walking);
    expect(parked.mode).toBe("walking");

    const driving = run([at(0, 0), at(30, 3), at(60, 6)]);
    expect(run([at(62, 21), at(61, 36)], driving).mode).toBe("vehicle");
  });

  it("doesn't flicker on noisy stop-and-go traffic", () => {
    // Driving with one slow hop in between (slow traffic) never flips.
    const track = [at(0, 0), at(30, 3), at(42, 12), at(72, 15), at(84, 24), at(114, 27)];
    const modes = track.map((_, i) => run(track.slice(0, i + 1)).mode);
    expect(new Set(modes)).toEqual(new Set(["vehicle"]));
  });

  it("ignores a repeated or out-of-order sample (same state object)", () => {
    const state = run([at(0, 0), at(30, 3)]);
    expect(advanceMovement(state, at(30, 3))).toBe(state);
    expect(advanceMovement(state, at(10, 1))).toBe(state);
  });
});
