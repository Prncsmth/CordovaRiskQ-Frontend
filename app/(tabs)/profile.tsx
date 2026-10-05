import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import LogoutDialog from "@/components/common/LogoutDialog";
import MenuRow from "@/components/profile/MenuRow";
import ProfileHeader from "@/components/profile/ProfileHeader";
import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import { useTabBarHeight } from "@/context/TabBarHeightContext";
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
  const tabBarHeight = useTabBarHeight();
  const { pushNotificationsEnabled, setPushNotificationsEnabled } = usePreferences();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // The dialog stays open (showing "Logging out…") until logout -- which
  // also clears this phone's push token -- has finished.
  async function confirmLogout() {
    await logout();
    setShowLogoutConfirm(false);
    router.replace("/(auth)/login");
  }

  // Grouped by what the user is trying to do, each group in its own card --
  // instead of one long mixed list under a single "Settings" heading.
  const sections: { title: string; items: MenuItem[] }[] = [
    {
      title: "Account",
      items: [
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
      ],
    },
    {
      title: "Preferences",
      items: [
        {
          key: "push-notification",
          icon: "notifications-outline",
          label: "Push Notifications",
          right: (
            <Switch
              value={pushNotificationsEnabled}
              onValueChange={setPushNotificationsEnabled}
              trackColor={{ true: COLORS.primary }}
              thumbColor={COLORS.white}
              accessibilityLabel="Push Notifications"
            />
          ),
        },
        {
          key: "settings",
          icon: "settings-outline",
          label: "Settings",
          onPress: () => router.push("/settings"),
        },
      ],
    },
    {
      title: "Help & Support",
      items: [
        {
          key: "emergency-contacts",
          icon: "call-outline",
          label: "Emergency Hotlines",
          onPress: () => router.push("/contacts"),
        },
        {
          key: "faqs",
          icon: "help-circle-outline",
          label: "FAQs",
          onPress: () => router.push("/faqs"),
        },
        {
          key: "contact-support",
          icon: "headset-outline",
          label: "Contact Support",
          onPress: () => router.push("/contact-support"),
        },
      ],
    },
  ];

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + SPACING.sm, paddingBottom: tabBarHeight + SPACING.md },
      ]}
    >
      <Text style={styles.title}>Profile</Text>

      <ProfileHeader
        name={user?.name ?? "User"}
        email={user?.email}
        onPress={() => router.push("/user-profile")}
      />

      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionHeading}>{section.title}</Text>
          <View style={styles.menuCard}>
            {section.items.map((item, index) => (
              <View
                key={item.key}
                style={index < section.items.length - 1 ? styles.menuRowDivider : undefined}
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
        </View>
      ))}

      <Pressable
        style={({ pressed }) => [styles.logoutCard, pressed && styles.pressed]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowLogoutConfirm(true);
        }}
      >
        <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
        <Text style={styles.logoutText}>Log Out</Text>
      </Pressable>

      <LogoutDialog
        visible={showLogoutConfirm}
        role="citizen"
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={confirmLogout}
      />
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
  section: {
    gap: SPACING.xs,
  },
  sectionHeading: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "600",
    color: COLORS.textSecondary,
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
  logoutCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    paddingVertical: SPACING.md,
    ...SHADOW,
  },
  logoutText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: "700",
    color: COLORS.danger,
  },
  pressed: {
    opacity: 0.85,
  },
  });
}
