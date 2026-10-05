import {
  respondersAssignedMessage,
  respondersAssignedTitle,
  respondersHeadline,
  selectedResponder,
  trackRespondersLabel,
} from "./trackResponders";
import { locationFreshness } from "@/hooks/useResponderTracking";

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
