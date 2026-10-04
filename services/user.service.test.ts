jest.mock("./api", () => ({
  apiGet: jest.fn(),
  apiPatch: jest.fn(),
  apiPost: jest.fn(),
  apiPut: jest.fn(),
}));

import { apiPost } from "./api";
import { changePassword } from "./user.service";

const mockApiPost = apiPost as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("changePassword", () => {
  it("returns the fresh token the backend issues for this device", async () => {
    mockApiPost.mockResolvedValue({ success: true, token: "fresh-jwt" });

    const result = await changePassword("old-jwt", { oldPassword: "OldPass1!", newPassword: "NewPass1!" });

    expect(mockApiPost).toHaveBeenCalledWith(
      "/api/users/change-password",
      { oldPassword: "OldPass1!", newPassword: "NewPass1!" },
      "old-jwt",
    );
    expect(result).toEqual({ token: "fresh-jwt" });
  });

  it("returns no token from an older backend, so the app keeps its current one", async () => {
    mockApiPost.mockResolvedValue({ success: true });

    await expect(
      changePassword("old-jwt", { oldPassword: "OldPass1!", newPassword: "NewPass1!" }),
    ).resolves.toEqual({ token: undefined });
  });

  it("propagates a wrong-old-password error", async () => {
    mockApiPost.mockRejectedValue(Object.assign(new Error("Old password is incorrect"), { status: 403 }));

    await expect(
      changePassword("old-jwt", { oldPassword: "Wrong1!x", newPassword: "NewPass1!" }),
    ).rejects.toMatchObject({ status: 403 });
  });
});
