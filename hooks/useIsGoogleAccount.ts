// hooks/useIsGoogleAccount.ts
// Whether the signed-in account signs in with Google -- either Google-only,
// or an email/password account that was later linked to Google. The Profile
// and Settings screens show its password row as "Password (Google Account)"
// instead of "Change Password".
//
// null while unknown (still loading, or the check failed) -- callers treat
// that as "not Google" so the familiar row shows by default.
import { useEffect, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { getProfile, type UserProfile } from "@/services/user.service";

// Cached per token so a second screen asking (Profile, then Settings) starts
// with the answer instead of refetching /users/me and flickering the row.
const cache = new Map<string, boolean>();

function isGoogle(profile: UserProfile): boolean {
  // A backend from before isGoogleAccount still tells a Google-only account
  // apart by its missing password.
  return profile.isGoogleAccount ?? profile.hasPassword === false;
}

export function useIsGoogleAccount(): boolean | null {
  const { token } = useAuth();
  // The result lives in React state, keyed by the token it belongs to. It
  // must not be read straight from the module-level cache during render:
  // this app runs the React Compiler (app.json "reactCompiler"), which
  // memoizes a render-time read of that mutable Map on `token` alone, so the
  // row would never update once the fetch landed.
  const [result, setResult] = useState<{ token: string; value: boolean } | null>(() => {
    if (!token) return null;
    const cached = cache.get(token);
    return cached === undefined ? null : { token, value: cached };
  });

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    const cached = cache.get(token);
    if (cached !== undefined) {
      // Deferred like the fetch below rather than set synchronously here.
      Promise.resolve().then(() => {
        if (!cancelled) setResult({ token, value: cached });
      });
    } else {
      getProfile(token)
        .then((profile) => {
          const value = isGoogle(profile);
          cache.set(token, value);
          if (!cancelled) setResult({ token, value });
        })
        .catch(() => {
          // Stays unknown (null); the next screen visit retries.
        });
    }
    return () => {
      cancelled = true;
    };
  }, [token]);

  return result && result.token === token ? result.value : null;
}
