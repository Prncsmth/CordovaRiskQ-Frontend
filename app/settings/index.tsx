import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BackButton from "@/components/common/BackButton";
import {
  Dialog,
  DialogActions,
  DialogButton,
  DialogIcon,
  DialogMessage,
  DialogTitle,
} from "@/components/common/Dialog";
import NavSettingRow, { type NavRow } from "@/components/settings/NavSettingRow";
import ToggleSettingRow, { type ToggleRow } from "@/components/settings/ToggleSettingRow";
import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import { useTour } from "@/context/TourContext";
import { useThemeMode } from "@/context/ThemeContext";
import {
  useThemeColors,
  FONT_FAMILY,
  RADIUS,
  SHADOW,
  SPACING,
  TYPOGRAPHY,
  type ColorPalette,
} from "@/theme";

const APP_VERSION = "1.0.0";

type SettingsScreenProps = {
  // Set by the responder tab wrapper (app/responder/(tabs)/settings.tsx) --
  // this screen is the root of a persistent tab there, so router.back()
  // wouldn't have anywhere sensible to go. The pushed route (reached from
  // Dashboard's gear icon, or the citizen profile screen) keeps the
  // default, unchanged behavior.
  hideBackButton?: boolean;
};

export default function SettingsScreen({
  hideBackButton = false,
}: SettingsScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { theme, toggleTheme } = useThemeMode();
  const { user, logout } = useAuth();
  const tour = useTour();
  const isResponder = user?.role === "responder";

  const { pushNotificationsEnabled, setPushNotificationsEnabled } = usePreferences();
  const [locationAccess, setLocationAccess] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowLogoutConfirm(true);
  };

  async function confirmLogout() {
    setShowLogoutConfirm(false);
    await logout();
    router.replace("/(auth)/login");
  }

  // Settings is the only account entry point responders have (they have no
  // Profile tab the way citizens do), so it needs to carry the account
  // actions that citizens instead reach from app/(tabs)/profile.tsx.
  const accountRows: NavRow[] = [
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
    ...(isResponder
      ? [
          {
            key: "completed-incidents",
            icon: "checkmark-done-outline",
            label: "Completed Incidents",
            onPress: () => router.push("/responder/completed"),
          } satisfies NavRow,
        ]
      : []),
    {
      key: "logout",
      icon: "log-out-outline",
      label: "Log Out",
      onPress: handleLogout,
      danger: true,
    },
  ];

  const preferenceRows: ToggleRow[] = [
    {
      key: "push",
      icon: "notifications-outline",
      label: "Push Notifications",
      description: "Alerts, advisories, and report updates",
      value: pushNotificationsEnabled,
      onValueChange: setPushNotificationsEnabled,
    },
    {
      key: "location",
      icon: "location-outline",
      label: "Location Access",
      description: isResponder
        ? "Used to navigate to incidents and share your live location"
        : "Used to find nearby evacuation centers",
      value: locationAccess,
      onValueChange: setLocationAccess,
    },
    {
      key: "dark-mode",
      icon: "moon-outline",
      label: "Dark Mode",
      description: "Switch between light and dark appearance",
      value: theme === "dark",
      onValueChange: () => toggleTheme(),
    },
  ];

  // FAQs and Emergency Hotlines are citizen-facing content (how to report,
  // who to call in an emergency) -- responders ARE the emergency response,
  // so neither applies to them. Contact Support stays for both.
  const supportRows: NavRow[] = [
    ...(isResponder
      ? []
      : [
          {
            key: "faqs",
            icon: "help-circle-outline",
            label: "FAQs",
            onPress: () => router.push("/faqs"),
          } satisfies NavRow,
        ]),
    {
      key: "contact-support",
      icon: "chatbubbles-outline",
      label: "Contact Support",
      onPress: () => router.push("/contact-support"),
    },
    ...(isResponder
      ? []
      : [
          {
            key: "emergency-contacts",
            icon: "call-outline",
            label: "Emergency Hotlines",
            onPress: () => router.push("/contacts"),
          } satisfies NavRow,
        ]),
    {
      key: "view-tutorial",
      icon: "play-circle-outline",
      label: "View App Tutorial",
      onPress: () => {
        tour.startManualTour();
        router.push(isResponder ? "/responder" : "/(tabs)/home");
      },
    },
  ];

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + SPACING.sm, paddingBottom: SPACING.xl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        {hideBackButton ? null : (
          <BackButton onPress={() => router.back()} style={styles.backButton} />
        )}
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          {accountRows.map((row, index) => (
            <View
              key={row.key}
              style={index < accountRows.length - 1 ? styles.rowDivider : undefined}
            >
              <NavSettingRow row={row} />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Preferences</Text>
        <View style={styles.card}>
          {preferenceRows.map((row, index) => (
            <View
              key={row.key}
              style={index < preferenceRows.length - 1 ? styles.rowDivider : undefined}
            >
              <ToggleSettingRow row={row} />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Support</Text>
        <View style={styles.card}>
          {supportRows.map((row, index) => (
            <View
              key={row.key}
              style={index < supportRows.length - 1 ? styles.rowDivider : undefined}
            >
              <NavSettingRow row={row} />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>About</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <LinearGradient
              colors={[COLORS.surface, COLORS.surface]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconCircle}
            >
              <Ionicons name="information-circle-outline" size={18} color={COLORS.gray} />
            </LinearGradient>
            <Text style={styles.label}>App Version</Text>
            <Text style={styles.versionText}>{APP_VERSION}</Text>
          </View>
        </View>
      </View>

      <Modal
        transparent
        visible={showLogoutConfirm}
        animationType="fade"
        onRequestClose={() => setShowLogoutConfirm(false)}
      >
        <Dialog>
          <DialogIcon name="log-out-outline" color={COLORS.primary} />
          <DialogTitle>Log out?</DialogTitle>
          <DialogMessage>You&apos;ll need to sign in again to continue.</DialogMessage>
          <DialogActions>
            <DialogButton
              label="Cancel"
              variant="secondary"
              onPress={() => setShowLogoutConfirm(false)}
            />
            <DialogButton label="Log Out" variant="primary" onPress={confirmLogout} />
          </DialogActions>
        </Dialog>
      </Modal>
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
  section: {
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
  card: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    paddingHorizontal: SPACING.md,
    ...SHADOW,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderMuted,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.sm + 4,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.text,
  },
  versionText: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textTertiary,
  },
  });
}
