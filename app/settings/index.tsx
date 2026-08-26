import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BackButton from "@/components/common/BackButton";
import { useAuth } from "@/context/AuthContext";
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

type ToggleRow = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

type NavRow = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { theme, toggleTheme } = useThemeMode();
  const { user, logout } = useAuth();
  const isResponder = user?.role === "responder";

  const [pushNotifications, setPushNotifications] = useState(true);
  const [locationAccess, setLocationAccess] = useState(true);

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Log out?", "You'll need to sign in again to continue.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

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
      value: pushNotifications,
      onValueChange: setPushNotifications,
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

  const supportRows: NavRow[] = [
    {
      key: "faqs",
      icon: "help-circle-outline",
      label: "FAQs",
      onPress: () => router.push("/faqs"),
    },
    {
      key: "contact-support",
      icon: "chatbubbles-outline",
      label: "Contact Support",
      onPress: () => router.push("/contact-support"),
    },
    {
      key: "emergency-contacts",
      icon: "call-outline",
      label: "Emergency Contacts",
      onPress: () => router.push("/contacts"),
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
        <BackButton onPress={() => router.back()} style={styles.backButton} />
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
              colors={COLORS.iconTileGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconCircle}
            >
              <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
            </LinearGradient>
            <Text style={styles.label}>App Version</Text>
            <Text style={styles.versionText}>{APP_VERSION}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function ToggleSettingRow({ row }: { row: ToggleRow }) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  return (
    <View style={styles.row}>
      <LinearGradient
        colors={COLORS.iconTileGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconCircle}
      >
        <Ionicons name={row.icon} size={18} color={COLORS.primary} />
      </LinearGradient>
      <View style={styles.textCol}>
        <Text style={styles.label}>{row.label}</Text>
        <Text style={styles.description}>{row.description}</Text>
      </View>
      <Switch
        value={row.value}
        onValueChange={(value) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          row.onValueChange(value);
        }}
        trackColor={{ true: COLORS.primary }}
        thumbColor={COLORS.white}
      />
    </View>
  );
}

function NavSettingRow({ row }: { row: NavRow }) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={styles.row}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          row.onPress();
        }}
        onPressIn={() => {
          scale.value = withTiming(0.98, { duration: 100 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 100 });
        }}
      >
        <LinearGradient
          colors={
            row.danger
              ? [`${COLORS.danger}1A`, `${COLORS.danger}1A`]
              : COLORS.iconTileGradient
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconCircle}
        >
          <Ionicons
            name={row.icon}
            size={18}
            color={row.danger ? COLORS.danger : COLORS.primary}
          />
        </LinearGradient>
        <Text
          style={[
            styles.label,
            styles.navLabel,
            row.danger && { color: COLORS.danger },
          ]}
        >
          {row.label}
        </Text>
        {!row.danger && (
          <Ionicons name="chevron-forward" size={18} color={COLORS.textFaint} />
        )}
      </Pressable>
    </Animated.View>
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
  textCol: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.text,
  },
  navLabel: {
    flex: 1,
  },
  description: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },
  versionText: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textTertiary,
  },
  });
}
