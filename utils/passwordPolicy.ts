// utils/passwordPolicy.ts
// Single source of truth for the password rule, shared by registration
// (services/registrationFlow.ts) and change-password
// (app/change-password/index.tsx), plus the two checklist/strength display
// components -- so all four never drift from each other. Matches the
// backend's own schema exactly (src/validations/password.schema.ts).
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 12;

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
      met: password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH,
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
