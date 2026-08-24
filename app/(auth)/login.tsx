import AuthFooter from "@/components/auth/AuthFooter";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthInput from "@/components/auth/AuthInput";
import GoogleButton from "@/components/auth/GoogleButton";
import PrimaryButton from "@/components/auth/PrimaryButton";
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
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function LoginScreen() {
  const router = useRouter();
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
      setError("Login failed. Please check your credentials and try again.");
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
        style={StyleSheet.absoluteFillObject}
      />
      <KeyboardAvoidingView
        style={styles.transparentFlex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
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

          <PrimaryButton title="Log In" loading={loading} onPress={handleLogin} />

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

          {__DEV__ && (
            <Pressable
              style={styles.devLinkWrap}
              onPress={() =>
                login("dev-responder-token", {
                  id: "dev-responder",
                  name: "Dev Responder",
                  email: "responder@dev.local",
                  role: "responder",
                })
              }
            >
              <Text style={styles.devLink}>Continue as Responder (dev)</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
      justifyContent: "center",
      paddingHorizontal: SPACING.lg,
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
    devLinkWrap: {
      alignItems: "center",
      marginTop: SPACING.lg,
    },
    devLink: {
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.gray,
      textDecorationLine: "underline",
    },
  });
}
