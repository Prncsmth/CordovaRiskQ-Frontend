import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import PlaceholderThumb from "@/components/common/PlaceholderThumb";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

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
      <Ionicons name="camera-outline" size={22} color={COLORS.textTertiary} />
      <Text style={styles.emptyLabel}>Add Photo (Optional)</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  emptyBox: {
    height: 88,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
  },
  emptyLabel: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "600",
    color: COLORS.textTertiary,
  },
  attachedWrap: {
    height: 88,
    width: 88,
  },
  thumb: {
    width: 88,
    height: 88,
  },
  removeButton: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.text,
    alignItems: "center",
    justifyContent: "center",
  },
});
