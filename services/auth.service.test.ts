jest.mock("./api", () => ({
  apiPost: jest.fn(),
}));

import { apiPost } from "./api";
import {
  loginUser,
  requestRegistrationOtp,
  resendRegistrationOtp,
  verifyRegistrationOtp,
} from "./auth.service";

const mockApiPost = apiPost as jest.Mock;

const authResponse = {
  token: "our-jwt",
  user: { id: "u1", name: "Juana", email: "juana@example.com", role: "citizen" },
  isNewUser: true,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("requestRegistrationOtp", () => {
  it("posts name, email and password to request-otp and returns only the cooldown", async () => {
    mockApiPost.mockResolvedValue({ success: true, resendCooldownSeconds: 60 });

    const result = await requestRegistrationOtp("Juana", "juana@example.com", "secret123");

    expect(mockApiPost).toHaveBeenCalledWith("/api/auth/register/request-otp", {
      name: "Juana",
      email: "juana@example.com",
      password: "secret123",
    });
    expect(result).toEqual({ resendCooldownSeconds: 60 });
  });

  it("propagates backend errors such as an already-registered email", async () => {
    mockApiPost.mockRejectedValue(Object.assign(new Error("Email already registered"), { status: 409 }));
    await expect(
      requestRegistrationOtp("Juana", "juana@example.com", "secret123"),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe("resendRegistrationOtp", () => {
  it("posts only the email -- never a password", async () => {
    mockApiPost.mockResolvedValue({ success: true, resendCooldownSeconds: 60 });

    const result = await resendRegistrationOtp("juana@example.com");

    expect(mockApiPost).toHaveBeenCalledWith("/api/auth/register/resend-otp", {
      email: "juana@example.com",
    });
    expect(Object.keys(mockApiPost.mock.calls[0][1])).toEqual(["email"]);
    expect(result).toEqual({ resendCooldownSeconds: 60 });
  });

  it("propagates the backend's cooldown error", async () => {
    mockApiPost.mockRejectedValue(
      Object.assign(new Error("Please wait before requesting another code."), { status: 429 }),
    );
    await expect(resendRegistrationOtp("juana@example.com")).rejects.toMatchObject({ status: 429 });
  });
});

describe("verifyRegistrationOtp", () => {
  it("posts email and code, and returns the JWT response", async () => {
    mockApiPost.mockResolvedValue(authResponse);

    const result = await verifyRegistrationOtp("juana@example.com", "048213");

    expect(mockApiPost).toHaveBeenCalledWith("/api/auth/register/verify-otp", {
      email: "juana@example.com",
      code: "048213",
    });
    expect(result).toBe(authResponse);
  });

  it("propagates an incorrect-code error", async () => {
    mockApiPost.mockRejectedValue(Object.assign(new Error("Incorrect code"), { status: 401 }));
    await expect(verifyRegistrationOtp("juana@example.com", "000000")).rejects.toMatchObject({
      status: 401,
    });
  });
});

describe("loginUser", () => {
  it("still posts to the existing /api/auth/login", async () => {
    mockApiPost.mockResolvedValue({ token: "t", user: authResponse.user });

    await loginUser("juana@example.com", "secret123");

    expect(mockApiPost).toHaveBeenCalledWith("/api/auth/login", {
      email: "juana@example.com",
      password: "secret123",
    });
  });
});
