import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";
import type { ResponderStatus, TeamMember } from "@/types/responder";

const STATUS_META: Record<ResponderStatus, { label: string; color: string }> = {
  on_the_way: { label: "On the way", color: COLORS.secondary },
  preparing: { label: "Preparing", color: COLORS.warning },
  online: { label: "Online", color: COLORS.success },
};

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
  const status = STATUS_META[member.status];

  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(member.name)}</Text>
      </View>

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

      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: status.color }]} />
        <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderMuted,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.sm,
  },
  avatarText: {
    color: COLORS.primary,
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
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
  },
  statusLabel: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "600",
  },
});
