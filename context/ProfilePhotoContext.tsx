import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import * as authStorage from "./authStorage";

const PHOTO_URI_KEY = "profile_photo_uri";

type ProfilePhotoContextValue = {
  photoUri: string | null;
  isLoading: boolean;
  setPhotoUri: (uri: string | null) => Promise<void>;
};

const ProfilePhotoContext = createContext<ProfilePhotoContextValue | undefined>(
  undefined,
);

// Local-device-only for now: the backend has no avatar-upload endpoint yet,
// so the picked photo's URI is persisted with SecureStore (a short string,
// well within its size limit) rather than sent to a server. Swap the setter
// below for a real upload call once that endpoint exists.
export function ProfilePhotoProvider({ children }: { children: React.ReactNode }) {
  const [photoUri, setPhotoUriState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authStorage
      .getItem(PHOTO_URI_KEY)
      .then((uri) => setPhotoUriState(uri))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const value = useMemo(
    () => ({
      photoUri,
      isLoading,
      setPhotoUri: async (uri: string | null) => {
        setPhotoUriState(uri);
        if (uri) {
          await authStorage.setItem(PHOTO_URI_KEY, uri);
        } else {
          await authStorage.deleteItem(PHOTO_URI_KEY);
        }
      },
    }),
    [photoUri, isLoading],
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
