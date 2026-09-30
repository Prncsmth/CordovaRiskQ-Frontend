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
import type { ApiError } from "@/services/api";
import { requestRegistrationOtp, verifyRegistrationOtp } from "@/services/auth.service";
import {
    RADIUS,
    SPACING,
    TYPOGRAPHY,
    useIsDarkTheme,
    useThemeColors,
    type ColorPalette,
} from "@/theme";

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const COLORS = useThemeColors();
  const isDark = useIsDarkTheme();
  const styles = useMemo(() => createStyles(COLORS, isDark), [COLORS, isDark]);
  const { email, name, password } = useLocalSearchParams<{
    email: string;
    name: string;
    password: string;
  }>();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
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
    if (code.trim().length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const result = await verifyRegistrationOtp(email, code.trim());
      await login(result.token, result.user, true);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.status === 410 || apiErr.status === 429) {
        // Expired or too-many-attempts -- both mean "this code is dead,"
        // so let the user resend immediately instead of waiting out
        // whatever's left of the (now-moot) countdown.
        setCooldown(0);
      }
      setError(
        err instanceof Error ? err.message : "Verification failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || resending) return;

    setError(null);
    setResending(true);
    try {
      await requestRegistrationOtp(name, email, password);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't resend the code. Please try again.",
      );
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
            subtitle={`Enter the 6-digit code we sent to ${email}`}
          />

          <AuthInput
            label="Verification Code"
            placeholder="123456"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
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

          <PrimaryButton title="Verify" loading={loading} onPress={handleVerify} />
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
