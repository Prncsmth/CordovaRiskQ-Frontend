jest.mock("./api", () => ({
  apiGet: jest.fn(),
}));

import { apiGet } from "./api";
import {
  getActiveAnnouncement,
  getActiveResponderAnnouncement,
  getAnnouncementById,
} from "./advisory.service";

const mockApiGet = apiGet as jest.Mock;

const announcement = {
  id: "a1",
  title: "Road closure",
  content: "Main road closed until 5 PM.",
  priority: "Normal",
  createdAt: "2026-10-04T08:00:00.000Z",
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("getActiveAnnouncement (citizen home)", () => {
  it("uses the public endpoint with no token", async () => {
    mockApiGet.mockResolvedValue({ success: true, announcement });

    const result = await getActiveAnnouncement();

    expect(mockApiGet).toHaveBeenCalledWith("/api/announcements/active");
    expect(result).toBe(announcement);
  });

  it("never calls the responder endpoint", async () => {
    mockApiGet.mockResolvedValue({ success: true, announcement: null });

    await getActiveAnnouncement("Poblacion");

    expect(mockApiGet).toHaveBeenCalledWith("/api/announcements/active?barangay=Poblacion");
    expect(mockApiGet.mock.calls[0][0]).not.toContain("/responder");
  });
});

describe("getActiveResponderAnnouncement (responder dashboard)", () => {
  it("calls the authenticated responder endpoint with the token", async () => {
    mockApiGet.mockResolvedValue({ success: true, announcement });

    const result = await getActiveResponderAnnouncement("responder-jwt");

    expect(mockApiGet).toHaveBeenCalledWith("/api/announcements/active/responder", "responder-jwt");
    expect(result).toBe(announcement);
  });

  it("returns null when there is no announcement", async () => {
    mockApiGet.mockResolvedValue({ success: true, announcement: null });

    await expect(getActiveResponderAnnouncement("responder-jwt")).resolves.toBeNull();
  });
});

describe("getAnnouncementById (Announcement Details)", () => {
  it("sends the signed-in user's token, so a responder can open a Responders Only announcement", async () => {
    mockApiGet.mockResolvedValue({ success: true, announcement });

    const result = await getAnnouncementById("a1", "responder-jwt");

    expect(mockApiGet).toHaveBeenCalledWith("/api/announcements/a1", "responder-jwt");
    expect(result).toBe(announcement);
  });

  it("still works signed out, with no token", async () => {
    mockApiGet.mockResolvedValue({ success: true, announcement });

    await getAnnouncementById("a1", null);

    expect(mockApiGet).toHaveBeenCalledWith("/api/announcements/a1", undefined);
  });

  it("treats the backend's 404 for a hidden or missing announcement as not found", async () => {
    mockApiGet.mockRejectedValue(Object.assign(new Error("Announcement not found"), { status: 404 }));

    await expect(getAnnouncementById("a1", "citizen-jwt")).resolves.toBeUndefined();
  });
});
