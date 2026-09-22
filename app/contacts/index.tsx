import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BackButton from "@/components/common/BackButton";
import ContactRow from "@/components/contacts/ContactRow";
import { getHotlines, type Hotline } from "@/services/contacts.service";
import { useAuth } from "@/context/AuthContext";
import {
  useThemeColors,
  FONT_FAMILY,
  RADIUS,
  SHADOW,
  SPACING,
  TYPOGRAPHY,
  type ColorPalette,
} from "@/theme";

// Each hotline's agency -> its real-world role, expressed as an icon +
// accent color (ambulance/rescue amber, police navy, fire red, coast guard
// blue, medical green) instead of one generic call icon for every row.
// Keyed by Hotline.id from services/contacts.service.ts.
const HOTLINE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  mdrrmo: "medkit-outline",
  police: "shield-checkmark-outline",
  bfp: "flame-outline",
  "coast-guard": "boat-outline",
  "health-center": "medical-outline",
  "red-cross": "heart-outline",
};

const HOTLINE_ACCENT_COLORS: Record<string, string> = {
  mdrrmo: "#F59E0B",
  police: "#1E3A8A",
  bfp: "#DC2626",
  "coast-guard": "#0369A1",
  "health-center": "#16A34A",
  "red-cross": "#DC2626",
};

// Official agency seals, shown in place of the icon tile.
const HOTLINE_IMAGES: Record<string, ImageSourcePropType> = {
  mdrrmo: require("@/assets/images/mdrrmo.png"),
  police: require("@/assets/images/police.png"),
  bfp: require("@/assets/images/bfp.png"),
  "coast-guard": require("@/assets/images/coastguard.png"),
  "health-center": require("@/assets/images/health-center.png"),
  "red-cross": require("@/assets/images/red-cross.png"),
};

// Last-resort fallback, used ONLY when the live GET /api/hotlines call
// fails (e.g. offline/backend down). These are the same six hotlines that
// used to be hardcoded in services/contacts.service.ts before it was wired
// to the real backend -- kept verbatim so this disaster-response screen
// never renders empty just because the network is down. The backend is
// still the source of truth whenever it's reachable.
const FALLBACK_HOTLINES: Hotline[] = [
  {
    id: "mdrrmo",
    name: "Cordova MDRRMO (Ambulance / Rescue)",
    number: "0917-149-8457",
    category: "medical",
  },
  {
    id: "police",
    name: "Cordova Police Station",
    number: "0998-598-6392",
    category: "police",
  },
  {
    id: "bfp",
    name: "Bureau of Fire Protection (BFP) - Cordova",
    number: "0933-394-9073",
    category: "fire",
  },
  {
    id: "coast-guard",
    name: "Philippine Coast Guard (PCG) - Cordova",
    number: "0927-941-2486",
    category: "maritime",
  },
  {
    id: "health-center",
    name: "Cordova Primary Health Care Facility",
    number: "0967-491-5579",
    category: "medical",
  },
  {
    id: "red-cross",
    name: "Philippine Red Cross (Lapu-Lapu/Cordova Chapter)",
    number: "0969-450-8482",
    category: "medical",
  },
];

// Groups hotlines by the kind of emergency they respond to, so the list
// reads as scannable sections instead of one flat stack. Order here is the
// display order.
type CategoryKey = "police" | "fire" | "medical" | "maritime";

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: "police", label: "Police & Safety" },
  { key: "fire", label: "Fire & Rescue" },
  { key: "medical", label: "Medical & Health" },
  { key: "maritime", label: "Maritime" },
];

// Trailing catch-all so a hotline whose category doesn't match one of the
// 4 known keys above (e.g. a typo'd value -- Hotline.category is an
// unvalidated string server-side) still renders instead of silently
// vanishing from the screen.
const OTHER_CATEGORY = { key: "other" as const, label: "Other" };

export default function ContactsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [hotlines, setHotlines] = useState<Hotline[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    getHotlines(token)
      .then(setHotlines)
      // Backend unreachable -- fall back to the last-known-good hotline
      // list rather than leaving the screen empty (see FALLBACK_HOTLINES).
      .catch(() => setHotlines(FALLBACK_HOTLINES))
      .finally(() => setIsLoading(false));
  }, [token]);

  const groupedHotlines = useMemo(() => {
    const knownKeys = new Set<string>(CATEGORIES.map((c) => c.key));
    return [
      ...CATEGORIES.map((category) => ({
        ...category,
        hotlines: hotlines.filter((h) => h.category === category.key),
      })),
      {
        ...OTHER_CATEGORY,
        hotlines: hotlines.filter((h) => !knownKeys.has(h.category)),
      },
    ].filter((group) => group.hotlines.length > 0);
  }, [hotlines]);

  const callNumber = (number: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Some rows list more than one number ("A / B") -- dial the primary one.
    const primary = number.split("/")[0];
    void Linking.openURL(`tel:${primary.replace(/[^+\d]/g, "")}`);
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
        <Text style={styles.headerTitle}>Emergency Hotlines</Text>
      </View>

      <View style={styles.heroCard}>
        <Ionicons name="call" size={22} color={COLORS.tide} style={styles.heroIcon} />
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>One tap connects you to help</Text>
          <Text style={styles.heroSubtitle}>
            Official Cordova responders, ready when you need them.
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>Official Cordova Hotlines</Text>
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
        <View style={styles.categoryList}>
          {groupedHotlines.map((group) => (
            <View key={group.key} style={styles.categoryBlock}>
              <View style={styles.categoryHeading}>
                <Text style={styles.categoryLabel}>{group.label}</Text>
              </View>
              <View style={styles.card}>
                {group.hotlines.map((hotline, index) => (
                  <View
                    key={hotline.id}
                    style={
                      index < group.hotlines.length - 1 ? styles.rowDivider : undefined
                    }
                  >
                    <ContactRow
                      icon={HOTLINE_ICONS[hotline.id] ?? "call-outline"}
                      accentColor={HOTLINE_ACCENT_COLORS[hotline.id] ?? COLORS.primary}
                      image={HOTLINE_IMAGES[hotline.id]}
                      name={hotline.name}
                      number={hotline.number}
                      onPress={() => callNumber(hotline.number)}
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
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
    marginBottom: -10,
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
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    padding: SPACING.md,
  },
  // No circle background -- a fixed width keeps it aligned with the copy
  // beside it, matching the plain-icon treatment used elsewhere.
  heroIcon: {
    width: 30,
    textAlign: "center",
  },
  heroCopy: { flex: 1, gap: 2 },
  heroTitle: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "800",
  },
  heroSubtitle: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.small,
    lineHeight: 18,
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
  categoryList: { gap: SPACING.lg },
  categoryBlock: { gap: SPACING.xs + 2 },
  categoryHeading: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 2,
  },
  categoryLabel: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "800",
    color: COLORS.gray,
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
  loading: { height: 140, alignItems: "center", justifyContent: "center" },
  });
}
