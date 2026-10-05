// app/change-password/index.tsx
// Change Password, laid out like Edit Profile: back button and title, the
// fields in one card (label above each field, helper text below), and Save
// Changes pinned to the bottom. The rules (utils/passwordPolicy), the
// Google-account check and the token swap after saving are unchanged.
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PrimaryButton from "@/components/auth/PrimaryButton";
import BackButton from "@/components/common/BackButton";
import PasswordRequirements from "@/components/change-password/PasswordRequirements";
import PasswordStrengthMeter from "@/components/change-password/PasswordStrengthMeter";
import ProfileFieldInput from "@/components/user-profile/ProfileFieldInput";
import { useAuth } from "@/context/AuthContext";
import type { ApiError } from "@/services/api";
import { changePassword, getProfile } from "@/services/user.service";
import { useThemeColors, FONT_FAMILY, RADIUS, SHADOW, SPACING, TYPOGRAPHY, type ColorPalette } from "@/theme";
import { isPasswordValid } from "@/utils/passwordPolicy";

export default function ChangePasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token, replaceToken } = useAuth();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  // null while checking. A Google Sign-In account has no password, so it
  // gets a notice instead of the form (the backend rejects it anyway). If
  // the check fails, show the form and let the backend decide.
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getProfile(token)
      .then((profile) => {
        if (!cancelled) setHasPassword(profile.hasPassword !== false);
      })
      .catch(() => {
        if (!cancelled) setHasPassword(true);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const sameAsCurrent = newPassword.length > 0 && newPassword === oldPassword;
  const canSave =
    oldPassword.length > 0 &&
    isPasswordValid(newPassword) &&
    passwordsMatch &&
    !sameAsCurrent &&
    !isSaving;

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
      const status = (err as Partial<ApiError>)?.status;
      const message = err instanceof Error ? err.message : "";
      if (status === 403 || /old password/i.test(message)) {
        // Shown right under the Current password field.
        setCurrentError("That password is incorrect. Try again.");
      } else {
        Alert.alert("Change password failed", message || "Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + SPACING.sm, paddingBottom: SPACING.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <BackButton onPress={() => router.back()} style={styles.backButton} />
          <Text style={styles.headerTitle}>Change Password</Text>
        </View>

        {hasPassword === null ? (
          <ActivityIndicator color={COLORS.primary} style={styles.loading} />
        ) : !hasPassword ? (
          <View style={styles.fieldsCard}>
            <View style={styles.googleRow}>
              <Ionicons name="logo-google" size={20} color={COLORS.textSecondary} />
              <Text style={styles.googleText}>
                You signed in with Google, so this account doesn&apos;t have a RiskQ password to
                change. Manage your password in your Google Account.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.fieldsSection}>
            <Text style={styles.sectionLabel}>Password</Text>
            <View style={styles.fieldsCard}>
              <ProfileFieldInput
                label="Current password"
                value={oldPassword}
                onChangeText={(text) => {
                  setOldPassword(text);
                  setCurrentError(null);
                }}
                password
                returnKeyType="next"
                hint={currentError ?? undefined}
                hintTone="error"
              />
              <ProfileFieldInput
                label="New password"
                value={newPassword}
                onChangeText={setNewPassword}
                password
                returnKeyType="next"
                hint={sameAsCurrent ? "Choose a password different from your current one." : undefined}
                hintTone="error"
              />
              {newPassword ? (
                <View style={styles.rulesCard}>
                  <PasswordStrengthMeter password={newPassword} />
                  <PasswordRequirements password={newPassword} />
                </View>
              ) : null}
              <ProfileFieldInput
                label="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                password
                returnKeyType="done"
                onSubmitEditing={handleSave}
                hint={
                  passwordsMismatch
                    ? "Passwords don't match."
                    : passwordsMatch
                      ? "Passwords match."
                      : "Changing your password signs you out on your other devices."
                }
                hintTone={passwordsMismatch ? "error" : passwordsMatch ? "success" : "neutral"}
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Pinned to the bottom, like Edit Profile's Save Changes. */}
      {hasPassword !== null ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.lg }]}>
          {hasPassword ? (
            <PrimaryButton
              title="Save Changes"
              pill
              onPress={handleSave}
              disabled={!canSave}
              loading={isSaving}
              style={styles.footerButton}
            />
          ) : (
            <PrimaryButton
              title="Got it"
              pill
              onPress={() => router.back()}
              style={styles.footerButton}
            />
          )}
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    content: {
      paddingHorizontal: SPACING.md,
      gap: SPACING.lg,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    backButton: {
      position: "absolute",
      left: 0,
    },
    headerTitle: {
      fontFamily: FONT_FAMILY.displaySemibold,
      fontSize: TYPOGRAPHY.subtitle,
      color: COLORS.text,
    },
    loading: {
      marginTop: SPACING.xl,
    },
    fieldsSection: {
      gap: SPACING.xs,
    },
    sectionLabel: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "600",
      color: COLORS.textSecondary,
      marginLeft: 2,
    },
    fieldsCard: {
      gap: SPACING.md,
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      padding: SPACING.md,
      ...SHADOW,
    },
    rulesCard: {
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.md,
      padding: SPACING.sm + 2,
      gap: SPACING.sm,
      marginTop: -SPACING.xs,
    },
    googleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
    },
    googleText: {
      flex: 1,
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textSecondary,
      lineHeight: 19,
    },
    footer: {
      paddingHorizontal: SPACING.md,
      paddingTop: SPACING.md,
      backgroundColor: COLORS.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: COLORS.borderMuted,
    },
    footerButton: {
      marginTop: 0,
    },
  });
}
