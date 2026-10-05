jest.mock("./api", () => ({
  apiGet: jest.fn(),
  apiPatch: jest.fn(),
  apiPost: jest.fn(),
  apiPut: jest.fn(),
}));

import { apiPost, apiPut } from "./api";
import { changePassword, updateProfile } from "./user.service";

const mockApiPost = apiPost as jest.Mock;
const mockApiPut = apiPut as jest.Mock;

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

describe("updateProfile", () => {
  it("saves name and mobile without sending an email (the email is read-only)", async () => {
    const user = { id: "u1", name: "Juana Cruz", email: "juana@gmail.com", mobile: "09171234567" };
    mockApiPut.mockResolvedValue({ success: true, user });

    const result = await updateProfile("jwt", { name: "Juana Cruz", mobile: "09171234567" });

    expect(mockApiPut).toHaveBeenCalledWith(
      "/api/users/me",
      { name: "Juana Cruz", mobile: "09171234567" },
      "jwt",
    );
    expect(mockApiPut.mock.calls[0][1]).not.toHaveProperty("email");
    expect(result).toBe(user);
  });

  it("surfaces the backend's refusal if a different email is ever sent", async () => {
    mockApiPut.mockRejectedValue(
      Object.assign(new Error("Your email address can't be changed."), { status: 403 }),
    );

    await expect(
      updateProfile("jwt", { name: "Juana", email: "someone-else@gmail.com" }),
    ).rejects.toMatchObject({ status: 403 });
  });
});
