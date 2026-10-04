jest.mock("./api", () => ({
  apiPost: jest.fn(),
}));

import { apiPost } from "./api";
import {
  loginUser,
  requestPasswordReset,
  requestRegistrationOtp,
  resendRegistrationOtp,
  resetPassword,
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

describe("requestPasswordReset", () => {
  it("posts only the email to forgot-password and returns the generic message and cooldown", async () => {
    mockApiPost.mockResolvedValue({
      success: true,
      message: "If an account exists, a password reset code has been sent to your email.",
      resendCooldownSeconds: 60,
    });

    const result = await requestPasswordReset("juana@example.com");

    expect(mockApiPost).toHaveBeenCalledWith("/api/auth/forgot-password", { email: "juana@example.com" });
    expect(result).toEqual({
      message: "If an account exists, a password reset code has been sent to your email.",
      resendCooldownSeconds: 60,
    });
  });
});

describe("resetPassword", () => {
  it("posts email, code and newPassword to reset-password", async () => {
    mockApiPost.mockResolvedValue({ success: true, message: "Your password has been reset. You can now log in." });

    const result = await resetPassword("juana@example.com", "048213", "NewPass1!");

    expect(mockApiPost).toHaveBeenCalledWith("/api/auth/reset-password", {
      email: "juana@example.com",
      code: "048213",
      newPassword: "NewPass1!",
    });
    expect(result).toEqual({ message: "Your password has been reset. You can now log in." });
  });

  it("propagates the generic invalid-code error", async () => {
    mockApiPost.mockRejectedValue(
      Object.assign(new Error("Invalid or expired code. Request a new one."), { status: 400 }),
    );
    await expect(resetPassword("juana@example.com", "000000", "NewPass1!")).rejects.toMatchObject({
      status: 400,
    });
  });
});
