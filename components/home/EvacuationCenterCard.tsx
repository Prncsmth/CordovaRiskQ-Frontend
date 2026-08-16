import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import PlaceholderThumb from "@/components/common/PlaceholderThumb";
import { type EvacuationCenter } from "@/services/evacuation.service";
import {
  COLORS,
  FONT_FAMILY,
  RADIUS,
  SHADOW,
  SPACING,
  TYPOGRAPHY,
} from "@/theme";

type EvacuationCenterCardProps = {
  center: EvacuationCenter;
};

export default function EvacuationCenterCard({
  center,
}: EvacuationCenterCardProps) {
  const router = useRouter();
  const isOpen = center.status === "open";

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/evacuation-detail/${center.id}`)}
      activeOpacity={0.7}
    >
      <PlaceholderThumb style={styles.thumb} />
      <View style={styles.textCol}>
        <Text style={styles.name} numberOfLines={2}>
          {center.name}
        </Text>
        <Text style={styles.address} numberOfLines={1}>
          {center.address}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.distanceRow}>
            <Ionicons
              name="navigate-outline"
              size={13}
              color={COLORS.textSecondary}
            />
            <Text style={styles.meta}>{center.distanceKm} km away</Text>
          </View>

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
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.textFaint} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOW,
  },
  thumb: {
    width: 76,
    height: 76,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: FONT_FAMILY.displaySemibold,
    fontSize: TYPOGRAPHY.body,
    color: COLORS.text,
  },
  address: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: SPACING.xs,
  },
  distanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  meta: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },
  statusPill: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
  },
});
