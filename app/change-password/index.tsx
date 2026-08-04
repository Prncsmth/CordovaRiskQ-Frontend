import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
} from "react-native";

import PrimaryButton from "@/components/auth/PrimaryButton";
import PasswordSheet from "@/components/change-password/PasswordSheet";
import ProfileFieldInput from "@/components/user-profile/ProfileFieldInput";
import { useAuth } from "@/context/AuthContext";
import { changePassword } from "@/services/user.service";
import { COLORS, SPACING, TYPOGRAPHY } from "@/theme";

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const canSave =
    oldPassword.length > 0 &&
    newPassword.length > 0 &&
    newPassword === confirmPassword &&
    !isSaving;

  function handleClose() {
    router.back();
  }

  async function handleSave() {
    if (!token) return;

    setIsSaving(true);
    try {
      await changePassword(token, { oldPassword, newPassword });
      router.back();
    } catch (err) {
      Alert.alert(
        "Change password failed",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <PasswordSheet onClose={handleClose}>
        <Text style={styles.title}>Change Password</Text>
        <ProfileFieldInput
          value={oldPassword}
          onChangeText={setOldPassword}
          placeholder="Old Password"
          secureTextEntry
        />
        <ProfileFieldInput
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="New Password"
          secureTextEntry
        />
        <ProfileFieldInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm Password"
          secureTextEntry
        />
        <PrimaryButton title="SAVE" onPress={handleSave} disabled={!canSave} />
      </PasswordSheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: "800",
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: SPACING.md,
  },
});
