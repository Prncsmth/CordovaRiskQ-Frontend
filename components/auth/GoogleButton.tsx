import { Ionicons } from "@expo/vector-icons";
import * as Google from "expo-auth-session/providers/google";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useAuth } from "@/context/AuthContext";
import { googleAuth } from "@/services/auth.service";
import {
  RADIUS,
  SHADOW,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";

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

function GoogleButtonShell({
  disabled,
  onPress,
  children,
}: {
  disabled?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const COLORS = useThemeColors();
  const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={[styles.button, disabled && styles.disabled]}
        disabled={disabled}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        onPressIn={() => {
          scale.value = withTiming(0.97, { duration: 100 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 100 });
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export default function GoogleButton({ onError }: GoogleButtonProps) {
  const COLORS = useThemeColors();
  const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);

  if (!isConfigured) {
    return (
      <GoogleButtonShell
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
      </GoogleButtonShell>
    );
  }

  return <GoogleAuthButton onError={onError} />;
}

function GoogleAuthButton({ onError }: GoogleButtonProps) {
  const { login } = useAuth();
  const COLORS = useThemeColors();
  const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);
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
        await login(result.token, result.user, result.isNewUser);
      } catch (err) {
        onError?.("Google sign-in failed. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    handleResponse();
  }, [response]);

  return (
    <GoogleButtonShell
      disabled={!request || loading}
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
    </GoogleButtonShell>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    button: {
      width: "100%",
      height: 56,
      flexDirection: "row",

      // Was hardcoded COLORS.white -- fixed white would strand the dynamic
      // (near-white in dark mode) COLORS.text label on a white background.
      // COLORS.surface keeps the light-mode look (off-white) while giving
      // dark mode a proper dark card the light text can sit on.
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,

      borderRadius: RADIUS.md,

      alignItems: "center",
      justifyContent: "center",

      marginTop: SPACING.sm,

      ...SHADOW,
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
}
