import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/context/AuthContext";
import { getProfile, removeAvatar, uploadAvatar } from "@/services/user.service";

import * as authStorage from "./authStorage";

// Where the photo lived before it was saved to the account (device-only,
// and shared by every account on the phone). Cleared, never uploaded: it
// was picked back when it never left the phone.
const LEGACY_PHOTO_URI_KEY = "profile_photo_uri";

type ProfilePhotoContextValue = {
  // The signed-in account's photo URL (Cloudinary), or null for none.
  photoUri: string | null;
  isLoading: boolean;
  // True while a new photo uploads or the current one is being removed.
  isSaving: boolean;
  // Uploads `uri` as the profile photo (or removes it for null). Throws when
  // it didn't save, so the caller can say so; the shown photo only changes
  // on success.
  setPhotoUri: (uri: string | null) => Promise<void>;
};

const ProfilePhotoContext = createContext<ProfilePhotoContextValue | undefined>(
  undefined,
);

// The profile photo belongs to the account (GET /users/me's avatarUrl), so
// it follows the user to another phone, and others can see it where the
// backend allows: a responder's to the citizens they're helping, a
// citizen's (optional) to the responders on their report.
export function ProfilePhotoProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [photoUri, setPhotoUriState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    authStorage.deleteItem(LEGACY_PHOTO_URI_KEY).catch(() => {});
  }, []);

  useEffect(() => {
    if (!token) {
      // Resetting on logout, same pattern as NotificationContext.tsx --
      // reacts to an external change, so it can't be derived.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhotoUriState(null);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    getProfile(token)
      .then((profile) => {
        if (!cancelled) setPhotoUriState(profile.avatarUrl ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const setPhotoUri = useCallback(
    async (uri: string | null) => {
      if (!token) throw new Error("Sign in to change your profile photo.");
      setIsSaving(true);
      try {
        if (uri) {
          setPhotoUriState(await uploadAvatar(token, uri));
        } else {
          await removeAvatar(token);
          setPhotoUriState(null);
        }
      } finally {
        setIsSaving(false);
      }
    },
    [token],
  );

  const value = useMemo(
    () => ({ photoUri, isLoading, isSaving, setPhotoUri }),
    [photoUri, isLoading, isSaving, setPhotoUri],
  );

  return (
    <ProfilePhotoContext.Provider value={value}>
      {children}
    </ProfilePhotoContext.Provider>
  );
}

export function useProfilePhoto() {
  const context = useContext(ProfilePhotoContext);

  if (!context) {
    throw new Error("useProfilePhoto must be used within a ProfilePhotoProvider");
  }

  return context;
}
