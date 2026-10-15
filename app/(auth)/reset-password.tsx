import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AuthHeader from "@/components/auth/AuthHeader";
import AuthInput from "@/components/auth/AuthInput";
import PrimaryButton from "@/components/auth/PrimaryButton";
import PasswordRequirements from "@/components/change-password/PasswordRequirements";
import PasswordStrengthMeter from "@/components/change-password/PasswordStrengthMeter";
import BackButton from "@/components/common/BackButton";
import KeyboardSafeView from "@/components/common/KeyboardSafeView";
import { resetPassword } from "@/services/auth.service";
import { describePasswordResetError, submitPasswordReset } from "@/services/passwordResetFlow";
import { clearVerifiedResetCode, getVerifiedResetCode } from "@/services/passwordResetSession";
import {
  RADIUS,
  SPACING,
  TYPOGRAPHY,
  useIsDarkTheme,
  useThemeColors,
  type ColorPalette,
} from "@/theme";
import { scrollToEndWhenKeyboardReady } from "@/utils/scrollOnKeyboard";

// Step 3 of password reset: the new password. The code was already checked
// on reset-code.tsx and arrives in memory (services/passwordResetSession.ts);
// it is sent again here, and the backend only uses it up now. Success goes to
// password-reset-success.tsx and does not log in.
export default function ResetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const COLORS = useThemeColors();
  const isDark = useIsDarkTheme();
  const styles = useMemo(() => createStyles(COLORS, isDark), [COLORS, isDark]);
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code] = useState(() => getVerifiedResetCode(email));

  const scrollViewRef = useRef<ScrollView>(null);

  // Same as register.tsx: brings Confirm New Password up above the
  // keyboard, whether it's just opening or already open (see
  // utils/scrollOnKeyboard.ts).
  function scrollToEndOnceKeyboardShown() {
    scrollToEndWhenKeyboardReady(Keyboard, () =>
      scrollViewRef.current?.scrollToEnd({ animated: true }),
    );
  }

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Nothing verified for this email (e.g. the app restarted on this screen):
  // send the user back to enter the code again.
  useEffect(() => {
    if (!code) router.replace({ pathname: "/reset-code", params: { email } });
  }, [code, email, router]);

  async function handleReset() {
    if (!code) return;
    setError(null);
    setLoading(true);
    try {
      const result = await submitPasswordReset(
        email,
        { code, newPassword, confirmPassword },
        { resetPassword },
      );
      if (result.status === "invalid-input") {
        setError(result.message);
      } else {
        clearVerifiedResetCode();
        // replace, not push: Back from the success screen must not return
        // to a reset form whose code is already used up.
        router.replace("/password-reset-success");
      }
    } catch (err) {
      setError(describePasswordResetError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardSafeView style={styles.flex}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + SPACING.md },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <BackButton onPress={() => router.back()} style={styles.back} />

        <AuthHeader
          title="Create New Password"
          subtitle="Choose a strong password you haven't used before."
        />

        <AuthInput
          label="New Password"
          placeholder="Enter your new password"
          secureTextEntry
          secureToggle
          value={newPassword}
          onChangeText={setNewPassword}
        />
        {newPassword ? (
          <View style={styles.strengthCard}>
            <PasswordStrengthMeter password={newPassword} />
            <View style={styles.strengthDivider} />
            <PasswordRequirements password={newPassword} />
          </View>
        ) : null}

        <AuthInput
          label="Confirm New Password"
          placeholder="Re-enter your new password"
          secureTextEntry
          secureToggle
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          onFocus={scrollToEndOnceKeyboardShown}
        />

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <PrimaryButton title="Reset Password" loading={loading} onPress={handleReset} />
        </View>
      </ScrollView>
    </KeyboardSafeView>
  );
}

function createStyles(COLORS: ColorPalette, isDark: boolean) {
  return StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: COLORS.background,
    },

    // Pinned to the bottom of the screen on every auth screen (pushed down by
    // the auto margin), so the primary button sits in the same place whether
    // the form above is short or long.
    actions: {
      marginTop: "auto",
      paddingTop: SPACING.lg,
    },

    container: {
      flexGrow: 1,
      justifyContent: "flex-start",
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.xl,
    },

    back: {
      marginBottom: SPACING.lg,
    },

    strengthCard: {
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.md,
      padding: SPACING.sm + 2,
      gap: SPACING.xs,
      marginBottom: SPACING.sm,
    },

    strengthDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: COLORS.borderMuted,
    },

    errorBanner: {
      backgroundColor: `${COLORS.danger}${isDark ? "26" : "14"}`,
      borderRadius: RADIUS.md,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      marginBottom: SPACING.sm,
    },

    error: {
      color: COLORS.danger,
      fontSize: TYPOGRAPHY.caption,
      fontWeight: "600",
    },
  });
}
