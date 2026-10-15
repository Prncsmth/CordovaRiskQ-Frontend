import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AuthHeader from "@/components/auth/AuthHeader";
import AuthInput from "@/components/auth/AuthInput";
import PrimaryButton from "@/components/auth/PrimaryButton";
import BackButton from "@/components/common/BackButton";
import KeyboardSafeView from "@/components/common/KeyboardSafeView";
import { requestPasswordReset, verifyResetCode } from "@/services/auth.service";
import {
  describePasswordResetError,
  resendResetCode,
  submitResetCode,
} from "@/services/passwordResetFlow";
import { rememberVerifiedResetCode } from "@/services/passwordResetSession";
import { OTP_LENGTH, RESEND_COOLDOWN_SECONDS, sanitizeOtpInput } from "@/services/registrationFlow";
import {
  RADIUS,
  SPACING,
  TYPOGRAPHY,
  useIsDarkTheme,
  useThemeColors,
  type ColorPalette,
} from "@/theme";

// Step 2 of password reset: the 6-digit code from the email, checked with the
// backend before the user picks a new password. Only the email arrives here
// (route param); the verified code goes on to reset-password.tsx in memory
// (see services/passwordResetSession.ts).
function initialCooldown(cooldownParam: string | undefined): number {
  const fromServer = Number(cooldownParam);
  return Number.isInteger(fromServer) && fromServer > 0 ? fromServer : RESEND_COOLDOWN_SECONDS;
}

export default function ResetCodeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const COLORS = useThemeColors();
  const isDark = useIsDarkTheme();
  const styles = useMemo(() => createStyles(COLORS, isDark), [COLORS, isDark]);
  const { email, cooldown: cooldownParam } = useLocalSearchParams<{
    email: string;
    cooldown?: string;
  }>();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // forgot-password.tsx just requested the first code, so start counting down.
  const [cooldown, setCooldown] = useState(() => initialCooldown(cooldownParam));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  async function handleVerify() {
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const result = await submitResetCode(email, code, { verifyResetCode });
      if (result.status === "invalid-input") {
        setError(result.message);
      } else {
        rememberVerifiedResetCode(email, result.code);
        router.push({ pathname: "/reset-password", params: { email } });
      }
    } catch (err) {
      setError(describePasswordResetError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || resending) return;
    setError(null);
    setNotice(null);
    setResending(true);
    try {
      const newCooldown = await resendResetCode(
        email,
        { cooldownRemaining: cooldown, inFlight: resending },
        { requestPasswordReset },
      );
      if (newCooldown !== null) {
        setCode("");
        setCooldown(newCooldown);
        // Same deliberately non-committal wording as the backend.
        setNotice(`If an account exists for ${email}, a new code is on its way. Your previous code no longer works.`);
      }
    } catch (err) {
      setError(describePasswordResetError(err));
    } finally {
      setResending(false);
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
        <BackButton onPress={() => router.back()} style={styles.back} />

        <AuthHeader
          title="Enter Code"
          subtitle={`If an account exists for ${email}, we've sent it a 6-digit code.`}
        />

        <Text style={styles.hint}>
          Can&apos;t find it? Check your Spam or Promotions folder.
        </Text>

        <AuthInput
          label="Reset Code"
          placeholder="123456"
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          value={code}
          onChangeText={(value) => setCode(sanitizeOtpInput(value))}
          rightLabel={
            resending
              ? "Sending…"
              : cooldown > 0
                ? `Resend in ${cooldown}s`
                : "Resend code"
          }
          onRightLabelPress={cooldown > 0 || resending ? undefined : handleResend}
        />

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : null}

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <View style={styles.actions}>
          <PrimaryButton title="Verify Code" loading={loading} onPress={handleVerify} />
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

    hint: {
      color: COLORS.textSecondary,
      fontSize: TYPOGRAPHY.caption,
      marginBottom: SPACING.md,
    },

    notice: {
      color: COLORS.textSecondary,
      fontSize: TYPOGRAPHY.caption,
      fontWeight: "600",
      marginBottom: SPACING.sm,
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
