import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { COLORS, SPACING, TYPOGRAPHY } from "@/theme";

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

  const [isLoading, setIsLoading] = useState(true);
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
      >
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} style={styles.backButton} />
        <Text style={styles.headerTitle}>User Profile</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={styles.loading} />
      ) : (
        <>
          <ProfileAvatarEdit />

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

          <PrimaryButton title="SAVE" onPress={handleSave} disabled={isSaving} />
        </>
      )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
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
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: "800",
    color: COLORS.text,
  },
  fields: {
    gap: SPACING.md,
  },
  loading: {
    marginTop: SPACING.xl,
  },
});
