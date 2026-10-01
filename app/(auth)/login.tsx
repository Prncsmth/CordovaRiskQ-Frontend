import AuthFooter from "@/components/auth/AuthFooter";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthInput from "@/components/auth/AuthInput";
import GoogleButton from "@/components/auth/GoogleButton";
import PrimaryButton from "@/components/auth/PrimaryButton";
import BrandLockup from "@/components/common/BrandLockup";
import KeyboardSafeView from "@/components/common/KeyboardSafeView";
import { useAuth } from "@/context/AuthContext";
import { loginUser } from "@/services/auth.service";
import {
    RADIUS,
    SPACING,
    TYPOGRAPHY,
    useIsDarkTheme,
    useThemeColors,
    type ColorPalette,
} from "@/theme";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const COLORS = useThemeColors();
  const isDark = useIsDarkTheme();
  const styles = useMemo(() => createStyles(COLORS, isDark), [COLORS, isDark]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const response = await loginUser(email, password);
      await login(response.token, response.user);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Login failed. Please try again.";
      setError(message);
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
          contentContainerStyle={[styles.container, { paddingTop: insets.top + SPACING.lg }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <BrandLockup style={styles.brand} />

          <AuthHeader
            title={"Sign in to your\nAccount"}
            subtitle="Enter your email and password to log in"
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
            label="Password"
            placeholder="Enter your password"
            secureTextEntry
            secureToggle
            rightLabel="Forgot Password?"
            onRightLabelPress={() => router.push("/forgot-password")}
            value={password}
            onChangeText={setPassword}
          />

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <PrimaryButton
              title="Log In"
              loading={loading}
              onPress={handleLogin}
            />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <GoogleButton onError={setError} />

            <AuthFooter
              promptText="Don't have an account?"
              actionText="Register"
              onPress={() => router.push("/register")}
            />
          </View>
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
    brand: {
      marginBottom: SPACING.lg,
    },
    // Sits right under the form (not pinned to the bottom like the other
    // auth screens), so Log In and the options below it stay close to the
    // inputs.
    actions: {},

    container: {
      // Top-aligned (not vertically centered) so the logo sits right under
      // the status bar instead of floating below a tall empty gap.
      flexGrow: 1,
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.xl,
    },
    dividerRow: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: SPACING.md,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: COLORS.border,
    },
    dividerText: {
      marginHorizontal: SPACING.sm,
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.gray,
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
