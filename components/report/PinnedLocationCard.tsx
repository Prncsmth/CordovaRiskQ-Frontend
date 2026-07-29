import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import PlaceholderThumb from "@/components/common/PlaceholderThumb";
import { COLORS, SPACING, TYPOGRAPHY } from "@/theme";

type PinnedLocationCardProps = {
  address: string;
};

export default function PinnedLocationCard({ address }: PinnedLocationCardProps) {
  return (
    <View>
      <View style={styles.mapBox}>
        <PlaceholderThumb style={StyleSheet.absoluteFillObject} />
        <Ionicons name="location-sharp" size={28} color={COLORS.primary} />
      </View>
      <Text style={styles.caption}>{address} (auto-detected)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mapBox: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  caption: {
    marginTop: SPACING.xs,
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textTertiary,
  },
});
