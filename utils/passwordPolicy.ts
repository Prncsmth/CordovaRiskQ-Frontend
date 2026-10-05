// utils/passwordPolicy.ts
// Single source of truth for the password rule, shared by registration
// (services/registrationFlow.ts) and change-password
// (app/change-password/index.tsx), plus the two checklist/strength display
// components -- so all four never drift from each other. Matches the
// backend's own schema exactly (src/validations/password.schema.ts).
// 8-64, per NIST SP 800-63B (allow at least 64). 64 also stays under
// bcrypt's 72-byte input limit on the backend, which silently ignores
// anything past it.
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;
// The backend also caps passwords at bcrypt's 72 BYTES (past that bcrypt
// silently ignores the rest). Plain letters, numbers and symbols are one
// byte each, so this only matters for emoji or other multi-byte characters.
export const PASSWORD_MAX_BYTES = 72;

// UTF-8 byte length, counted by hand (no TextEncoder dependency): one byte
// for ASCII, two/three for most other characters, four for emoji.
export function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
  }
  return bytes;
}

export type PasswordRequirement = {
  key: string;
  label: string;
  met: boolean;
};

export function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    {
      key: "length",
      label: `${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters`,
      // Matches the backend exactly, including its 72-byte cap, so the
      // checklist never shows a password as OK that the server rejects.
      met:
        password.length >= PASSWORD_MIN_LENGTH &&
        password.length <= PASSWORD_MAX_LENGTH &&
        utf8ByteLength(password) <= PASSWORD_MAX_BYTES,
    },
    { key: "uppercase", label: "An uppercase letter", met: /[A-Z]/.test(password) },
    { key: "lowercase", label: "A lowercase letter", met: /[a-z]/.test(password) },
    { key: "number", label: "A number", met: /\d/.test(password) },
    { key: "symbol", label: "A symbol", met: /[^A-Za-z0-9]/.test(password) },
  ];
}

export function isPasswordValid(password: string): boolean {
  return getPasswordRequirements(password).every((requirement) => requirement.met);
}

export const PASSWORD_REQUIREMENTS_MESSAGE =
  `Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters, with an uppercase letter, a lowercase letter, a number, and a symbol.`;
