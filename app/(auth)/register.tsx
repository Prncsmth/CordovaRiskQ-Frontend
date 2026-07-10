import React, { useState } from "react";
import {
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";

import AuthHeader from "@/components/auth/AuthHeader";
import AuthInput from "@/components/auth/AuthInput";
import PrimaryButton from "@/components/auth/PrimaryButton";
import AuthFooter from "@/components/auth/AuthFooter";
import { useAuth } from "@/context/AuthContext";
import { registerUser } from "@/services/auth.service";
import { COLORS, SPACING } from "@/theme";

export default function RegisterScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await registerUser(name, email, password);
      login(response.token, response.user);
      router.replace("/home");
    } catch (err) {
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <AuthHeader
          title="Create account"
          subtitle="Sign up to get started with CordovaRiskQ"
        />

        <AuthInput
          icon="person-outline"
          placeholder="Full name"
          value={name}
          onChangeText={setName}
        />

        <AuthInput
          icon="mail-outline"
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <AuthInput
          icon="lock-closed-outline"
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <AuthInput
          icon="lock-closed-outline"
          placeholder="Confirm password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton
          title="Sign Up"
          loading={loading}
          onPress={handleRegister}
        />

        <AuthFooter
          promptText="Already have an account?"
          actionText="Log In"
          onPress={() => router.push("/login")}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
  },

  error: {
    color: COLORS.danger,
    marginBottom: SPACING.sm,
  },
});