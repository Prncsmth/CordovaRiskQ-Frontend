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
import { useAuth } from "@/context/AuthContext";
import { registerUser } from "@/services/auth.service";
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
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const COLORS = useThemeColors();
  const isDark = useIsDarkTheme();
  const styles = useMemo(() => createStyles(COLORS, isDark), [COLORS, isDark]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    if (!name || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await registerUser(name, email, password);
      await login(response.token, response.user, true);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.flex}>
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
