// Hook-level checks for useRoutes/useRoutesWithStatus with the Directions
// call mocked (no network): what reaches the screen when the origin moves,
// responses overlap, a request fails, or the destination changes.
import React, { act } from "react";
import TestRenderer from "react-test-renderer";

import { getRoutes, type Route, type TravelProfile } from "@/services/directions.service";
import type { Coordinates } from "@/services/location.service";

import { useRoutesWithStatus } from "./useRoutes";

jest.mock("@/services/directions.service", () => ({ getRoutes: jest.fn() }));

const mockedGetRoutes = getRoutes as jest.MockedFunction<typeof getRoutes>;

// Each getRoutes call returns a promise the test resolves by hand, so the
// order responses arrive in is fully controlled.
type Pending = { origin: Coordinates; resolve: (routes: Route[]) => void };
let pending: Pending[] = [];

beforeEach(() => {
  pending = [];
  mockedGetRoutes.mockReset();
  mockedGetRoutes.mockImplementation(
    (origin) =>
      new Promise<Route[]>((resolve) => {
        pending.push({ origin, resolve });
      }),
  );
});

const CENTER = { latitude: 10.26, longitude: 123.955 };
const OTHER_CENTER = { latitude: 10.3, longitude: 123.9 };
const A = { latitude: 10.25, longitude: 123.94 };
const B = { latitude: 10.251, longitude: 123.941 };

function routeFrom(origin: Coordinates, minutes: number): Route {
  return { coordinates: [origin, CENTER], distanceKm: minutes / 10, durationMin: minutes };
}

type Props = { origin?: Coordinates; destination?: Coordinates; profile?: TravelProfile };
type Result = ReturnType<typeof useRoutesWithStatus>;
let latest: Result = { routes: [], status: "idle", previousModeRoutes: [] };
const record = (result: Result) => {
  latest = result;
};

function Harness({
  origin,
  destination,
  profile = "walking",
  onResult,
}: Props & { onResult: (result: Result) => void }) {
  onResult(useRoutesWithStatus(origin, destination, profile));
  return null;
}

function render(props: Props) {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(<Harness {...props} onResult={record} />);
  });
  return {
    update(next: Props) {
      act(() => renderer.update(<Harness {...next} onResult={record} />));
    },
    unmount() {
      act(() => renderer.unmount());
    },
  };
}

async function settle(entry: Pending, routes: Route[]) {
  await act(async () => {
    entry.resolve(routes);
  });
}

test("the first route is requested from the current position to the selected center", async () => {
  render({ origin: A, destination: CENTER });

  expect(mockedGetRoutes).toHaveBeenCalledTimes(1);
  expect(mockedGetRoutes).toHaveBeenCalledWith(A, CENTER, "walking");
  await settle(pending[0], [routeFrom(A, 9)]);
  expect(latest).toEqual({ routes: [routeFrom(A, 9)], status: "ok", previousModeRoutes: [] });
});

test("a re-render mid-request (same values, new objects) no longer throws the answer away", async () => {
  const view = render({ origin: { ...A }, destination: { ...CENTER } });
  // e.g. the live position re-rendering the screen while the request is out
  view.update({ origin: { ...A }, destination: { ...CENTER } });

  expect(mockedGetRoutes).toHaveBeenCalledTimes(1);
  await settle(pending[0], [routeFrom(A, 9)]);
  expect(latest.routes).toEqual([routeFrom(A, 9)]);
});

test("a moved origin recalculates the route", async () => {
  const view = render({ origin: A, destination: CENTER });
  await settle(pending[0], [routeFrom(A, 9)]);

  view.update({ origin: B, destination: CENTER });
  expect(mockedGetRoutes).toHaveBeenCalledTimes(2);
  expect(mockedGetRoutes).toHaveBeenLastCalledWith(B, CENTER, "walking");
  await settle(pending[1], [routeFrom(B, 7)]);
  expect(latest.routes).toEqual([routeFrom(B, 7)]);
});

test("an older response arriving after a newer one never replaces the newer route", async () => {
  const view = render({ origin: A, destination: CENTER });
  view.update({ origin: B, destination: CENTER });

  await settle(pending[1], [routeFrom(B, 7)]); // newer lands first
  await settle(pending[0], [routeFrom(A, 9)]); // older straggler
  expect(latest.routes).toEqual([routeFrom(B, 7)]);
});

