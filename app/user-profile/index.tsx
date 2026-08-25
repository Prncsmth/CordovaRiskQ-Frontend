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
import ProfileAvatarEdit from "@/components/user-profile/ProfileAvatarEdit";
import ProfileFieldInput from "@/components/user-profile/ProfileFieldInput";
import { useAuth } from "@/context/AuthContext";
import { getProfile, updateProfile } from "@/services/user.service";
import { useThemeColors, FONT_FAMILY, SPACING, TYPOGRAPHY, type ColorPalette } from "@/theme";

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

  useEffect(() => {
    if (!token) return;

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

  async function handleSave() {
    if (!token) return;

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
          <Text style={styles.errorText}>
            We could not load your profile. Please go back and try again.
          </Text>
        ) : (
          <>
            <View style={styles.avatarSection}>
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
              <View style={styles.fields}>
                <ProfileFieldInput
                  label="First Name"
                  value={firstName}
                  onChangeText={setFirstName}
                />
                <ProfileFieldInput
                  label="Last Name"
                  value={lastName}
                  onChangeText={setLastName}
                />
                <ProfileFieldInput
                  label="E-Mail"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <ProfileFieldInput
                  label="Mobile"
                  value={mobile}
                  onChangeText={setMobile}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <PrimaryButton title="SAVE" onPress={handleSave} disabled={isSaving} />
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
  errorText: {
    marginTop: SPACING.xl,
    textAlign: "center",
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
  },
  avatarSection: {
    alignItems: "center",
    gap: SPACING.sm,
    paddingTop: SPACING.xs,
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
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginLeft: SPACING.xs,
  },
  fields: {
    gap: SPACING.md,
  },
  });
}
