import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Avatar } from "@/components/common/Avatar";
import { COLORS, SPACING, TYPOGRAPHY } from "@/theme";

type ProfileHeaderProps = {
  name: string;
  onLogout: () => void;
};

export default function ProfileHeader({ name, onLogout }: ProfileHeaderProps) {
  return (
    <View style={styles.row}>
      <Avatar name={name} />
      <View style={styles.textCol}>
        <Text style={styles.welcome}>Welcome</Text>
        <Text style={styles.name}>{name}</Text>
      </View>
      <TouchableOpacity
        onPress={onLogout}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="log-out-outline" size={24} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  textCol: {
    flex: 1,
  },
  welcome: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },
  name: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: "800",
    color: COLORS.text,
  },
});
