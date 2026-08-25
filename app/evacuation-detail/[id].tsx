import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PrimaryButton from "@/components/auth/PrimaryButton";
import BackButton from "@/components/common/BackButton";
import PlaceholderThumb from "@/components/common/PlaceholderThumb";
import {
  getEvacuationCenterById,
  type EvacuationCenter,
} from "@/services/evacuation.service";
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

const FACILITY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Water: "water-outline",
  "Medical Aid": "medkit-outline",
  Restrooms: "body-outline",
  Power: "flash-outline",
};

export default function EvacuationDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { id } = useLocalSearchParams<{ id: string }>();

  const [center, setCenter] = useState<EvacuationCenter | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }
    getEvacuationCenterById(id)
      .then((result) => setCenter(result ?? null))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return (
      <View style={styles.centerFlex}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (!center) {
    return (
      <View style={[styles.centerFlex, { paddingTop: insets.top }]}>
        <BackButton onPress={() => router.back()} style={styles.notFoundBack} />
        <Ionicons name="alert-circle-outline" size={32} color={COLORS.textTertiary} />
        <Text style={styles.notFoundTitle}>Center not found</Text>
        <Text style={styles.notFoundText}>
          This evacuation center may no longer be available.
        </Text>
      </View>
    );
  }

  const isOpen = center.status === "open";
  const occupancyPct = Math.min(
    100,
    Math.round((center.capacity.current / center.capacity.max) * 100),
  );

  const openDirections = () => {
    const label = encodeURIComponent(center.name);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${center.latitude},${center.longitude}`,
      android: `geo:${center.latitude},${center.longitude}?q=${center.latitude},${center.longitude}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${center.latitude},${center.longitude}`,
    });
    if (url) {
      void Linking.openURL(url);
    }
  };

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroWrap}>
        {center.photo ? (
          <Image
            source={center.photo}
            style={styles.heroThumb}
            resizeMode="cover"
          />
        ) : (
          <PlaceholderThumb style={styles.heroThumb} />
        )}
        <BackButton
          onPress={() => router.back()}
          style={[styles.backButton, { top: insets.top + SPACING.xs }]}
        />
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.name}>{center.name}</Text>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: isOpen ? COLORS.successBg : COLORS.primaryTint },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: isOpen ? COLORS.success : COLORS.primary },
              ]}
            >
              {isOpen ? "Open" : "Full"}
            </Text>
          </View>
        </View>

        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={15} color={COLORS.textSecondary} />
          <Text style={styles.address}>{center.address}</Text>
        </View>

        <View style={styles.distanceRow}>
          <Ionicons name="navigate-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.distance}>{center.distanceKm} km away</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Capacity</Text>
          <View style={styles.capacityCard}>
            <View style={styles.capacityHeader}>
              <Text style={styles.capacityValue}>
                {center.capacity.current} / {center.capacity.max} people
              </Text>
              <Text style={styles.capacityPct}>{occupancyPct}% full</Text>
            </View>
            <View style={styles.progressTrack}>
              <LinearGradient
                colors={isOpen ? [COLORS.tide, COLORS.tide] : [COLORS.primary, COLORS.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${occupancyPct}%` }]}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Facilities Available</Text>
          <View style={styles.facilitiesGrid}>
            {center.facilities.map((facility) => (
              <View key={facility} style={styles.facilityChip}>
                <LinearGradient
                  colors={COLORS.iconTileGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.facilityIcon}
                >
                  <Ionicons
                    name={FACILITY_ICONS[facility] ?? "checkmark-circle-outline"}
                    size={15}
                    color={COLORS.primary}
                  />
                </LinearGradient>
                <Text style={styles.facilityLabel}>{facility}</Text>
              </View>
            ))}
          </View>
        </View>

        <PrimaryButton title="GET DIRECTIONS" onPress={openDirections} />
      </View>
    </ScrollView>
  );
}

const HERO_HEIGHT = 240;

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerFlex: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
    gap: SPACING.xs,
    paddingHorizontal: SPACING.lg,
  },
  notFoundBack: {
    position: "absolute",
    left: SPACING.md,
  },
  notFoundTitle: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  notFoundText: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  content: {
    paddingBottom: SPACING.xl,
  },
  heroWrap: {
    ...SHADOW_LG,
  },
  heroThumb: {
    width: "100%",
    height: HERO_HEIGHT,
    borderRadius: 0,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
  },
  backButton: {
    position: "absolute",
    left: SPACING.md,
  },
  body: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    gap: SPACING.xs,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  name: {
    flex: 1,
    fontFamily: FONT_FAMILY.display,
    fontSize: TYPOGRAPHY.heading,
    color: COLORS.text,
  },
  statusPill: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    marginTop: 2,
  },
  statusText: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: SPACING.xs,
  },
  address: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  distance: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },
  section: {
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  sectionLabel: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginLeft: 2,
  },
  capacityCard: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    padding: SPACING.md,
    gap: SPACING.sm,
    ...SHADOW,
  },
  capacityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  capacityValue: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.text,
  },
  capacityPct: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },
  progressTrack: {
    height: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: RADIUS.full,
  },
  facilitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  facilityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    paddingVertical: 6,
    paddingRight: SPACING.md,
    paddingLeft: 6,
    ...SHADOW,
  },
  facilityIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  facilityLabel: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
    color: COLORS.text,
  },
  });
}
