import type { Route } from "@/services/directions.service";

import { buildRouteVisuals, buildStaleRouteVisuals } from "./routeVisuals";

const A = { latitude: 10.25, longitude: 123.94 };
const B = { latitude: 10.26, longitude: 123.955 };
const OLD_ROUTE: Route = {
  coordinates: [A, { latitude: 10.255, longitude: 123.948 }, B],
  distanceKm: 2.4,
  durationMin: 31,
};

describe("buildStaleRouteVisuals (previous travel mode, new one loading)", () => {
  it("draws the old road route, dimmed and dashed -- not as the active route", () => {
    const { polylines } = buildStaleRouteVisuals(OLD_ROUTE);
    expect(polylines).toHaveLength(1);
    expect(polylines[0].points).toEqual(OLD_ROUTE.coordinates);
    expect(polylines[0].dashed).toBe(true);

    const active = buildRouteVisuals([OLD_ROUTE], 0, "#F97316", [A, B]).polylines;
    expect(polylines[0].color).not.toBe(active[active.length - 1].color);
  });

  it("shows no duration pill -- that time belongs to the old mode", () => {
    expect(buildStaleRouteVisuals(OLD_ROUTE).labelMarkers).toEqual([]);
  });
});
