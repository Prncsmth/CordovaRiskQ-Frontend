import {
  arrivalLabel,
  INITIAL_TRACKING_DATA,
  mergeResponderLocation,
  mergeTrackingSnapshot,
  movementModes,
  respondersAssignedMessage,
  respondersAssignedTitle,
  respondersHeadline,
  selectedResponder,
  trackingReducer,
  trackRespondersLabel,
  type ResponderLocationUpdate,
} from "./trackResponders";
import { locationFreshness } from "@/hooks/useResponderTracking";
import type { ResponderTrack, TrackingSnapshot } from "@/services/tracking.service";

describe("respondersHeadline", () => {
  it("says how many responders are coming", () => {
    expect(respondersHeadline(["joined", "on_the_way", "on_the_way"])).toBe("3 responders on the way");
  });

  it("counts arrivals once some are on scene", () => {
    expect(respondersHeadline(["arrived", "on_the_way", "joined"])).toBe("3 responders · 1 arrived");
  });

  it("says they've all arrived", () => {
    expect(respondersHeadline(["arrived", "arrived"])).toBe("2 responders arrived");
  });
});

describe("selectedResponder", () => {
  const juan = { responderId: "juan" };
  const pedro = { responderId: "pedro" };

  it("defaults to the first responder to accept", () => {
    expect(selectedResponder([juan, pedro], null)).toBe(juan);
  });

  it("follows the responder the user tapped", () => {
    expect(selectedResponder([juan, pedro], "pedro")).toBe(pedro);
  });

  it("falls back to the first responder if the tapped one has left", () => {
    expect(selectedResponder([juan], "pedro")).toBe(juan);
  });

  it("is undefined when there's nobody to track", () => {
    expect(selectedResponder([], null)).toBeUndefined();
  });
});

describe("locationFreshness", () => {
  const now = Date.parse("2026-10-05T08:00:30.000Z");

  it("is fresh right after an update", () => {
    expect(locationFreshness("2026-10-05T08:00:25.000Z", now)).toEqual({
      secondsSinceUpdate: 5,
      stale: false,
      veryStale: false,
    });
  });

  it("is stale after 15s and very stale after 30s", () => {
    expect(locationFreshness("2026-10-05T08:00:10.000Z", now).stale).toBe(true);
    expect(locationFreshness("2026-10-05T08:00:00.000Z", now).veryStale).toBe(true);
  });

  it("is unknown when there's no location yet", () => {
    expect(locationFreshness(null, now)).toEqual({
      secondsSinceUpdate: null,
      stale: false,
      veryStale: false,
    });
  });
});

describe("trackRespondersLabel", () => {
  it("is singular for one responder", () => {
    expect(trackRespondersLabel(1)).toBe("Track Responder");
  });

  it("is plural for two or more responders", () => {
    expect(trackRespondersLabel(2)).toBe("Track Responders");
    expect(trackRespondersLabel(5)).toBe("Track Responders");
  });

  it("stays singular when the count isn't known yet", () => {
    expect(trackRespondersLabel(0)).toBe("Track Responder");
  });
});

describe("respondersAssignedTitle", () => {
  it("matches the number of responders", () => {
    expect(respondersAssignedTitle(1)).toBe("Responder Assigned");
    expect(respondersAssignedTitle(3)).toBe("Responders Assigned");
  });
});

describe("respondersAssignedMessage", () => {
  it("names a single responder", () => {
    expect(respondersAssignedMessage(["Juan"])).toBe("Juan has been assigned and is on the way.");
  });

  it("names both of two responders", () => {
    expect(respondersAssignedMessage(["Juan", "Pedro"])).toBe("Juan and Pedro are on the way.");
  });

  it("names the first and counts the rest for three or more", () => {
    expect(respondersAssignedMessage(["Juan", "Pedro", "Maria"])).toBe(
      "Juan and 2 other responders are on the way.",
    );
  });

  it("falls back to a generic name when one is missing", () => {
    expect(respondersAssignedMessage([])).toBe("A responder has been assigned and is on the way.");
    expect(respondersAssignedMessage(["  "])).toBe("A responder has been assigned and is on the way.");
  });
});

describe("arrivalLabel", () => {
  it("shows the ETA in whole minutes, at least 1", () => {
    expect(arrivalLabel("on_the_way", true, 6.4)).toBe("Arriving in ~6 min");
    expect(arrivalLabel("on_the_way", true, 0.2)).toBe("Arriving in ~1 min");
  });

  it("says arrived, waiting for location, or just on the way", () => {
    expect(arrivalLabel("arrived", true, 3)).toBe("Arrived");
    expect(arrivalLabel("joined", false, 5)).toBe("Waiting for location");
    expect(arrivalLabel("on_the_way", true, null)).toBe("On the way");
  });
});

