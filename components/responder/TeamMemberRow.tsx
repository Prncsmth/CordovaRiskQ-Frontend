import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  RADIUS,
  SHADOW,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";
import type { ResponderStatus, TeamMember } from "@/types/responder";

function getStatusMeta(
  COLORS: ColorPalette,
): Record<ResponderStatus, { label: string; color: string }> {
  return {
    on_the_way: { label: "On the way", color: COLORS.secondary },
    preparing: { label: "Preparing", color: COLORS.warning },
    online: { label: "Online", color: COLORS.success },
  };
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

export default function TeamMemberRow({ member }: { member: TeamMember }) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const status = getStatusMeta(COLORS)[member.status];

  return (
    <View style={styles.row}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.avatar}
      >
        <Text style={styles.avatarText}>{getInitials(member.name)}</Text>
      </LinearGradient>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{member.name}</Text>
          {member.isCaptain ? (
            <View style={styles.captainBadge}>
              <Text style={styles.captainText}>Captain</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View
        style={[styles.statusChip, { backgroundColor: `${status.color}1A` }]}
      >
        <View style={[styles.statusDot, { backgroundColor: status.color }]} />
        <Text style={[styles.statusLabel, { color: status.color }]}>
          {status.label}
        </Text>
      </View>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.sm + 2,
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
    ...SHADOW,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  avatarText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: TYPOGRAPHY.caption,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    color: COLORS.text,
    fontWeight: "600",
    fontSize: TYPOGRAPHY.body,
  },
  captainBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  captainText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "700",
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: RADIUS.full,
  },
  statusLabel: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
  },
  });
}
