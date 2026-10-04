import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import PrimaryButton from "@/components/auth/PrimaryButton";
import PasswordField from "@/components/change-password/PasswordField";
import PasswordRequirements from "@/components/change-password/PasswordRequirements";
import PasswordSheet from "@/components/change-password/PasswordSheet";
import PasswordStrengthMeter from "@/components/change-password/PasswordStrengthMeter";
import { useAuth } from "@/context/AuthContext";
import { changePassword } from "@/services/user.service";
import { useThemeColors, FONT_FAMILY, RADIUS, SPACING, TYPOGRAPHY, type ColorPalette } from "@/theme";
import { isPasswordValid } from "@/utils/passwordPolicy";

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { token, replaceToken } = useAuth();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const sheetScrollRef = useRef<ScrollView>(null);

  // Scrolling immediately on focus races the keyboard's own show animation
  // -- see the identical helper in app/(auth)/register.tsx for why this
  // waits for the OS's "keyboard is now fully shown" event instead of
  // scrolling synchronously in onFocus.
  function scrollToEndOnceKeyboardShown() {
    const subscription = Keyboard.addListener("keyboardDidShow", () => {
      sheetScrollRef.current?.scrollToEnd({ animated: true });
      subscription.remove();
    });
  }

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const canSave =
    oldPassword.length > 0 &&
    isPasswordValid(newPassword) &&
    passwordsMatch &&
    !isSaving;

  function handleClose() {
    router.back();
  }

  async function handleSave() {
    if (!token || !canSave) return;

    setIsSaving(true);
    try {
      const result = await changePassword(token, { oldPassword, newPassword });
      // Every other device is now logged out; keep this one signed in with
      // the fresh token instead of the one that was just revoked.
      if (result.token) await replaceToken(result.token);
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
      <PasswordSheet ref={sheetScrollRef} onClose={handleClose}>
        <Text style={styles.title}>Change Password</Text>
        <Text style={styles.subtitle}>
          Enter your current password, then choose a new one to keep your
          RiskQ account secure.
        </Text>

        <PasswordField
          label="Current Password"
          value={oldPassword}
          onChangeText={setOldPassword}
          placeholder="Enter current password"
          returnKeyType="next"
        />

        <View style={styles.groupDivider} />

        <PasswordField
          label="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Enter new password"
          returnKeyType="next"
        />
        {newPassword ? (
          <View style={styles.strengthCard}>
            <PasswordStrengthMeter password={newPassword} />
            <View style={styles.strengthDivider} />
            <PasswordRequirements password={newPassword} />
          </View>
        ) : null}

        <PasswordField
          label="Confirm New Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter new password"
          returnKeyType="done"
          onSubmitEditing={handleSave}
          onFocus={scrollToEndOnceKeyboardShown}
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
          title="Save"
          onPress={handleSave}
          disabled={!canSave}
          loading={isSaving}
        />

        <View style={styles.trustBanner}>
          <View style={styles.trustIconBadge}>
            <Ionicons name="shield-checkmark" size={14} color={COLORS.success} />
          </View>
          <Text style={styles.trustText}>
            Keeping your account secure helps make sure RiskQ alerts always
            reach you.
          </Text>
        </View>
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
    groupDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: COLORS.borderMuted,
      marginVertical: SPACING.xs,
    },
    strengthCard: {
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.md,
      padding: SPACING.sm + 2,
      gap: SPACING.xs,
      marginTop: -SPACING.xs,
    },
    strengthDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: COLORS.borderMuted,
    },
    trustBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      backgroundColor: COLORS.successBg,
      borderRadius: RADIUS.md,
      padding: SPACING.sm,
    },
    trustIconBadge: {
      width: 26,
      height: 26,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.background,
      alignItems: "center",
      justifyContent: "center",
    },
    trustText: {
      flex: 1,
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textSecondary,
      lineHeight: 16,
    },
  });
}