describe("live tracking state", () => {
  const METER_LAT = 1 / 111_195;
  const iso = (seconds: number) => new Date(Date.UTC(2026, 9, 5, 8, 0, seconds)).toISOString();

  function track(id: string, meters: number | null, seconds: number | null): ResponderTrack {
    return {
      responderId: id,
      responderName: id.toUpperCase(),
      location: meters === null ? null : { latitude: 10.25 + meters * METER_LAT, longitude: 123.95 },
      locationUpdatedAt: seconds === null ? null : iso(seconds),
      status: "on_the_way",
      etaMinutes: 5,
    };
  }

  function snapshot(
    responders: ResponderTrack[],
    contact: { primaryMobile: string | null; primaryUnit: string | null } = { primaryMobile: null, primaryUnit: null },
  ): TrackingSnapshot {
    return { ...responders[0], responders, ...contact };
  }

  function push(id: string, meters: number, seconds: number): ResponderLocationUpdate {
    return {
      responderId: id,
      latitude: 10.25 + meters * METER_LAT,
      longitude: 123.95,
      locationUpdatedAt: iso(seconds),
    };
  }

  describe("mergeResponderLocation", () => {
    it("moves only the responder the push is for, by ID", () => {
      const before = snapshot([track("a", 0, 0), track("b", 0, 0), track("c", 0, 0)]);
      const after = mergeResponderLocation(before, push("b", 50, 3));

      expect(after.responders).toHaveLength(3);
      expect(after.responders[1].location?.latitude).toBeCloseTo(10.25 + 50 * METER_LAT);
      expect(after.responders[1].locationUpdatedAt).toBe(iso(3));
      // The others keep their exact objects, so their markers aren't touched.
      expect(after.responders[0]).toBe(before.responders[0]);
      expect(after.responders[2]).toBe(before.responders[2]);
    });

    it("keeps the primary (first-accepted) fields in step", () => {
      const before = snapshot([track("a", 0, 0), track("b", 0, 0)]);
      const after = mergeResponderLocation(before, push("a", 50, 3));
      expect(after.responderId).toBe("a");
      expect(after.locationUpdatedAt).toBe(iso(3));
    });

    it("keeps the primary responder's contact through live location pushes", () => {
      const before = snapshot([track("a", 0, 0), track("b", 0, 0)], {
        primaryMobile: "09171234567",
        primaryUnit: "MDRRMO",
      });
      const after = mergeResponderLocation(before, push("a", 50, 3));
      expect(after.primaryMobile).toBe("09171234567");
      expect(after.primaryUnit).toBe("MDRRMO");
    });

    it("ignores an unknown responder and a stale push (same object back)", () => {
      const before = snapshot([track("a", 0, 10)]);
      expect(mergeResponderLocation(before, push("zzz", 50, 20))).toBe(before);
      expect(mergeResponderLocation(before, push("a", 50, 5))).toBe(before);
      expect(mergeResponderLocation(before, push("a", 50, 10))).toBe(before);
    });
  });

  describe("mergeTrackingSnapshot", () => {
    it("doesn't let a poll drag a marker back behind a newer socket push", () => {
      const onScreen = snapshot([track("a", 80, 9)]);
      const polled = snapshot([{ ...track("a", 50, 6), status: "arrived" }]);
      const merged = mergeTrackingSnapshot(onScreen, polled);
      expect(merged.responders[0].locationUpdatedAt).toBe(iso(9));
      expect(merged.responders[0].status).toBe("arrived");
    });

    it("returns the same snapshot when a poll brings nothing new", () => {
      const onScreen = snapshot([track("a", 0, 0), track("b", 10, 0)]);
      const polled = snapshot([track("a", 0, 0), track("b", 10, 0)]);
      expect(mergeTrackingSnapshot(onScreen, polled)).toBe(onScreen);
    });

    it("switches the call contact when the primary responder leaves", () => {
      const onScreen = snapshot([track("a", 0, 0), track("b", 0, 0)], {
        primaryMobile: "09170000001",
        primaryUnit: "BDRRMO",
      });
      // "a" left: the backend now names "b" primary, with b's contact.
      const polled = snapshot([track("b", 0, 0)], { primaryMobile: "09170000002", primaryUnit: "MDRRMO" });
      const merged = mergeTrackingSnapshot(onScreen, polled);
      expect(merged.responderId).toBe("b");
      expect(merged.primaryMobile).toBe("09170000002");
      expect(merged.primaryUnit).toBe("MDRRMO");
    });

    it("picks up a primary contact that changed even when the roster didn't", () => {
      const onScreen = snapshot([track("a", 0, 0)], { primaryMobile: null, primaryUnit: null });
      const polled = snapshot([track("a", 0, 0)], { primaryMobile: "09171234567", primaryUnit: null });
      expect(mergeTrackingSnapshot(onScreen, polled).primaryMobile).toBe("09171234567");
    });

    it("adds and removes responders as the roster changes", () => {
      const onScreen = snapshot([track("a", 0, 0), track("b", 0, 0)]);
      const polled = snapshot([track("a", 0, 0), track("c", 5, 1)]);
      const merged = mergeTrackingSnapshot(onScreen, polled);
      expect(merged.responders.map((r) => r.responderId)).toEqual(["a", "c"]);
      expect(merged.responders[0]).toBe(onScreen.responders[0]);
    });
  });

  describe("trackingReducer", () => {
    it("gives one marker-worth of state per responder ID (1, 2, 3 responders)", () => {
      for (const ids of [["a"], ["a", "b"], ["a", "b", "c"]]) {
        const data = trackingReducer(INITIAL_TRACKING_DATA, {
          type: "snapshot",
          snapshot: snapshot(ids.map((id) => track(id, 0, 0))),
        });
        expect(data.snapshot?.responders.map((r) => r.responderId)).toEqual(ids);
        expect(Object.keys(movementModes(data.movement)).sort()).toEqual(ids);
      }
    });

    it("defaults every responder to vehicle", () => {
      const data = trackingReducer(INITIAL_TRACKING_DATA, {
        type: "snapshot",
        snapshot: snapshot([track("a", 0, 0), track("b", null, null)]),
      });
      expect(movementModes(data.movement)).toEqual({ a: "vehicle", b: "vehicle" });
    });

    it("keeps each responder's movement independent", () => {
      let data = trackingReducer(INITIAL_TRACKING_DATA, {
        type: "snapshot",
        snapshot: snapshot([track("a", 0, 0), track("b", 0, 0)]),
      });
      // a drives (30 m every 3 s), b walks (12 m every 9 s).
      for (const [id, meters, seconds] of [
        ["a", 30, 3],
        ["a", 60, 6],
        ["b", 12, 9],
        ["a", 90, 9],
        ["b", 24, 18],
      ] as const) {
        data = trackingReducer(data, { type: "location", update: push(id, meters, seconds) });
      }
      expect(movementModes(data.movement)).toEqual({ a: "vehicle", b: "walking" });
    });

    it("ignores a location push before the first snapshot", () => {
      const data = trackingReducer(INITIAL_TRACKING_DATA, { type: "location", update: push("a", 10, 1) });
      expect(data).toBe(INITIAL_TRACKING_DATA);
    });

    it("holds a parked responder's marker still through GPS jitter", () => {
      let data = trackingReducer(INITIAL_TRACKING_DATA, {
        type: "snapshot",
        snapshot: snapshot([track("a", 0, 0)]),
      });
      const held = data.positions.a;
      // Check-ins from the same spot, drifting a few meters each time.
      for (const [meters, seconds] of [[6, 15], [-4, 30], [9, 45]] as const) {
        data = trackingReducer(data, { type: "location", update: push("a", meters, seconds) });
      }
      expect(data.positions.a).toBe(held);
      // The raw position and freshness still update underneath.
      expect(data.snapshot?.responders[0].locationUpdatedAt).toBe(iso(45));
    });

    it("moves the marker once the responder really moves, even in small steps", () => {
      let data = trackingReducer(INITIAL_TRACKING_DATA, {
        type: "snapshot",
        snapshot: snapshot([track("a", 0, 0)]),
      });
      // Walking ~5 m per update: held for the first steps, then follows.
      for (const [meters, seconds] of [[5, 3], [10, 6], [16, 9]] as const) {
        data = trackingReducer(data, { type: "location", update: push("a", meters, seconds) });
      }
      expect(data.positions.a.latitude).toBeCloseTo(10.25 + 16 * METER_LAT);
    });

    it("draws a responder with no location nowhere, and drops one who left", () => {
      let data = trackingReducer(INITIAL_TRACKING_DATA, {
        type: "snapshot",
        snapshot: snapshot([track("a", 0, 0), track("b", null, null)]),
      });
      expect(Object.keys(data.positions)).toEqual(["a"]);
      data = trackingReducer(data, { type: "snapshot", snapshot: snapshot([track("b", 0, 1)]) });
      expect(Object.keys(data.positions)).toEqual(["b"]);
    });

    it("returns the same state when nothing changed", () => {
      const data = trackingReducer(INITIAL_TRACKING_DATA, {
        type: "snapshot",
        snapshot: snapshot([track("a", 0, 0)]),
      });
      expect(trackingReducer(data, { type: "snapshot", snapshot: snapshot([track("a", 0, 0)]) })).toBe(data);
      expect(trackingReducer(data, { type: "location", update: push("a", 30, 0) })).toBe(data);
    });
  });
});
