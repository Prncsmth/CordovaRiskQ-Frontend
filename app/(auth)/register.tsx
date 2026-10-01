import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AuthFooter from "@/components/auth/AuthFooter";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthInput from "@/components/auth/AuthInput";
import PrimaryButton from "@/components/auth/PrimaryButton";
import BackButton from "@/components/common/BackButton";
import KeyboardSafeView from "@/components/common/KeyboardSafeView";
import PasswordRequirements from "@/components/change-password/PasswordRequirements";
import PasswordStrengthMeter from "@/components/change-password/PasswordStrengthMeter";
import { requestRegistrationOtp } from "@/services/auth.service";
import {
    describeRegistrationError,
    requestRegistration,
    validateRegistration,
} from "@/services/registrationFlow";
import {
    RADIUS,
    SPACING,
    TYPOGRAPHY,
    useIsDarkTheme,
    useThemeColors,
    type ColorPalette,
} from "@/theme";

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const COLORS = useThemeColors();
  const isDark = useIsDarkTheme();
  const styles = useMemo(() => createStyles(COLORS, isDark), [COLORS, isDark]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The backend hashes the password and emails a 6-digit CORDOVA RISKQ
  // code. No account exists until verify-email.tsx submits the correct code
  // (see services/registrationFlow.ts).
  async function handleRegister() {
    const input = { name, email, password, confirmPassword };
    const validationError = validateRegistration(input);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await requestRegistration(input, { requestRegistrationOtp });
      // Only what the next screen displays -- never the password or the code.
      router.push({
        pathname: "/verify-email",
        params: {
          email: result.email,
          cooldown: String(result.resendCooldownSeconds),
        },
      });
    } catch (err) {
      setError(describeRegistrationError(err));
    } finally {
      setLoading(false);
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
          <BackButton
            onPress={() => router.push("/login")}
            style={styles.back}
          />

          <AuthHeader
            title="Sign up"
            subtitle="Create an account to continue"
          />

          <AuthInput
            label="Full Name"
            placeholder="Enter your full name"
            value={name}
            onChangeText={setName}
          />

          <AuthInput
            label="Email"
            placeholder="Enter your email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <AuthInput
            label="Set Password"
            placeholder="Enter your password"
            secureTextEntry
            secureToggle
            value={password}
            onChangeText={setPassword}
          />
          {password ? (
            <View style={styles.strengthCard}>
              <PasswordStrengthMeter password={password} />
              <View style={styles.strengthDivider} />
              <PasswordRequirements password={password} />
            </View>
          ) : null}

          <AuthInput
            label="Confirm Password"
            placeholder="Re-enter your password"
            secureTextEntry
            secureToggle
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : null}

          <PrimaryButton
            title="Register"
            loading={loading}
            onPress={handleRegister}
          />

          <AuthFooter
            promptText="Already have an account?"
            actionText="Login"
            onPress={() => router.push("/login")}
          />
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
