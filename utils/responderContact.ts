// utils/responderContact.ts
// Whether a responder has a contact number a citizen can actually call --
// the Track Responder screen's Call Responder button only works when the
// primary responder has one (see utils/callResponder.ts). Admin-provisioned
// responder accounts never pass through the citizen phone-number onboarding
// step, so the responder app checks this itself and asks for one
// (responder/components/shared/ContactNumberGate.tsx).
//
// Same rule as the backend's updateProfileSchema and app/user-profile:
// "09171234567" or "+639171234567", spaces/dashes ignored.
const PH_MOBILE_REGEX = /^(\+639\d{9}|09\d{9})$/;

export function isValidPhMobile(value: string | null | undefined): boolean {
  return PH_MOBILE_REGEX.test((value ?? "").replace(/[\s-]/g, ""));
}

// The 10 digits typed after a fixed "+63" prefix (e.g. "9171234567"), in the
// same "+63 917 123 4567" format app/phone-number.tsx saves -- or null when
// it isn't a complete PH mobile number yet.
export function toPhMobile(localDigits: string): string | null {
  const digits = localDigits.replace(/\D/g, "");
  if (!/^9\d{9}$/.test(digits)) return null;
  return `+63 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}
