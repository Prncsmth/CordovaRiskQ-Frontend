import type { Incident } from "@/responder/types/responder";

import { resolveIncident } from "./resolveIncident";

const completedIncident = {
  id: "inc-1",
  status: "completed",
  myStatus: "arrived",
} as Incident;

describe("resolveIncident", () => {
  it("marks the incident completed and reports resolved (success dialog shows)", async () => {
    const updateIncidentStatus = jest.fn().mockResolvedValue(completedIncident);

    const result = await resolveIncident("token", "inc-1", { updateIncidentStatus });

    expect(updateIncidentStatus).toHaveBeenCalledTimes(1);
    expect(updateIncidentStatus).toHaveBeenCalledWith("token", "inc-1", "completed");
    expect(result).toEqual({ status: "resolved" });
  });

  it("reports failed on a network error, so the success dialog does not show", async () => {
    const updateIncidentStatus = jest
      .fn()
      .mockRejectedValue(new Error("Network request failed"));

    const result = await resolveIncident("token", "inc-1", { updateIncidentStatus });

    expect(result).toEqual({ status: "failed" });
  });

  it("reports failed on a server error", async () => {
    const updateIncidentStatus = jest
      .fn()
      .mockRejectedValue(
        Object.assign(new Error("Request failed with status 500"), { status: 500 }),
      );

    const result = await resolveIncident("token", "inc-1", { updateIncidentStatus });

    expect(result).toEqual({ status: "failed" });
  });

  it("reports failed for a non-Error rejection such as a timeout", async () => {
    const updateIncidentStatus = jest.fn().mockRejectedValue("timeout");

    const result = await resolveIncident("token", "inc-1", { updateIncidentStatus });

    expect(result).toEqual({ status: "failed" });
  });

  it("does not hand back an updated incident on failure, so the current one stays as is", async () => {
    const updateIncidentStatus = jest.fn().mockRejectedValue(new Error("boom"));

    const result = await resolveIncident("token", "inc-1", { updateIncidentStatus });

    expect(result).toEqual({ status: "failed" });
    expect(result).not.toHaveProperty("incident");
  });

  it("Try Again reuses the same update: a failed attempt followed by a successful one resolves", async () => {
    const updateIncidentStatus = jest
      .fn()
      .mockRejectedValueOnce(new Error("Network request failed"))
      .mockResolvedValueOnce(completedIncident);

    const first = await resolveIncident("token", "inc-1", { updateIncidentStatus });
    const second = await resolveIncident("token", "inc-1", { updateIncidentStatus });

    expect(first).toEqual({ status: "failed" });
    expect(second).toEqual({ status: "resolved" });
    expect(updateIncidentStatus).toHaveBeenCalledTimes(2);
    expect(updateIncidentStatus).toHaveBeenNthCalledWith(2, "token", "inc-1", "completed");
  });
});
