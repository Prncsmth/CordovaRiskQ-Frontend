import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AuthFooter from "@/components/auth/AuthFooter";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthInput from "@/components/auth/AuthInput";
import PrimaryButton from "@/components/auth/PrimaryButton";
import BackButton from "@/components/common/BackButton";
import KeyboardSafeView from "@/components/common/KeyboardSafeView";
import { requestPasswordReset } from "@/services/auth.service";
import {
  describePasswordResetError,
  requestResetCode,
  validateForgotPasswordEmail,
} from "@/services/passwordResetFlow";
import {
  RADIUS,
  SPACING,
  TYPOGRAPHY,
  useIsDarkTheme,
  useThemeColors,
  type ColorPalette,
} from "@/theme";

// Step 1 of password reset: ask the backend to email a 6-digit code. Its
// answer is the same whether or not the email has an account, so the app
// always continues to reset-password.tsx (see services/passwordResetFlow.ts).
export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const COLORS = useThemeColors();
  const isDark = useIsDarkTheme();
  const styles = useMemo(() => createStyles(COLORS, isDark), [COLORS, isDark]);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendCode() {
    const validationError = validateForgotPasswordEmail(email);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const result = await requestResetCode(email, { requestPasswordReset });
      // Only what the next screen displays -- never a code or password.
      router.push({
        pathname: "/reset-password",
        params: { email: result.email, cooldown: String(result.resendCooldownSeconds) },
      });
    } catch (err) {
      setError(describePasswordResetError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardSafeView style={styles.flex}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + SPACING.md },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <BackButton onPress={() => router.push("/login")} style={styles.back} />

        <AuthHeader
          title="Forgot Password?"
          subtitle="Enter your email and we'll send you a 6-digit code to reset your password."
        />

        <AuthInput
          label="Email"
          placeholder="Enter your email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <PrimaryButton title="Send Code" loading={loading} onPress={handleSendCode} />

          <AuthFooter
            promptText="Remember your password?"
            actionText="Login"
            onPress={() => router.push("/login")}
          />
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
    // the auto margin), so the primary button and footer link sit in the same
    // place whether the form above is short or long. On a small phone or with
    // the keyboard open there is no spare height, and it simply follows the
    // form as before.
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
