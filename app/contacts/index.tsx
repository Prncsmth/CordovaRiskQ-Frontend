import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BackButton from "@/components/common/BackButton";
import {
  getHotlines,
  getMyContacts,
  type Contact,
  type Hotline,
} from "@/services/contacts.service";
import {
  useThemeColors,
  FONT_FAMILY,
  RADIUS,
  SHADOW,
  SHADOW_LG,
  SPACING,
  TYPOGRAPHY,
  type ColorPalette,
} from "@/theme";

// Local hotline agencies -> their real photo, shown in place of a generic
// icon in the Local Hotlines list. Keyed by Hotline.id from
// services/contacts.service.ts.
const HOTLINE_IMAGES: Record<string, ImageSourcePropType> = {
  pnp: require("@/assets/images/pulis.jpg"),
  bfp: require("@/assets/images/bfp.jpg"),
  "coast-guard": require("@/assets/images/coastguard.png"),
  "disaster-office": require("@/assets/images/mdrrmo.png"),
};

// Each agency's real-world designated color -- the same "colored left
// border on a neutral card" accent used on the home screen's
// EvacuationCenterCard, applied here per hotline row.
const HOTLINE_ACCENT_COLORS: Record<string, string> = {
  pnp: "#1E3A8A",
  bfp: "#DC2626",
  "coast-guard": "#0369A1",
  "disaster-office": "#F59E0B",
};

export default function ContactsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [hotlines, setHotlines] = useState<Hotline[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getHotlines(), getMyContacts()]).then(
      ([loadedHotlines, loadedContacts]) => {
        setHotlines(loadedHotlines);
        setContacts(loadedContacts);
        setIsLoading(false);
      },
    );
  }, []);

  const callNumber = (number: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void Linking.openURL(`tel:${number.replace(/[^+\d]/g, "")}`);
  };

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
        <Text style={styles.headerTitle}>Emergency Contacts</Text>
      </View>

      <View style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: COLORS.primary }]}>
          <Ionicons name="call" size={22} color={COLORS.white} />
        </View>
        <Text style={styles.eyebrow}>CORDOVA RESPONSE NETWORK</Text>
        <Text style={styles.title}>Help is closer than you think.</Text>
        <Text style={styles.subtitle}>
          Reach the right team quickly. Tap any number to call.
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.sosBanner, pressed && styles.pressed]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push("/(tabs)/home");
        }}
      >
        <View style={[styles.sosIcon, { backgroundColor: COLORS.primary }]}>
          <Ionicons name="warning" size={18} color={COLORS.white} />
        </View>
        <View style={styles.sosCopy}>
          <Text style={styles.sosTitle}>Immediate danger?</Text>
          <Text style={styles.sosText}>
            Use SOS to share your location with responders.
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={18} color={COLORS.primary} />
      </Pressable>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Local Hotlines</Text>
        <View style={styles.available}>
          <View style={styles.availableDot} />
          <Text style={styles.availableText}>Available</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <View style={styles.card}>
          {hotlines.map((hotline, index) => (
            <View
              key={hotline.id}
              style={index < hotlines.length - 1 ? styles.rowDivider : undefined}
            >
              <ContactRow
                image={HOTLINE_IMAGES[hotline.id]}
                accentColor={HOTLINE_ACCENT_COLORS[hotline.id]}
                icon="call-outline"
                iconTint="primary"
                name={hotline.name}
                number={hotline.number}
                onPress={() => callNumber(hotline.number)}
              />
            </View>
          ))}
        </View>
      )}

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>My Trusted Contacts</Text>
        <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.tide} />
      </View>

      {contacts.length > 0 ? (
        <View style={styles.card}>
          {contacts.map((contact, index) => (
            <View
              key={contact.id}
              style={index < contacts.length - 1 ? styles.rowDivider : undefined}
            >
              <ContactRow
                icon="person-outline"
                iconTint="tide"
                name={contact.name}
                number={contact.number}
                onPress={() => callNumber(contact.number)}
              />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="person-add-outline" size={24} color={COLORS.textTertiary} />
          <Text style={styles.emptyText}>No trusted contacts yet.</Text>
        </View>
      )}

      <Text style={styles.disclaimer}>
        Keep your trusted contacts updated so someone you know can be reached
        when it matters.
      </Text>
    </ScrollView>
  );
}

function ContactRow({
  icon,
  iconTint,
  image,
  accentColor,
  name,
  number,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconTint: "primary" | "tide";
  image?: ImageSourcePropType;
  accentColor?: string;
  name: string;
  number: string;
  onPress: () => void;
}) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const gradientColors: readonly [string, string] =
    iconTint === "primary"
      ? COLORS.iconTileGradient
      : [COLORS.tideTint, COLORS.tideTint];
  const iconColor = iconTint === "primary" ? COLORS.primary : COLORS.tide;
  // Local hotlines get a green call button (universally reads as "call" /
  // "available") -- personal contacts keep the app's primary red.
  const callButtonColors: readonly [string, string] =
    iconTint === "primary"
      ? [COLORS.success, COLORS.success]
      : [COLORS.primary, COLORS.primaryDark];

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={[
          styles.contactRow,
          accentColor && { borderLeftColor: accentColor, borderLeftWidth: 4, paddingLeft: SPACING.sm - 4 },
        ]}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withTiming(0.98, { duration: 100 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 100 });
        }}
      >
        {image ? (
          <Image source={image} style={styles.contactIcon} resizeMode="cover" />
        ) : (
          <View
            style={[
              styles.contactIcon,
              { backgroundColor: gradientColors[0] },
            ]}
          >
            <Ionicons name={icon} size={19} color={iconColor} />
          </View>
        )}
        <View style={styles.contactCopy}>
          <Text style={styles.contactName}>{name}</Text>
          <Text style={styles.contactNumber}>{number}</Text>
        </View>
        <View
          style={[styles.callButton, { backgroundColor: callButtonColors[0] }]}
        >
          <Ionicons name="call" size={15} color={COLORS.white} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: SPACING.md, gap: SPACING.md },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xs,
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
  hero: { paddingTop: SPACING.xs, paddingBottom: SPACING.sm },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
    ...SHADOW_LG,
  },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    marginBottom: SPACING.xs,
  },
  title: {
    fontFamily: FONT_FAMILY.display,
    color: COLORS.text,
    fontSize: TYPOGRAPHY.title,
    lineHeight: 36,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.caption,
    lineHeight: 22,
    marginTop: SPACING.sm,
  },
  sosBanner: {
    backgroundColor: COLORS.primaryTint,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pressed: { opacity: 0.85 },
  sosIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  sosCopy: { flex: 1 },
  sosTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "800",
  },
  sosText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.small,
    lineHeight: 18,
    marginTop: 2,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: SPACING.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  available: { flexDirection: "row", alignItems: "center", gap: 5 },
  availableDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  availableText: {
    color: COLORS.success,
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
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
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.sm + 4,
  },
  contactIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  contactCopy: { flex: 1 },
  contactName: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "700",
  },
  contactNumber: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.small,
    marginTop: 3,
  },
  callButton: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
  },
  loading: { height: 140, alignItems: "center", justifyContent: "center" },
  emptyState: {
    alignItems: "center",
    gap: SPACING.xs,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.small,
  },
  disclaimer: {
    color: COLORS.textTertiary,
    fontSize: TYPOGRAPHY.small,
    lineHeight: 19,
    textAlign: "center",
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
  },
  });
}
