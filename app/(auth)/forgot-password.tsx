import { Ionicons } from "@expo/vector-icons";
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
import RippleRings from "@/components/common/RippleRings";
import { requestPasswordReset } from "@/services/auth.service";
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

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const COLORS = useThemeColors();
  const isDark = useIsDarkTheme();
  const styles = useMemo(() => createStyles(COLORS, isDark), [COLORS, isDark]);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSendLink() {
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Couldn't send reset link. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <View style={[styles.flex, { paddingTop: insets.top + SPACING.md }]}>
        <BackButton onPress={() => router.push("/login")} style={styles.backSuccess} />

        <View style={styles.successBody}>
          <RippleRings
            size={200}
            ringCount={3}
            color={`${COLORS.success}14`}
            style={styles.watermark}
          />
          <View style={styles.checkCircle}>
            <Ionicons name="mail" size={40} color={COLORS.white} />
          </View>
          <Text style={styles.successTitle}>Check Your Email</Text>
          <Text style={styles.successSubtitle}>
            We&apos;ve sent a password reset link to{"\n"}
            <Text style={styles.successEmail}>{email.trim()}</Text>
          </Text>

          <PrimaryButton
            title="Back to Login"
            onPress={() => router.replace("/login")}
            style={styles.successButton}
          />

          <Text style={styles.resendPrompt}>
            Didn&apos;t get it?{" "}
            <Text style={styles.resendAction} onPress={handleSendLink}>
              Resend link
            </Text>
          </Text>
        </View>
      </View>
    );
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
          subtitle="Enter your email and we'll send you a link to reset your password."
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

        <PrimaryButton
          title="Send Reset Link"
          loading={loading}
          onPress={handleSendLink}
        />

        <AuthFooter
          promptText="Remember your password?"
          actionText="Login"
          onPress={() => router.push("/login")}
        />
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

    container: {
      flexGrow: 1,
      justifyContent: "flex-start",
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.xl,
    },

    back: {
      marginBottom: SPACING.lg,
    },

    backSuccess: {
      marginBottom: SPACING.lg,
      marginLeft: SPACING.lg,
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

    successBody: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: SPACING.lg,
    },

    watermark: {
      position: "absolute",
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

    successTitle: {
      fontFamily: FONT_FAMILY.display,
      fontSize: TYPOGRAPHY.title,
      color: COLORS.text,
      textAlign: "center",
    },

    successSubtitle: {
      fontSize: TYPOGRAPHY.body,
      color: COLORS.textSecondary,
      textAlign: "center",
      marginTop: SPACING.md,
      lineHeight: 22,
    },

    successEmail: {
      fontWeight: "700",
      color: COLORS.text,
    },

    successButton: {
      width: "100%",
      marginTop: SPACING.xl,
    },

    resendPrompt: {
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.textSecondary,
      marginTop: SPACING.lg,
      textAlign: "center",
    },

    resendAction: {
      color: COLORS.primary,
      fontWeight: "700",
    },
  });
}
