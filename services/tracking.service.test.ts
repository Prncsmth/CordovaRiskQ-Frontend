jest.mock("./api", () => ({
  apiGet: jest.fn(),
}));

import { apiGet } from "./api";
import { getResponderTracking } from "./tracking.service";

const mockApiGet = apiGet as jest.Mock;

const juan = {
  responderId: "juan",
  responderName: "Juan",
  latitude: 10.25,
  longitude: 124.01,
  locationUpdatedAt: "2026-10-05T08:00:00.000Z",
  status: "on_the_way" as const,
  etaMinutes: 6,
};
const pedro = {
  responderId: "pedro",
  responderName: "Pedro",
  latitude: null,
  longitude: null,
  locationUpdatedAt: null,
  status: "joined" as const,
  etaMinutes: null,
};

beforeEach(() => jest.clearAllMocks());

describe("getResponderTracking", () => {
  it("returns every responder currently helping, first-accepted first", async () => {
    mockApiGet.mockResolvedValue({ success: true, tracking: { ...juan, responders: [juan, pedro] } });

    const result = await getResponderTracking("jwt", "inc-1");

    expect(result.state).toBe("ok");
    if (result.state !== "ok") return;
    expect(result.snapshot.responderName).toBe("Juan"); // first responder, flat, as before
    expect(result.snapshot.responders.map((r) => r.responderName)).toEqual(["Juan", "Pedro"]);
    expect(result.snapshot.responders[0].location).toEqual({ latitude: 10.25, longitude: 124.01 });
    expect(result.snapshot.responders[1].location).toBeNull(); // no location yet
  });

  it("treats an older backend's single responder as a list of one", async () => {
    mockApiGet.mockResolvedValue({ success: true, tracking: juan });

    const result = await getResponderTracking("jwt", "inc-1");

    if (result.state !== "ok") throw new Error("expected ok");
    expect(result.snapshot.responders).toHaveLength(1);
    expect(result.snapshot.responders[0].responderId).toBe("juan");
  });

  it("keeps the existing waiting / ended / forbidden states", async () => {
    mockApiGet.mockRejectedValueOnce(
      Object.assign(new Error("No responder has accepted this incident yet"), { status: 404 }),
    );
    await expect(getResponderTracking("jwt", "inc-1")).resolves.toEqual({ state: "waiting" });

    mockApiGet.mockRejectedValueOnce(
      Object.assign(new Error("Tracking is no longer available for this incident"), { status: 404 }),
    );
    await expect(getResponderTracking("jwt", "inc-1")).resolves.toEqual({ state: "ended" });

    mockApiGet.mockRejectedValueOnce(Object.assign(new Error("Not your report"), { status: 403 }));
    await expect(getResponderTracking("jwt", "inc-1")).resolves.toEqual({ state: "forbidden" });
  });
});
