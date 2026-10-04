// The backend client is mocked so these tests can prove what is (and isn't)
// called -- in particular that reset never logs anyone in.
jest.mock("./auth.service", () => ({
  loginUser: jest.fn(),
  requestPasswordReset: jest.fn(),
  resetPassword: jest.fn(),
}));

import * as AuthService from "./auth.service";
import {
  describePasswordResetError,
  requestResetCode,
  resendResetCode,
  submitPasswordReset,
  validateForgotPasswordEmail,
  validatePasswordReset,
  type RequestResetDeps,
  type SubmitResetDeps,
} from "./passwordResetFlow";

function apiError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}

const GENERIC = {
  message: "If an account exists, a password reset code has been sent to your email.",
  resendCooldownSeconds: 60,
};

function makeRequestDeps(overrides: Partial<RequestResetDeps> = {}): RequestResetDeps {
  return { requestPasswordReset: jest.fn().mockResolvedValue(GENERIC), ...overrides };
}

function makeSubmitDeps(overrides: Partial<SubmitResetDeps> = {}): SubmitResetDeps {
  return {
    resetPassword: jest
      .fn()
      .mockResolvedValue({ message: "Your password has been reset. You can now log in." }),
    ...overrides,
  };
}

const validReset = { code: "048213", newPassword: "NewPass1!", confirmPassword: "NewPass1!" };

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// forgot-password.tsx logic
// ---------------------------------------------------------------------------

describe("validateForgotPasswordEmail", () => {
  it("accepts a valid email", () => {
    expect(validateForgotPasswordEmail(" juana@yahoo.com ")).toBeNull();
  });

  it("requires an email", () => {
    expect(validateForgotPasswordEmail("   ")).toBe("Please enter your email address.");
  });

  it("rejects a malformed email", () => {
    expect(validateForgotPasswordEmail("juana@")).toBe("Please enter a valid email address.");
  });
});

describe("requestResetCode", () => {
  it("asks the backend for a code with the trimmed email", async () => {
    const deps = makeRequestDeps();

    const result = await requestResetCode("  juana@yahoo.com ", deps);

    expect(deps.requestPasswordReset).toHaveBeenCalledWith("juana@yahoo.com");
    expect(result).toEqual({ email: "juana@yahoo.com", resendCooldownSeconds: 60 });
  });

  it("always moves on to the reset screen -- the response never reveals whether the account exists", async () => {
    // The backend answers identically for real, unknown and Google-only
    // emails; the app must not branch on anything account-specific.
    const deps = makeRequestDeps();
    const known = await requestResetCode("juana@yahoo.com", deps);
    const unknown = await requestResetCode("nobody@yahoo.com", deps);
    expect(Object.keys(known)).toEqual(Object.keys(unknown));
  });

  it("falls back to a 60-second countdown if the backend omits it", async () => {
    const deps = makeRequestDeps({
      requestPasswordReset: jest.fn().mockResolvedValue({ message: GENERIC.message }),
    });
    const result = await requestResetCode("juana@yahoo.com", deps);
    expect(result.resendCooldownSeconds).toBe(60);
  });

  it("propagates network and rate-limit errors", async () => {
    const deps = makeRequestDeps({
      requestPasswordReset: jest
        .fn()
        .mockRejectedValue(apiError("Too many verification code requests. Please try again in a few minutes.", 429)),
    });
    await expect(requestResetCode("juana@yahoo.com", deps)).rejects.toMatchObject({ status: 429 });
  });
});

// ---------------------------------------------------------------------------
// reset-password.tsx logic
// ---------------------------------------------------------------------------

