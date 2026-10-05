import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PrimaryButton from "@/components/auth/PrimaryButton";
import BackButton from "@/components/common/BackButton";
import ProfileAvatarEdit from "@/components/user-profile/ProfileAvatarEdit";
import ProfileFieldInput from "@/components/user-profile/ProfileFieldInput";
import { useAuth } from "@/context/AuthContext";
import { getProfile, updateProfile } from "@/services/user.service";
import { useThemeColors, FONT_FAMILY, RADIUS, SHADOW, SPACING, TYPOGRAPHY, type ColorPalette } from "@/theme";

// Mirrors the backend's updateProfileSchema check (services/user.validation.ts)
// -- accepts "09171234567" or "+639171234567", with or without spaces/dashes.
const PH_MOBILE_REGEX = /^(\+639\d{9}|09\d{9})$/;

function splitName(name: string | null | undefined): {
  firstName: string;
  lastName: string;
} {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }
  const [first, ...rest] = parts;
  return { firstName: first, lastName: rest.join(" ") };
}

export default function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token, updateUser } = useAuth();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");

  const loadProfile = useCallback(() => {
    if (!token) return;

    setIsLoading(true);
    setLoadError(false);
    getProfile(token)
      .then((profile) => {
        const split = splitName(profile.name);
        setFirstName(split.firstName);
        setLastName(split.lastName);
        setEmail(profile.email);
        setMobile(profile.mobile ?? "");
      })
      .catch((err) => {
        setLoadError(true);
        Alert.alert(
          "Couldn't load profile",
          err instanceof Error ? err.message : "Please try again.",
        );
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function handleSave() {
    if (!token) return;

    const trimmedMobile = mobile.trim();
    if (trimmedMobile && !PH_MOBILE_REGEX.test(trimmedMobile.replace(/[\s-]/g, ""))) {
      Alert.alert(
        "Invalid mobile number",
        "Enter a valid PH mobile number (e.g. 09171234567).",
      );
      return;
    }

    setIsSaving(true);
    try {
      const name = `${firstName} ${lastName}`.trim();
      // No email -- it isn't editable (see the read-only field below).
      const profile = await updateProfile(token, { name, mobile });
      await updateUser({
        id: profile.id,
        name: profile.name ?? "",
        email: profile.email,
      });
      router.back();
    } catch (err) {
      Alert.alert(
        "Update failed",
        err instanceof Error ? err.message : "Please try again.",
      );
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
          <Text style={styles.headerTitle}>Edit Profile</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color={COLORS.primary} style={styles.loading} />
        ) : loadError ? (
          <View style={styles.errorState}>
            <Text style={styles.errorText}>We could not load your profile.</Text>
            <Pressable onPress={loadProfile} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <ProfileAvatarEdit />

            <View style={styles.fieldsSection}>
              <Text style={styles.sectionLabel}>Personal information</Text>
              <View style={styles.fieldsCard}>
                <View style={styles.nameRow}>
                  <ProfileFieldInput
                    label="First name"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    autoComplete="given-name"
                    containerStyle={styles.nameField}
                  />
                  <ProfileFieldInput
                    label="Last name"
                    value={lastName}
                    onChangeText={setLastName}
                    autoCapitalize="words"
                    autoComplete="family-name"
                    containerStyle={styles.nameField}
                  />
                </View>
                {/* Read-only: the email is the account's verified login
                    identity, so it can't be changed here (the backend
                    rejects a change too). */}
                <ProfileFieldInput
                  label="Email"
                  value={email}
                  onChangeText={() => {}}
                  readOnly
                  hint="Your login email can't be changed."
                />
                <ProfileFieldInput
                  label="Mobile number"
                  value={mobile}
                  onChangeText={setMobile}
                  keyboardType="phone-pad"
                  placeholder="09XX XXX XXXX"
                  hint="Responders use this to reach you about your reports."
                />
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Pinned to the bottom, outside the scrolling form, so the form has
          room to breathe and Save is always within thumb reach. */}
      {!isLoading && !loadError ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.lg }]}>
          <PrimaryButton
            title="Save Changes"
            pill
            onPress={handleSave}
            loading={isSaving}
            style={styles.footerButton}
          />
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
  errorState: {
    marginTop: SPACING.xl,
    alignItems: "center",
    gap: SPACING.sm,
  },
  errorText: {
    textAlign: "center",
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  retryButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  retryButtonText: {
    color: COLORS.white,
    fontWeight: "700",
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
  nameRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  nameField: {
    flex: 1,
  },
  });
}
