import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import PlaceholderThumb from "@/components/common/PlaceholderThumb";
import { COLORS, RADIUS, SHADOW, SPACING, TYPOGRAPHY } from "@/theme";

type PhotoPickerProps = {
  attached: boolean;
  onToggle: () => void;
};

export default function PhotoPicker({ attached, onToggle }: PhotoPickerProps) {
  if (attached) {
    return (
      <View style={styles.attachedWrap}>
        <PlaceholderThumb style={styles.thumb} />
        <TouchableOpacity
          style={styles.removeButton}
          onPress={onToggle}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={14} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.emptyBox} onPress={onToggle} activeOpacity={0.7}>
      <View style={styles.emptyIcon}>
        <Ionicons name="camera" size={22} color={COLORS.primary} />
      </View>
      <Text style={styles.emptyLabel}>Add Photo</Text>
      <Text style={styles.emptyHint}>Tap to attach evidence</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  emptyBox: {
    height: 130,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xs,
  },
  emptyLabel: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.text,
  },
  emptyHint: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textTertiary,
  },
  attachedWrap: {
    height: 130,
    width: 130,
  },
  thumb: {
    width: 130,
    height: 130,
    borderRadius: RADIUS.lg,
    ...SHADOW,
  },
  removeButton: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.text,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.white,
  },
});
