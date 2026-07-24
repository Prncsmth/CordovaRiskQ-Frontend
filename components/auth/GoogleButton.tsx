import { Ionicons } from "@expo/vector-icons";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";

import { useAuth } from "@/context/AuthContext";
import { googleAuth } from "@/services/auth.service";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

// Required once per app so the browser popup properly closes and
// returns control back to the app after Google redirects.
WebBrowser.maybeCompleteAuthSession();

interface GoogleButtonProps {
  onError?: (message: string) => void;
}

const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

// useAuthRequest throws synchronously if the client id for the current
// platform is missing, and hooks can't be called conditionally. So instead
// of branching inside one component, we decide here which component to
// mount: the real hook-using button only ever mounts once its platform's
// client id exists, so the hook is never invoked with a missing id.
const isConfigured = Boolean(
  Platform.OS === "android"
    ? androidClientId
    : Platform.OS === "ios"
      ? iosClientId
      : webClientId,
);

export default function GoogleButton({ onError }: GoogleButtonProps) {
  if (!isConfigured) {
    return (
      <TouchableOpacity
        style={[styles.button, styles.disabled]}
        activeOpacity={0.8}
        onPress={() =>
          onError?.(
            "Google sign-in isn't configured for this platform yet.",
          )
        }
      >
        <Ionicons
          name="logo-google"
          size={20}
          color={COLORS.google}
          style={styles.icon}
        />
        <Text style={styles.text}>Continue with Google</Text>
      </TouchableOpacity>
    );
  }

  return <GoogleAuthButton onError={onError} />;
}

function GoogleAuthButton({ onError }: GoogleButtonProps) {
  const { login } = useAuth();
  const [loading, setLoading] = React.useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId,
    androidClientId,
    webClientId,
  });

  useEffect(() => {
    async function handleResponse() {
      if (response?.type !== "success") return;

      const idToken = response.authentication?.idToken;

      if (!idToken) {
        onError?.("Google sign-in did not return a valid token.");
        return;
      }

      setLoading(true);
      try {
        const result = await googleAuth(idToken);
        await login(result.token, result.user);
      } catch (err) {
        onError?.("Google sign-in failed. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    handleResponse();
  }, [response]);

  return (
    <TouchableOpacity
      style={[styles.button, loading && styles.disabled]}
      disabled={!request || loading}
      activeOpacity={0.8}
      onPress={() => promptAsync()}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.text} />
      ) : (
        <>
          <Ionicons
            name="logo-google"
            size={20}
            color={COLORS.google}
            style={styles.icon}
          />
          <Text style={styles.text}>Continue with Google</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    height: 56,
    flexDirection: "row",

    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,

    borderRadius: RADIUS.md,

    alignItems: "center",
    justifyContent: "center",

    marginTop: SPACING.sm,
  },

  disabled: {
    opacity: 0.6,
  },

  icon: {
    marginRight: SPACING.xs,
  },

  text: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.body,
    fontWeight: "600",
  },
});
