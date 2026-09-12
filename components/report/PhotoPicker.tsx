import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { RADIUS, SHADOW, SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

export type SelectedPhoto = {
  uri: string;
  fileName: string;
};

type PhotoPickerProps = {
  photo: SelectedPhoto | null;
  onSelect: (photo: SelectedPhoto) => void;
  onRemove: () => void;
};

function fileNameFromAsset(asset: ImagePicker.ImagePickerAsset): string {
  if (asset.fileName) return asset.fileName;
  const fromUri = asset.uri.split("/").pop();
  return fromUri && fromUri.length > 0 ? fromUri : "photo.jpg";
}

async function pickFromCamera(): Promise<SelectedPhoto | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      "Camera access needed",
      "Allow camera access in your device settings to take a photo.",
    );
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    quality: 0.8,
  });

  if (result.canceled || !result.assets[0]) return null;
  return {
    uri: result.assets[0].uri,
    fileName: fileNameFromAsset(result.assets[0]),
  };
}

async function pickFromGallery(): Promise<SelectedPhoto | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      "Photo access needed",
      "Allow photo library access in your device settings to choose a photo.",
    );
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    quality: 0.8,
  });

  if (result.canceled || !result.assets[0]) return null;
  return {
    uri: result.assets[0].uri,
    fileName: fileNameFromAsset(result.assets[0]),
  };
}

export default function PhotoPicker({ photo, onSelect, onRemove }: PhotoPickerProps) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function openPickerSheet() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Add Photo", undefined, [
      {
        text: "Take Photo",
        onPress: async () => {
          const picked = await pickFromCamera();
          if (picked) onSelect(picked);
        },
      },
      {
        text: "Choose from Gallery",
        onPress: async () => {
          const picked = await pickFromGallery();
          if (picked) onSelect(picked);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  if (photo) {
    return (
      <View style={styles.previewWrap}>
        <Image source={{ uri: photo.uri }} style={styles.previewThumb} />
        <View style={styles.previewInfo}>
          <Text style={styles.previewFileName} numberOfLines={1}>
            {photo.fileName}
          </Text>
          <View style={styles.previewActions}>
            <Pressable
              style={styles.actionButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                openPickerSheet();
              }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="camera-outline" size={14} color={COLORS.tide} />
              <Text style={[styles.actionButtonText, { color: COLORS.tide }]}>
                Change Photo
              </Text>
            </Pressable>
            <Pressable
              style={styles.actionButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onRemove();
              }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
              <Text style={[styles.actionButtonText, { color: COLORS.danger }]}>
                Remove Photo
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={styles.emptyBox}
        onPress={openPickerSheet}
        onPressIn={() => {
          // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value, mutable by design
          scale.value = withTiming(0.98, { duration: 100 });
        }}
        onPressOut={() => {
          // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value, mutable by design
          scale.value = withTiming(1, { duration: 100 });
        }}
      >
        <LinearGradient
          colors={COLORS.iconTileGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.emptyIcon}
        >
          <Ionicons name="camera" size={22} color={COLORS.primary} />
        </LinearGradient>
        <Text style={styles.emptyLabel}>Add Photo</Text>
        <Text style={styles.emptyHint}>Tap to attach evidence</Text>
      </Pressable>
    </Animated.View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
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
      borderWidth: 1,
      borderColor: COLORS.primaryLight,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: SPACING.xs,
      shadowColor: COLORS.primary,
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
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
    previewWrap: {
      flexDirection: "row",
      gap: SPACING.md,
      padding: SPACING.sm,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.background,
      ...SHADOW,
    },
    previewThumb: {
      width: 84,
      height: 84,
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.surface,
    },
    previewInfo: {
      flex: 1,
      justifyContent: "center",
      gap: SPACING.xs,
    },
    previewFileName: {
      fontSize: TYPOGRAPHY.caption,
      fontWeight: "700",
      color: COLORS.text,
    },
    previewActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: SPACING.sm,
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderRadius: RADIUS.full,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 6,
    },
    actionButtonText: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
    },
  });
}