test("a failed recalculation keeps the last good route and reports the failure", async () => {
  const view = render({ origin: A, destination: CENTER });
  await settle(pending[0], [routeFrom(A, 9)]);

  view.update({ origin: B, destination: CENTER });
  await settle(pending[1], []); // getRoutes returns [] on any failure

  expect(latest).toEqual({ routes: [routeFrom(A, 9)], status: "failed", previousModeRoutes: [] });
});

test("a failed first request reports failure with no route (no fake road route)", async () => {
  render({ origin: A, destination: CENTER });
  await settle(pending[0], []);
  expect(latest).toEqual({ routes: [], status: "failed", previousModeRoutes: [] });
});

test("changing the destination drops the old trip's route and its late response", async () => {
  const view = render({ origin: A, destination: CENTER });
  await settle(pending[0], [routeFrom(A, 9)]);

  view.update({ origin: A, destination: OTHER_CENTER });
  // While the new trip is loading, the old destination's route isn't shown.
  expect(latest.routes).toEqual([]);
  expect(mockedGetRoutes).toHaveBeenLastCalledWith(A, OTHER_CENTER, "walking");

  const otherRoute = { coordinates: [A, OTHER_CENTER], distanceKm: 3, durationMin: 30 };
  await settle(pending[1], [otherRoute]);
  expect(latest.routes).toEqual([otherRoute]);
});

test("switching travel mode re-requests for the new mode", async () => {
  const view = render({ origin: A, destination: CENTER, profile: "walking" });
  await settle(pending[0], [routeFrom(A, 9)]);

  view.update({ origin: A, destination: CENTER, profile: "driving" });
  expect(mockedGetRoutes).toHaveBeenLastCalledWith(A, CENTER, "driving");
  expect(latest.routes).toEqual([]);
});

test.each([
  ["NaN", { latitude: Number.NaN, longitude: 123.94 }],
  ["out of range", { latitude: 120, longitude: 123.94 }],
  ["0,0", { latitude: 0, longitude: 0 }],
])("an invalid origin (%s) requests nothing", (_label, origin) => {
  render({ origin, destination: CENTER });
  expect(mockedGetRoutes).not.toHaveBeenCalled();
  expect(latest).toEqual({ routes: [], status: "idle", previousModeRoutes: [] });
});

test("no origin yet (location still resolving) requests nothing", () => {
  render({ origin: undefined, destination: CENTER });
  expect(mockedGetRoutes).not.toHaveBeenCalled();
});

test("a response that lands after the screen closed is ignored without crashing", async () => {
  const view = render({ origin: A, destination: CENTER });
  view.unmount();
  await settle(pending[0], [routeFrom(A, 9)]);
  expect(mockedGetRoutes).toHaveBeenCalledTimes(1);
});

describe("travel-mode switch keeps the previous mode's route available, separately", () => {
  test("while the new mode loads, the old mode's routes are exposed only as previousModeRoutes", async () => {
    const view = render({ origin: A, destination: CENTER, profile: "walking" });
    await settle(pending[0], [routeFrom(A, 9)]);

    view.update({ origin: A, destination: CENTER, profile: "driving" });
    // Never presented as the driving route...
    expect(latest.routes).toEqual([]);
    // ...but still there to be drawn as "previous mode, loading".
    expect(latest.previousModeRoutes).toEqual([routeFrom(A, 9)]);

    await settle(pending[1], [routeFrom(A, 4)]);
    expect(latest.routes).toEqual([routeFrom(A, 4)]);
    expect(latest.previousModeRoutes).toEqual([]);
  });

  test("a different destination never hands over the old trip's route", async () => {
    const view = render({ origin: A, destination: CENTER, profile: "walking" });
    await settle(pending[0], [routeFrom(A, 9)]);

    view.update({ origin: A, destination: OTHER_CENTER, profile: "driving" });
    expect(latest.routes).toEqual([]);
    expect(latest.previousModeRoutes).toEqual([]);
  });

  test("no previous route outside a mode switch", async () => {
    render({ origin: A, destination: CENTER });
    expect(latest.previousModeRoutes).toEqual([]);
    await settle(pending[0], [routeFrom(A, 9)]);
    expect(latest.previousModeRoutes).toEqual([]);
  });
});