describe("validatePasswordReset", () => {
  it("accepts a valid reset", () => {
    expect(validatePasswordReset(validReset)).toBeNull();
  });

  it("requires every field", () => {
    expect(validatePasswordReset({ ...validReset, code: "" })).toBe("Please fill in all fields.");
    expect(validatePasswordReset({ ...validReset, newPassword: "" })).toBe("Please fill in all fields.");
    expect(validatePasswordReset({ ...validReset, confirmPassword: "" })).toBe(
      "Please fill in all fields.",
    );
  });

  it("requires exactly 6 digits for the code", () => {
    for (const code of ["12345", "1234567", "12a456"]) {
      expect(validatePasswordReset({ ...validReset, code })).toBe("Enter the 6-digit code.");
    }
  });

  it("enforces the shared password rule", () => {
    for (const newPassword of ["Ab1!", "Abcdefgh1!xyz", "newpass1!", "NEWPASS1!", "NewPass!!", "NewPass11"]) {
      expect(
        validatePasswordReset({ ...validReset, newPassword, confirmPassword: newPassword }),
      ).toBe(
        "Password must be 8-12 characters, with an uppercase letter, a lowercase letter, a number, and a symbol.",
      );
    }
  });

  it("requires the confirmation to match", () => {
    expect(validatePasswordReset({ ...validReset, confirmPassword: "NewPass2!" })).toBe(
      "Passwords do not match.",
    );
  });
});

describe("submitPasswordReset", () => {
  it("does not call the backend for invalid input", async () => {
    const deps = makeSubmitDeps();

    const result = await submitPasswordReset(
      "juana@yahoo.com",
      { ...validReset, confirmPassword: "nope" },
      deps,
    );

    expect(result).toEqual({ status: "invalid-input", message: "Passwords do not match." });
    expect(deps.resetPassword).not.toHaveBeenCalled();
  });

  it("sends email, code and new password, and reports success", async () => {
    const deps = makeSubmitDeps();

    const result = await submitPasswordReset("juana@yahoo.com", { ...validReset, code: " 048213 " }, deps);

    expect(deps.resetPassword).toHaveBeenCalledWith("juana@yahoo.com", "048213", "NewPass1!");
    expect(result).toEqual({ status: "reset" });
  });

  it("never logs the user in -- they log in with the new password afterwards", async () => {
    await submitPasswordReset("juana@yahoo.com", validReset, makeSubmitDeps());
    expect(AuthService.loginUser).not.toHaveBeenCalled();
  });

  it("propagates the backend's generic invalid-code error", async () => {
    const failure = apiError("Invalid or expired code. Request a new one.", 400);
    const deps = makeSubmitDeps({ resetPassword: jest.fn().mockRejectedValue(failure) });

    await expect(submitPasswordReset("juana@yahoo.com", validReset, deps)).rejects.toBe(failure);
  });
});

describe("resendResetCode", () => {
  it("requests a new code with only the email and returns the new countdown", async () => {
    const deps = makeRequestDeps({
      requestPasswordReset: jest.fn().mockResolvedValue({ ...GENERIC, resendCooldownSeconds: 90 }),
    });

    const cooldown = await resendResetCode("juana@yahoo.com", { cooldownRemaining: 0, inFlight: false }, deps);

    expect(cooldown).toBe(90);
    expect(deps.requestPasswordReset).toHaveBeenCalledWith("juana@yahoo.com");
  });

  it("refuses to send again while the countdown is running", async () => {
    const deps = makeRequestDeps();
    expect(
      await resendResetCode("juana@yahoo.com", { cooldownRemaining: 30, inFlight: false }, deps),
    ).toBeNull();
    expect(deps.requestPasswordReset).not.toHaveBeenCalled();
  });

  it("refuses to send while a previous request is in flight", async () => {
    const deps = makeRequestDeps();
    expect(
      await resendResetCode("juana@yahoo.com", { cooldownRemaining: 0, inFlight: true }, deps),
    ).toBeNull();
    expect(deps.requestPasswordReset).not.toHaveBeenCalled();
  });
});

describe("describePasswordResetError", () => {
  it("shows the backend's (already generic) messages as-is", () => {
    expect(describePasswordResetError(apiError("Invalid or expired code. Request a new one.", 400))).toBe(
      "Invalid or expired code. Request a new one.",
    );
  });

  it("replaces fetch's raw offline error with a friendly message", () => {
    expect(describePasswordResetError(new Error("Network request failed"))).toBe(
      "Network error. Check your connection and try again.",
    );
  });

  it("falls back to a generic message for non-errors", () => {
    expect(describePasswordResetError(undefined)).toBe("Something went wrong. Please try again.");
  });
});
