import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";

import { COLORS, RADIUS, SHADOW, SPACING } from "@/theme";

type HomeHeaderProps = {
  hasUnread: boolean;
};

export default function HomeHeader({ hasUnread }: HomeHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.row}>
      <View style={styles.brand}>
        <Image
          source={require("@/assets/images/riskq.png")}
          style={styles.logo}
          resizeMode="contain"
        />
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
    width: 36,
    height: 36,
  },
  bell: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW,
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
