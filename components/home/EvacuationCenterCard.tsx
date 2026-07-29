import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import PlaceholderThumb from "@/components/common/PlaceholderThumb";
import { type EvacuationCenter } from "@/services/evacuation.service";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

type EvacuationCenterCardProps = {
  center: EvacuationCenter;
};

export default function EvacuationCenterCard({
  center,
}: EvacuationCenterCardProps) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/evacuation-detail/${center.id}`)}
      activeOpacity={0.7}
    >
      <PlaceholderThumb style={styles.thumb} />
      <View style={styles.textCol}>
        <Text style={styles.name}>{center.name}</Text>
        <Text style={styles.meta}>
          {center.distanceKm} km away ·{" "}
          {center.status === "open" ? "Open" : "Full"}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={COLORS.textFaint} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  thumb: {
    width: 44,
    height: 44,
  },
  textCol: {
    flex: 1,
  },
  name: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.text,
  },
  meta: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
