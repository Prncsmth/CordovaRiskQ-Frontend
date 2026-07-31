import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";

import { COLORS, RADIUS } from "@/theme";

export default function ProfileAvatarEdit() {
  return (
    <View style={styles.wrap}>
      <View style={styles.circle}>
        <Ionicons name="person-outline" size={56} color={COLORS.primary} />
      </View>
      <View style={styles.badge}>
        <Ionicons name="camera" size={16} color={COLORS.white} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "center",
    width: 112,
    height: 112,
  },
  circle: {
    width: 112,
    height: 112,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.background,
  },
});
