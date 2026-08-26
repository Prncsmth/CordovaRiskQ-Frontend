import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
} from "react-native";

import PrimaryButton from "@/components/auth/PrimaryButton";
import PasswordField from "@/components/change-password/PasswordField";
import PasswordSheet from "@/components/change-password/PasswordSheet";
import PasswordStrengthMeter from "@/components/change-password/PasswordStrengthMeter";
import { useAuth } from "@/context/AuthContext";
import { changePassword } from "@/services/user.service";
import { useThemeColors, FONT_FAMILY, SPACING, TYPOGRAPHY, type ColorPalette } from "@/theme";

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const canSave =
    oldPassword.length > 0 &&
    newPassword.length >= 8 &&
    passwordsMatch &&
    !isSaving;

  function handleClose() {
    router.back();
  }

  async function handleSave() {
    if (!token || !canSave) return;

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
        <Text style={styles.subtitle}>
          Enter your current password and choose a new one to keep your
          account secure.
        </Text>

        <PasswordField
          label="Current Password"
          value={oldPassword}
          onChangeText={setOldPassword}
          placeholder="Enter current password"
          returnKeyType="next"
        />

        <PasswordField
          label="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Enter new password"
          returnKeyType="next"
          hint={
            newPassword.length > 0 && newPassword.length < 8
              ? "Use at least 8 characters"
              : undefined
          }
          hintTone="error"
        />
        <PasswordStrengthMeter password={newPassword} />

        <PasswordField
          label="Confirm New Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter new password"
          returnKeyType="done"
          onSubmitEditing={handleSave}
          hint={
            passwordsMismatch
              ? "Passwords don't match"
              : passwordsMatch
                ? "Passwords match"
                : undefined
          }
          hintTone={passwordsMismatch ? "error" : "success"}
        />

        <PrimaryButton
          title="SAVE"
          onPress={handleSave}
          disabled={!canSave}
          loading={isSaving}
        />
      </PasswordSheet>
    </KeyboardAvoidingView>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    flex: {
      flex: 1,
    },
    title: {
      fontFamily: FONT_FAMILY.displaySemibold,
      fontSize: TYPOGRAPHY.subtitle,
      color: COLORS.text,
      textAlign: "center",
    },
    subtitle: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textSecondary,
      textAlign: "center",
      lineHeight: 19,
      marginTop: -SPACING.xs,
      marginBottom: SPACING.xs,
      paddingHorizontal: SPACING.sm,
    },
  });
}
