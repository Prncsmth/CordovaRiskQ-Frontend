import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AuthHeader from "@/components/auth/AuthHeader";
import AuthInput from "@/components/auth/AuthInput";
import PrimaryButton from "@/components/auth/PrimaryButton";
import BackButton from "@/components/common/BackButton";
import KeyboardSafeView from "@/components/common/KeyboardSafeView";
import { useAuth } from "@/context/AuthContext";
import { resendRegistrationOtp, verifyRegistrationOtp } from "@/services/auth.service";
import {
    OTP_LENGTH,
    RESEND_COOLDOWN_SECONDS,
    describeRegistrationError,
    resendVerificationCode,
    sanitizeOtpInput,
    shouldAllowImmediateResend,
    submitVerificationCode,
} from "@/services/registrationFlow";
import {
    RADIUS,
    SPACING,
    TYPOGRAPHY,
    useIsDarkTheme,
    useThemeColors,
    type ColorPalette,
} from "@/theme";

// 6-digit CORDOVA RISKQ code entry. The backend emailed the code (never the
// app), checks it, and on success creates the account and returns our JWT.
// Only the email arrives here -- resending needs nothing else, because the
// backend already stored the hashed password (see
// services/registrationFlow.ts).
function initialCooldown(cooldownParam: string | undefined): number {
  const fromServer = Number(cooldownParam);
  return Number.isInteger(fromServer) && fromServer > 0 ? fromServer : RESEND_COOLDOWN_SECONDS;
}

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { login } = useAuth();
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
  // register.tsx just sent the first code, so start counting down.
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
      const result = await submitVerificationCode(email, code, { verifyRegistrationOtp, login });
      if (result.status === "invalid-input") {
        setError(result.message);
      }
      // "signed-in": login() flips isAuthenticated and app/_layout.tsx moves
      // on to the phone-number/Terms onboarding.
    } catch (err) {
      // Expired or too many attempts: this code is dead, so let the user get
      // a new one right away instead of waiting out the countdown.
      if (shouldAllowImmediateResend(err)) setCooldown(0);
      setError(describeRegistrationError(err));
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
      const newCooldown = await resendVerificationCode(
        email,
        { cooldownRemaining: cooldown, inFlight: resending },
        { resendRegistrationOtp },
      );
      if (newCooldown !== null) {
        setCode("");
        setCooldown(newCooldown || RESEND_COOLDOWN_SECONDS);
        setNotice(`We sent a new code to ${email}. Your previous code no longer works.`);
      }
    } catch (err) {
      setError(describeRegistrationError(err));
    } finally {
      setResending(false);
    }
  }

  return (
    <View style={styles.flex}>
      <LinearGradient
        colors={COLORS.heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <KeyboardSafeView style={styles.transparentFlex}>
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
            title="Verify Your Email"
            subtitle={`Enter the 6-digit verification code we sent to ${email}`}
          />

          <Text style={styles.hint}>
            Can&apos;t find it? Check your Spam or Promotions folder.
          </Text>

          <AuthInput
            label="Verification Code"
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

          <PrimaryButton title="Verify Code" loading={loading} onPress={handleVerify} />
        </ScrollView>
      </KeyboardSafeView>
    </View>
  );
}

function createStyles(COLORS: ColorPalette, isDark: boolean) {
  return StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: COLORS.background,
    },

    transparentFlex: {
      flex: 1,
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
