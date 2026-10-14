// useIncidentRoute across a walking/driving switch, with the Directions
// call mocked: the previous mode's road route stays available as
// previousModeRoute (to draw dimmed) but is never reported as the selected
// mode's route.
import React, { act } from "react";
import TestRenderer from "react-test-renderer";

import { getRoutes, type Route, type TravelProfile } from "@/services/directions.service";
import type { Coordinates } from "@/services/location.service";

import { useIncidentRoute } from "./useIncidentRoute";

jest.mock("@/services/directions.service", () => ({ getRoutes: jest.fn() }));

const mockedGetRoutes = getRoutes as jest.MockedFunction<typeof getRoutes>;
let pending: ((routes: Route[]) => void)[] = [];

beforeEach(() => {
  pending = [];
  mockedGetRoutes.mockReset();
  mockedGetRoutes.mockImplementation(
    () =>
      new Promise<Route[]>((resolve) => {
        pending.push(resolve);
      }),
  );
});

const RESPONDER = { latitude: 10.25, longitude: 123.94 };
const INCIDENT = { latitude: 10.26, longitude: 123.955 };
const WALK: Route = { coordinates: [RESPONDER, INCIDENT], distanceKm: 2.1, durationMin: 27 };
const DRIVE: Route = { coordinates: [RESPONDER, INCIDENT], distanceKm: 2.6, durationMin: 7 };

type Result = ReturnType<typeof useIncidentRoute>;
let latest: Result | null = null;
const record = (result: Result) => {
  latest = result;
};

function Harness({ profile, onResult }: { profile: TravelProfile; onResult: (r: Result) => void }) {
  onResult(useIncidentRoute(RESPONDER as Coordinates, INCIDENT, 12, 2.0, profile));
  return null;
}

function render(profile: TravelProfile) {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(<Harness profile={profile} onResult={record} />);
  });
  return (next: TravelProfile) => act(() => renderer.update(<Harness profile={next} onResult={record} />));
}

async function settle(index: number, routes: Route[]) {
  await act(async () => {
    pending[index](routes);
  });
}

test("before any mode switch there's no previous-mode route", async () => {
  render("walking");
  expect(latest?.modeLoading).toBe(false);
  await settle(0, [WALK]);
  expect(latest?.route).toEqual(WALK);
  expect(latest?.modeLoading).toBe(false);
  expect(latest?.previousModeRoute).toBeNull();
});

test("switching mode keeps the old road route only as previousModeRoute while the new one loads", async () => {
  const setProfile = render("walking");
  await settle(0, [WALK]);

  setProfile("driving");
  // Not the selected mode's route, and flagged as loading.
  expect(latest?.route).toBeNull();
  expect(latest?.routes).toEqual([]);
  expect(latest?.modeLoading).toBe(true);
  expect(latest?.previousModeRoute).toEqual(WALK);

  await settle(1, [DRIVE]);
  expect(latest?.route).toEqual(DRIVE);
  expect(latest?.durationMin).toBe(7);
  expect(latest?.modeLoading).toBe(false);
  expect(latest?.previousModeRoute).toBeNull();
});

test("if the new mode's route fails, the old mode's route is no longer offered", async () => {
  const setProfile = render("walking");
  await settle(0, [WALK]);

  setProfile("driving");
  await settle(1, []);
  expect(latest?.route).toBeNull();
  expect(latest?.modeLoading).toBe(false);
  expect(latest?.previousModeRoute).toBeNull();
});

test("an old-mode response landing after the switch is ignored", async () => {
  const setProfile = render("walking");
  setProfile("driving"); // walking's request still in flight
  await settle(1, [DRIVE]);
  await settle(0, [WALK]);
  expect(latest?.route).toEqual(DRIVE);
});
