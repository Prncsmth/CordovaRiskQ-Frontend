import { Ionicons } from "@expo/vector-icons";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
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

export default function GoogleButton({ onError }: GoogleButtonProps) {
  const { login } = useAuth();
  const [loading, setLoading] = React.useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
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
