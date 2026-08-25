import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ContactSupportCard from "@/components/profile/ContactSupportCard";
import MenuRow from "@/components/profile/MenuRow";
import ProfileHeader from "@/components/profile/ProfileHeader";
import { useAuth } from "@/context/AuthContext";
import {
  FONT_FAMILY,
  RADIUS,
  SHADOW,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";

type MenuItem = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  right?: React.ReactNode;
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { logout, user } = useAuth();
  const router = useRouter();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [notificationsOn, setNotificationsOn] = useState(true);

  function handleLogout() {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  const menuItems: MenuItem[] = [
    {
      key: "user-profile",
      icon: "person-outline",
      label: "User Profile",
      onPress: () => router.push("/user-profile"),
    },
    {
      key: "change-password",
      icon: "lock-closed-outline",
      label: "Change Password",
      onPress: () => router.push("/change-password"),
    },
    {
      key: "emergency-contacts",
      icon: "call-outline",
      label: "Emergency Contacts",
      onPress: () => router.push("/contacts"),
    },
    {
      key: "faqs",
      icon: "help-circle-outline",
      label: "FAQs",
      onPress: () => router.push("/faqs"),
    },
    {
      key: "settings",
      icon: "settings-outline",
      label: "Settings",
      onPress: () => router.push("/settings"),
    },
    {
      key: "push-notification",
      icon: "notifications-outline",
      label: "Push Notification",
      right: (
        <Switch
          value={notificationsOn}
          onValueChange={setNotificationsOn}
          trackColor={{ true: COLORS.primary }}
          thumbColor={COLORS.white}
        />
      ),
    },
  ];

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + SPACING.sm, paddingBottom: SPACING.xl },
      ]}
    >
      <Text style={styles.title}>Profile</Text>

      <ProfileHeader name={user?.name ?? "User"} onLogout={handleLogout} />

      <Text style={styles.sectionHeading}>Settings</Text>
      <View style={styles.menuCard}>
        {menuItems.map((item, index) => (
          <View
            key={item.key}
            style={index < menuItems.length - 1 ? styles.menuRowDivider : undefined}
          >
            <MenuRow
              icon={item.icon}
              label={item.label}
              onPress={item.onPress}
              right={item.right}
            />
          </View>
        ))}
      </View>

      <ContactSupportCard />
    </ScrollView>
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
    gap: SPACING.md,
  },
  title: {
    fontFamily: FONT_FAMILY.display,
    fontSize: TYPOGRAPHY.title,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  sectionHeading: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginLeft: 2,
  },
  menuCard: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    paddingHorizontal: SPACING.md,
    ...SHADOW,
  },
  menuRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderMuted,
  },
  });
}
