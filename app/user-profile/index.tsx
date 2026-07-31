import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
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
import { COLORS, SPACING, TYPOGRAPHY } from "@/theme";

const MOCK_MOBILE = "+63 917 555 0142";

function splitName(name: string | undefined): {
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
  const { user } = useAuth();
  const initial = splitName(user?.name);

  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [email, setEmail] = useState(user?.email ?? "");
  const [mobile, setMobile] = useState(MOCK_MOBILE);

  function handleSave() {
    router.back();
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

      <PrimaryButton title="SAVE" onPress={handleSave} />
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
});
