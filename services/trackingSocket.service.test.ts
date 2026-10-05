const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
};
jest.mock("socket.io-client", () => ({ io: jest.fn(() => mockSocket) }));
jest.mock("@/services/api", () => ({ API_BASE_URL: "https://api.test" }));

import { connectToTrackingSocket } from "./trackingSocket.service";

function handlerFor(event: string) {
  const call = mockSocket.on.mock.calls.find(([name]) => name === event);
  return call?.[1] as (payload?: unknown) => void;
}

describe("connectToTrackingSocket", () => {
  beforeEach(() => jest.clearAllMocks());

  it("joins the incident room and forwards valid location pushes", () => {
    const onLocation = jest.fn();
    connectToTrackingSocket("token", "inc-1", { onLocation, onRosterChange: jest.fn(), onReconnect: jest.fn() });

    handlerFor("connect")();
    expect(mockSocket.emit).toHaveBeenCalledWith("join:incident", { incidentId: "inc-1" });

    const update = { responderId: "r1", latitude: 10.25, longitude: 123.95, locationUpdatedAt: "2026-10-05T08:00:00.000Z" };
    handlerFor("incident:responderLocation")(update);
    expect(onLocation).toHaveBeenCalledWith(update);
  });

  it("drops malformed location pushes", () => {
    const onLocation = jest.fn();
    connectToTrackingSocket("token", "inc-1", { onLocation, onRosterChange: jest.fn(), onReconnect: jest.fn() });
    handlerFor("incident:responderLocation")({ responderId: "r1", latitude: "x" });
    handlerFor("incident:responderLocation")(null);
    expect(onLocation).not.toHaveBeenCalled();
  });

  it("signals roster changes and reconnects (not the first connect)", () => {
    const onRosterChange = jest.fn();
    const onReconnect = jest.fn();
    connectToTrackingSocket("token", "inc-1", { onLocation: jest.fn(), onRosterChange, onReconnect });

    handlerFor("connect")();
    expect(onReconnect).not.toHaveBeenCalled();
    handlerFor("connect")();
    expect(onReconnect).toHaveBeenCalledTimes(1);
    expect(mockSocket.emit).toHaveBeenCalledTimes(2); // re-joins the room too

    handlerFor("incident:updated")({});
    expect(onRosterChange).toHaveBeenCalledTimes(1);
  });

  it("removes every listener it added and disconnects", () => {
    const disconnect = connectToTrackingSocket("token", "inc-1", {
      onLocation: jest.fn(),
      onRosterChange: jest.fn(),
      onReconnect: jest.fn(),
    });
    disconnect();
    const added = mockSocket.on.mock.calls.map(([name, fn]) => [name, fn]);
    const removed = mockSocket.off.mock.calls.map(([name, fn]) => [name, fn]);
    expect(removed).toEqual(added);
    expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
  });
});
