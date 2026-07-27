import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

type HomeHeaderProps = {
  hasUnread: boolean;
};

export default function HomeHeader({ hasUnread }: HomeHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.row}>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>C</Text>
        </View>
        <View>
          <Text style={styles.brandName}>CORDOVA</Text>
          <Text style={styles.brandSub}>RISKQ</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.bell}
        onPress={() => router.push("/notifications")}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="notifications-outline" size={18} color={COLORS.text} />
        {hasUnread ? <View style={styles.dot} /> : null}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: TYPOGRAPHY.subtitle,
  },
  brandName: {
    color: COLORS.primary,
    fontWeight: "800",
    fontSize: TYPOGRAPHY.caption,
    lineHeight: TYPOGRAPHY.caption,
  },
  brandSub: {
    color: COLORS.textTertiary,
    fontSize: 9,
    letterSpacing: 1,
  },
  bell: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    position: "absolute",
    top: 6,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
  },
});
