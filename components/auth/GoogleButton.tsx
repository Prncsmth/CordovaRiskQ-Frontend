import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import * as Haptics from "expo-haptics";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

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

interface GoogleButtonProps {
  onError?: (message: string) => void;
}

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const isConfigured = Boolean(webClientId);

// GoogleSignin.configure() is synchronous and idempotent -- calling it once
// at module scope (app load) instead of inside the component avoids
// re-configuring on every mount of the login screen. Native Google Sign-In
// (Play Services on Android) replaces the old expo-auth-session browser-
// redirect flow, which Google blocks for custom URI schemes regardless of
// how correctly the OAuth client is configured ("Custom URI scheme is not
// enabled for your Android client"). webClientId is required here (not the
// Android client id) so the returned idToken's audience is verifiable by
// the backend's existing /api/auth/google check -- the Android OAuth
// client's role is now just app attestation (package name + SHA-1),
// handled entirely by Google Play Services, not referenced in JS.
if (isConfigured) {
  GoogleSignin.configure({ webClientId });
}

// Google's actual multi-color "G" logomark -- a single-color glyph (the old
// Ionicons "logo-google", tinted with COLORS.google) read as an unexplained
// red icon since it dropped Google's own brand colors entirely.
function GoogleLogo({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
      <Path
        fill="#4285F4"
        d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4818h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.6154z"
      />
      <Path
        fill="#34A853"
        d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8059.5399-1.8368.8586-3.0477.8586-2.344 0-4.3282-1.5831-5.036-3.7104H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z"
      />
      <Path
        fill="#FBBC05"
        d="M3.964 10.71c-.18-.5399-.2822-1.1168-.2822-1.71s.1023-1.1701.2822-1.71V4.9582H.9573C.3477 6.1732 0 7.5477 0 9s.3477 2.8268.9573 4.0418L3.964 10.71z"
      />
      <Path
        fill="#EA4335"
        d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.656 3.5795 9 3.5795z"
      />
    </Svg>
  );
}

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
  const { login } = useAuth();
  const COLORS = useThemeColors();
  const styles = React.useMemo(() => createStyles(COLORS), [COLORS]);
  const [loading, setLoading] = React.useState(false);

  const handlePress = async () => {
    if (!isConfigured) {
      onError?.("Google sign-in isn't configured for this platform yet.");
      return;
    }

    setLoading(true);
    try {
      // Credential Manager (this library's Android backend) silently
      // re-selects the last-used account instead of showing the picker once
      // one has already been chosen on this device -- signing out first
      // clears that remembered selection so the account chooser always
      // appears, letting the user pick a different Google account each time.
      try {
        await GoogleSignin.signOut();
      } catch {
        // No active session to sign out of -- fine, proceed to sign in.
      }

      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse(response)) {
        // User backed out of the account picker -- not an error.
        return;
      }

      const idToken = response.data.idToken;
      if (!idToken) {
        onError?.("Google sign-in did not return a valid token.");
        return;
      }

      const result = await googleAuth(idToken);
      await login(result.token, result.user, result.isNewUser);
    } catch (err) {
      if (isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }
      onError?.("Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <GoogleButtonShell disabled={loading} onPress={handlePress}>
      {loading ? (
        <ActivityIndicator color={COLORS.text} />
      ) : (
        <>
          <View style={styles.icon}>
            <GoogleLogo size={20} />
          </View>
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
