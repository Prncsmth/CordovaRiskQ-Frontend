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

    if (!email.trim().toLowerCase().endsWith("@gmail.com")) {
      Alert.alert("Invalid email", "Only Gmail addresses (@gmail.com) are allowed.");
      return;
    }
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
      const profile = await updateProfile(token, { name, email, mobile });
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

  const fullName = `${firstName} ${lastName}`.trim();

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
            <View style={styles.avatarCard}>
              <ProfileAvatarEdit />
              {fullName ? (
                <View style={styles.identity}>
                  <Text style={styles.identityName}>{fullName}</Text>
                  {email ? <Text style={styles.identityEmail}>{email}</Text> : null}
                </View>
              ) : null}
            </View>

            <View style={styles.fieldsSection}>
              <Text style={styles.sectionLabel}>Personal Information</Text>
              <View style={styles.fieldsCard}>
                <View style={styles.nameRow}>
                  <ProfileFieldInput
                    label="First Name"
                    icon="person-outline"
                    value={firstName}
                    onChangeText={setFirstName}
                    containerStyle={styles.nameField}
                  />
                  <ProfileFieldInput
                    label="Last Name"
                    icon="person-outline"
                    value={lastName}
                    onChangeText={setLastName}
                    containerStyle={styles.nameField}
                  />
                </View>
                <ProfileFieldInput
                  label="E-Mail"
                  icon="mail-outline"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <ProfileFieldInput
                  label="Mobile"
                  icon="call-outline"
                  value={mobile}
                  onChangeText={setMobile}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <PrimaryButton title="Save" onPress={handleSave} disabled={isSaving} />
          </>
        )}
      </ScrollView>
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
  avatarCard: {
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    ...SHADOW,
  },
  identity: {
    alignItems: "center",
    gap: 2,
  },
  identityName: {
    fontFamily: FONT_FAMILY.displaySemibold,
    fontSize: TYPOGRAPHY.subtitle,
    color: COLORS.text,
  },
  identityEmail: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },
  fieldsSection: {
    gap: SPACING.sm,
  },
  sectionLabel: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
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
