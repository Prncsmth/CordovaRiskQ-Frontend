import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import React, { useMemo } from "react";
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { useProfilePhoto } from "@/context/ProfilePhotoContext";
import { useThemeColors, RADIUS, SPACING, TYPOGRAPHY, type ColorPalette } from "@/theme";

async function pickFromCamera(): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      "Camera access needed",
      "Allow camera access in your device settings to take a profile picture.",
    );
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  return result.canceled ? null : (result.assets[0]?.uri ?? null);
}

async function pickFromLibrary(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      "Photo access needed",
      "Allow photo library access in your device settings to choose a profile picture.",
    );
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  return result.canceled ? null : (result.assets[0]?.uri ?? null);
}

// Who can see the photo, matching what the backend shares (see its
// tracking.service.ts and reporterContact.ts).
const PHOTO_VISIBILITY_NOTE = {
  responder:
    "Citizens you're responding to will see this photo, so they know who's coming.",
  citizen:
    "Optional. Only the responders helping with your report can see it, to help them find you.",
};

export default function ProfileAvatarEdit() {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { photoUri, setPhotoUri, isSaving } = useProfilePhoto();
  const { user } = useAuth();
  const isResponder = user?.role === "responder";

  // Saved to the account, so a lost connection can fail it -- say so
  // instead of silently keeping the old photo.
  async function save(uri: string | null) {
    try {
      await setPhotoUri(uri);
    } catch (error) {
      Alert.alert(
        uri ? "Photo not saved" : "Photo not removed",
        error instanceof Error && error.message
          ? error.message
          : "Check your internet connection and try again.",
      );
    }
  }

  function handlePress() {
    if (isSaving) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const options: { text: string; style?: "cancel" | "destructive"; onPress?: () => void }[] = [
      {
        text: "Take Photo",
        onPress: async () => {
          const uri = await pickFromCamera();
          if (uri) await save(uri);
        },
      },
      {
        text: "Choose from Library",
        onPress: async () => {
          const uri = await pickFromLibrary();
          if (uri) await save(uri);
        },
      },
    ];

    if (photoUri) {
      options.push({
        text: "Remove Photo",
        style: "destructive",
        onPress: () => void save(null),
      });
    }

    options.push({ text: "Cancel", style: "cancel" });

    Alert.alert("Profile Photo", PHOTO_VISIBILITY_NOTE[isResponder ? "responder" : "citizen"], options);
  }

  // A plain photo circle with a thin border and a small camera badge --
  // no gradient ring -- plus a clear "Change photo" label under it.
  return (
    <Pressable
      style={styles.wrap}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel="Change profile photo"
      accessibilityState={{ busy: isSaving }}
      disabled={isSaving}
    >
      <View>
        <View style={styles.circle}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : (
            <Ionicons name="person" size={44} color={COLORS.textTertiary} />
          )}
          {isSaving && (
            <View style={styles.savingOverlay}>
              <ActivityIndicator color={COLORS.white} />
            </View>
          )}
        </View>
        <View style={styles.badge}>
          <Ionicons name="camera" size={14} color={COLORS.white} />
        </View>
      </View>
      <Text style={styles.changeText}>
        {isSaving ? "Saving…" : photoUri ? "Change photo" : isResponder ? "Add photo" : "Add photo (optional)"}
      </Text>
    </Pressable>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    wrap: {
      alignSelf: "center",
      alignItems: "center",
      gap: SPACING.sm,
    },
    circle: {
      width: 96,
      height: 96,
      borderRadius: RADIUS.full,
      overflow: "hidden",
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
      alignItems: "center",
      justifyContent: "center",
    },
    photo: {
      width: "100%",
      height: "100%",
    },
    savingOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.4)",
      alignItems: "center",
      justifyContent: "center",
    },
    badge: {
      position: "absolute",
      bottom: 0,
      right: 0,
      width: 30,
      height: 30,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.primary,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: COLORS.background,
    },
    changeText: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "600",
      color: COLORS.primary,
    },
  });
}
