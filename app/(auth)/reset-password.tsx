import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AuthHeader from "@/components/auth/AuthHeader";
import AuthInput from "@/components/auth/AuthInput";
import PrimaryButton from "@/components/auth/PrimaryButton";
import PasswordRequirements from "@/components/change-password/PasswordRequirements";
import PasswordStrengthMeter from "@/components/change-password/PasswordStrengthMeter";
import BackButton from "@/components/common/BackButton";
import KeyboardSafeView from "@/components/common/KeyboardSafeView";
import { requestPasswordReset, resetPassword } from "@/services/auth.service";
import {
  describePasswordResetError,
  resendResetCode,
  submitPasswordReset,
} from "@/services/passwordResetFlow";
import { OTP_LENGTH, RESEND_COOLDOWN_SECONDS, sanitizeOtpInput } from "@/services/registrationFlow";
import {
  FONT_FAMILY,
  RADIUS,
  SHADOW_LG,
  SPACING,
  TYPOGRAPHY,
  useIsDarkTheme,
  useThemeColors,
  type ColorPalette,
} from "@/theme";
import { scrollToEndWhenKeyboardReady } from "@/utils/scrollOnKeyboard";

// Step 2 of password reset: the 6-digit code from the email plus a new
// password. Only the email arrives here (route param) -- resending needs
// nothing else. Success does not log in: the user returns to Login and signs
// in with the new password (see services/passwordResetFlow.ts).
function initialCooldown(cooldownParam: string | undefined): number {
  const fromServer = Number(cooldownParam);
  return Number.isInteger(fromServer) && fromServer > 0 ? fromServer : RESEND_COOLDOWN_SECONDS;
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const COLORS = useThemeColors();
  const isDark = useIsDarkTheme();
  const styles = useMemo(() => createStyles(COLORS, isDark), [COLORS, isDark]);
  const { email, cooldown: cooldownParam } = useLocalSearchParams<{
    email: string;
    cooldown?: string;
  }>();

  const scrollViewRef = useRef<ScrollView>(null);

  // Same as register.tsx: brings Confirm New Password up above the
  // keyboard, whether it's just opening or already open (see
  // utils/scrollOnKeyboard.ts).
  function scrollToEndOnceKeyboardShown() {
    scrollToEndWhenKeyboardReady(Keyboard, () =>
      scrollViewRef.current?.scrollToEnd({ animated: true }),
    );
  }

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [done, setDone] = useState(false);
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

  // Success entrance, same motion as (onboarding)/registration-complete.tsx:
  // the icon pops in, then the copy fades up.
  const iconOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0.7);
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(16);

  useEffect(() => {
    if (!done) return;
    iconOpacity.value = withTiming(1, { duration: 350 });
    iconScale.value = withSpring(1, { damping: 12, stiffness: 130 });
    contentOpacity.value = withDelay(180, withTiming(1, { duration: 420 }));
    contentTranslateY.value = withDelay(180, withSpring(0, { damping: 14, stiffness: 120 }));
  }, [done, contentOpacity, contentTranslateY, iconOpacity, iconScale]);

  // Auto-advance like registration-complete.tsx -- a confirmation, not a
  // decision point, so it moves on to Login by itself.
  useEffect(() => {
    if (!done) return;
    const timeout = setTimeout(() => {
      router.replace("/login");
    }, 2200);
    return () => clearTimeout(timeout);
  }, [done, router]);

  const iconAnimation = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }],
  }));
  const contentAnimation = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  async function handleReset() {
    setError(null);
    setNotice(null);
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
        setDone(true);
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

  if (done) {
    return (
      <View style={[styles.flex, styles.successContainer]}>
        <View style={styles.successBody}>
          <Animated.View style={[styles.checkCircle, iconAnimation]}>
            <Ionicons name="checkmark" size={46} color={COLORS.white} />
          </Animated.View>
          <Animated.View style={[styles.successCopy, contentAnimation]}>
            <Text style={styles.eyebrow}>PASSWORD UPDATED</Text>
            <Text style={styles.successTitle}>You&apos;re all set.</Text>
            <Text style={styles.successSubtitle}>
              Your password has been reset. Log in with your new password to
              access alerts, report incidents, and coordinate emergency
              assistance.
            </Text>
          </Animated.View>
        </View>
      </View>
    );
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
          title="Reset Password"
          subtitle={`If an account exists for ${email}, we've sent it a 6-digit code. Enter it below with your new password.`}
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

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

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

    // Same layout as (onboarding)/registration-complete.tsx.
    successContainer: {
      paddingTop: 80,
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.lg,
    },

    successBody: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
    },

    checkCircle: {
      width: 96,
      height: 96,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.success,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: SPACING.lg,
      ...SHADOW_LG,
    },

    successCopy: {
      width: "100%",
      alignItems: "center",
    },

    eyebrow: {
      color: COLORS.success,
      fontSize: TYPOGRAPHY.small,
      fontWeight: "800",
      letterSpacing: 1.2,
    },

    successTitle: {
      fontFamily: FONT_FAMILY.display,
      fontSize: TYPOGRAPHY.title,
      color: COLORS.text,
      textAlign: "center",
      marginTop: SPACING.xs,
    },

    successSubtitle: {
      fontSize: TYPOGRAPHY.body,
      color: COLORS.textSecondary,
      textAlign: "center",
      marginTop: SPACING.md,
      lineHeight: 23,
      maxWidth: 330,
    },
  });
}
