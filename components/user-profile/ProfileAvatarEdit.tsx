import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import { Alert, Image, Pressable, StyleSheet, View } from "react-native";

import { useProfilePhoto } from "@/context/ProfilePhotoContext";
import { useThemeColors, RADIUS, SHADOW_LG, type ColorPalette } from "@/theme";

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

export default function ProfileAvatarEdit() {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { photoUri, setPhotoUri } = useProfilePhoto();

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const options: { text: string; style?: "cancel" | "destructive"; onPress?: () => void }[] = [
      {
        text: "Take Photo",
        onPress: async () => {
          const uri = await pickFromCamera();
          if (uri) await setPhotoUri(uri);
        },
      },
      {
        text: "Choose from Library",
        onPress: async () => {
          const uri = await pickFromLibrary();
          if (uri) await setPhotoUri(uri);
        },
      },
    ];

    if (photoUri) {
      options.push({
        text: "Remove Photo",
        style: "destructive",
        onPress: () => setPhotoUri(null),
      });
    }

    options.push({ text: "Cancel", style: "cancel" });

    Alert.alert("Profile Photo", undefined, options);
  }

  return (
    <Pressable style={styles.wrap} onPress={handlePress}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.ring}
      >
        <View style={styles.circle}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : (
            <Ionicons name="person-outline" size={52} color={COLORS.primary} />
          )}
        </View>
      </LinearGradient>

      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.badge}
      >
        <Ionicons name="camera" size={16} color={COLORS.white} />
      </LinearGradient>
    </Pressable>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    wrap: {
      alignSelf: "center",
      width: 120,
      height: 120,
    },
    ring: {
      width: 120,
      height: 120,
      borderRadius: RADIUS.full,
      alignItems: "center",
      justifyContent: "center",
      ...SHADOW_LG,
    },
    circle: {
      width: 108,
      height: 108,
      borderRadius: RADIUS.full,
      overflow: "hidden",
      backgroundColor: COLORS.primaryTint,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
      borderColor: COLORS.background,
    },
    photo: {
      width: "100%",
      height: "100%",
    },
    badge: {
      position: "absolute",
      bottom: 0,
      right: 0,
      width: 36,
      height: 36,
      borderRadius: RADIUS.full,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: COLORS.background,
      shadowColor: COLORS.primary,
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
  });
}
