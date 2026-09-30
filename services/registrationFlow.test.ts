import {
  RESEND_COOLDOWN_SECONDS,
  describeRegistrationError,
  requestRegistration,
  resendVerificationCode,
  sanitizeOtpInput,
  shouldAllowImmediateResend,
  submitVerificationCode,
  validateRegistration,
  type RegistrationDeps,
  type ResendDeps,
  type VerificationDeps,
} from "./registrationFlow";

function apiError(message: string, status: number) {
  return Object.assign(new Error(message), { status });
}

const validInput = {
  name: "Juana Dela Cruz",
  email: "juana@yahoo.com",
  password: "secret123",
  confirmPassword: "secret123",
};

const backendResponse = {
  token: "our-jwt",
  user: { id: "u1", name: "Juana Dela Cruz", email: "juana@yahoo.com", role: "citizen" as const },
  isNewUser: true,
};

function makeRegistrationDeps(overrides: Partial<RegistrationDeps> = {}): RegistrationDeps {
  return {
    requestRegistrationOtp: jest.fn().mockResolvedValue({ resendCooldownSeconds: 60 }),
    ...overrides,
  };
}

function makeVerificationDeps(overrides: Partial<VerificationDeps> = {}): VerificationDeps {
  return {
    verifyRegistrationOtp: jest.fn().mockResolvedValue(backendResponse),
    login: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeResendDeps(overrides: Partial<ResendDeps> = {}): ResendDeps {
  return {
    resendRegistrationOtp: jest.fn().mockResolvedValue({ resendCooldownSeconds: 60 }),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// register.tsx logic
// ---------------------------------------------------------------------------

describe("validateRegistration", () => {
  it("accepts a valid registration", () => {
    expect(validateRegistration(validInput)).toBeNull();
  });

  it("does not restrict registration to Gmail addresses", () => {
    for (const email of ["juana@yahoo.com", "juana@outlook.com", "juana@cordova.gov.ph"]) {
      expect(validateRegistration({ ...validInput, email })).toBeNull();
    }
  });

  it("requires every field", () => {
    expect(validateRegistration({ ...validInput, name: "  " })).toBe("Please fill in all fields.");
    expect(validateRegistration({ ...validInput, email: "" })).toBe("Please fill in all fields.");
    expect(validateRegistration({ ...validInput, password: "" })).toBe("Please fill in all fields.");
    expect(validateRegistration({ ...validInput, confirmPassword: "" })).toBe(
      "Please fill in all fields.",
    );
  });

  it("rejects a malformed email", () => {
    expect(validateRegistration({ ...validInput, email: "juana@" })).toBe(
      "Please enter a valid email address.",
    );
  });

  it("requires at least 6 password characters", () => {
    expect(
      validateRegistration({ ...validInput, password: "12345", confirmPassword: "12345" }),
    ).toBe("Password must be at least 6 characters.");
  });

  it("requires the confirmation to match", () => {
    expect(validateRegistration({ ...validInput, confirmPassword: "secret124" })).toBe(
      "Passwords do not match.",
    );
  });
});

describe("requestRegistration", () => {
  it("asks the backend to email a code for the trimmed name, email and password", async () => {
    const deps = makeRegistrationDeps();

    await requestRegistration(
      { ...validInput, name: " Juana Dela Cruz ", email: "  juana@yahoo.com " },
      deps,
    );

    expect(deps.requestRegistrationOtp).toHaveBeenCalledWith(
      "Juana Dela Cruz",
      "juana@yahoo.com",
      "secret123",
    );
  });

  it("returns only what the verify screen needs -- never the password", async () => {
    const result = await requestRegistration(validInput, makeRegistrationDeps());

    expect(result).toEqual({ email: "juana@yahoo.com", resendCooldownSeconds: 60 });
    expect(JSON.stringify(result)).not.toContain("secret123");
  });

  it("propagates backend errors so the register screen can show them", async () => {
    const deps = makeRegistrationDeps({
      requestRegistrationOtp: jest.fn().mockRejectedValue(apiError("Email already registered", 409)),
    });
    await expect(requestRegistration(validInput, deps)).rejects.toMatchObject({ status: 409 });
  });
});

// ---------------------------------------------------------------------------
// verify-email.tsx logic
// ---------------------------------------------------------------------------

describe("sanitizeOtpInput", () => {
  it("keeps only digits, at most 6", () => {
    expect(sanitizeOtpInput("12a-34 5678")).toBe("123456");
    expect(sanitizeOtpInput("04 82")).toBe("0482");
  });
});

describe("submitVerificationCode", () => {
  it("rejects anything but exactly 6 digits without calling the backend", async () => {
    const deps = makeVerificationDeps();
    for (const code of ["", "12345", "1234567", "12a456"]) {
      await expect(submitVerificationCode("juana@yahoo.com", code, deps)).resolves.toEqual({
        status: "invalid-input",
        message: "Enter the 6-digit code.",
      });
    }
    expect(deps.verifyRegistrationOtp).not.toHaveBeenCalled();
    expect(deps.login).not.toHaveBeenCalled();
  });

  it("verifies with the email and code", async () => {
    const deps = makeVerificationDeps();
    await submitVerificationCode("juana@yahoo.com", " 048213 ", deps);
    expect(deps.verifyRegistrationOtp).toHaveBeenCalledWith("juana@yahoo.com", "048213");
  });

  it("starts the existing JWT session with onboarding for the new account", async () => {
    const deps = makeVerificationDeps();

    const result = await submitVerificationCode("juana@yahoo.com", "048213", deps);

    expect(result).toEqual({ status: "signed-in" });
    expect(deps.login).toHaveBeenCalledWith("our-jwt", backendResponse.user, true);
  });

  it.each([
    ["an incorrect code", apiError("Incorrect code", 401)],
    ["an expired code", apiError("Code has expired. Request a new one.", 410)],
    ["too many attempts", apiError("Too many attempts. Request a new code.", 429)],
    ["a network failure", new Error("Network request failed")],
  ])("propagates %s without creating a session", async (_label, failure) => {
    const deps = makeVerificationDeps({
      verifyRegistrationOtp: jest.fn().mockRejectedValue(failure),
    });

    await expect(submitVerificationCode("juana@yahoo.com", "048213", deps)).rejects.toBe(failure);
    expect(deps.login).not.toHaveBeenCalled();
  });
});

describe("resendVerificationCode", () => {
  it("defaults the countdown to 60 seconds", () => {
    expect(RESEND_COOLDOWN_SECONDS).toBe(60);
  });

  it("requests a new code with only the email and returns the backend's cooldown", async () => {
    const deps = makeResendDeps({
      resendRegistrationOtp: jest.fn().mockResolvedValue({ resendCooldownSeconds: 90 }),
    });

    const cooldown = await resendVerificationCode(
      "juana@yahoo.com",
      { cooldownRemaining: 0, inFlight: false },
      deps,
    );

    expect(cooldown).toBe(90);
    expect(deps.resendRegistrationOtp).toHaveBeenCalledWith("juana@yahoo.com");
  });

  it("refuses to send again while the countdown is still running", async () => {
    const deps = makeResendDeps();
    expect(
      await resendVerificationCode("juana@yahoo.com", { cooldownRemaining: 42, inFlight: false }, deps),
    ).toBeNull();
    expect(deps.resendRegistrationOtp).not.toHaveBeenCalled();
  });

  it("refuses to send while a previous resend is still in flight", async () => {
    const deps = makeResendDeps();
    expect(
      await resendVerificationCode("juana@yahoo.com", { cooldownRemaining: 0, inFlight: true }, deps),
    ).toBeNull();
    expect(deps.resendRegistrationOtp).not.toHaveBeenCalled();
  });

  it("propagates the backend's own cooldown (429) instead of reporting success", async () => {
    const deps = makeResendDeps({
      resendRegistrationOtp: jest
        .fn()
        .mockRejectedValue(apiError("Please wait before requesting another code.", 429)),
    });
    await expect(
      resendVerificationCode("juana@yahoo.com", { cooldownRemaining: 0, inFlight: false }, deps),
    ).rejects.toMatchObject({ status: 429 });
  });
});

describe("shouldAllowImmediateResend", () => {
  it("is true once the current code is dead", () => {
    expect(shouldAllowImmediateResend(apiError("expired", 410))).toBe(true);
    expect(shouldAllowImmediateResend(apiError("too many", 429))).toBe(true);
  });

  it("is false for a plain wrong code or a network error", () => {
    expect(shouldAllowImmediateResend(apiError("Incorrect code", 401))).toBe(false);
    expect(shouldAllowImmediateResend(new Error("Network request failed"))).toBe(false);
  });
});

describe("describeRegistrationError", () => {
  it("shows the backend's registration messages as-is", () => {
    expect(describeRegistrationError(apiError("Incorrect code", 401))).toBe("Incorrect code");
    expect(describeRegistrationError(apiError("Email already registered", 409))).toBe(
      "Email already registered",
    );
  });

  it("replaces fetch's raw offline error with a friendly message", () => {
    expect(describeRegistrationError(new Error("Network request failed"))).toBe(
      "Network error. Check your connection and try again.",
    );
  });

  it("falls back to a generic message for non-errors", () => {
    expect(describeRegistrationError("boom")).toBe("Something went wrong. Please try again.");
  });
});
