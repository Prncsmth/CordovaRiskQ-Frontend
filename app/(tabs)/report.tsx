import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PrimaryButton from "@/components/auth/PrimaryButton";
import BackButton from "@/components/common/BackButton";
import type { CategoryId } from "@/components/report/categories";
import CategoryGrid from "@/components/report/CategoryGrid";
import DetailsInput from "@/components/report/DetailsInput";
import PhotoPicker from "@/components/report/PhotoPicker";
import PinnedLocationCard from "@/components/report/PinnedLocationCard";
import { CORDOVA_BARANGAYS } from "@/constants/cordovaBarangays";
import { createReport } from "@/services/report.service";
import { COLORS, FONT_FAMILY, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

const MOCK_LOCATION = "Barangay Poblacion, Cordova";
const MOCK_COORDS = CORDOVA_BARANGAYS.find((b) => b.id === "poblacion")!;

export default function ReportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [details, setDetails] = useState("");
  const [photoAttached, setPhotoAttached] = useState(false);

  const canSubmit = category !== null && details.trim().length > 0;

  const handleSubmit = async () => {
    if (!category || details.trim().length === 0) return;

    const result = await createReport({
      category,
      location: MOCK_LOCATION,
      details,
      hasPhoto: photoAttached,
    });

    router.push({
      pathname: "/report-confirmation",
      params: { ref: result.ref, category, location: MOCK_LOCATION },
    });
  };

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + SPACING.sm, paddingBottom: SPACING.xl },
      ]}
    >
      <BackButton onPress={() => router.back()} />

      <View style={styles.section}>
        <Text style={styles.title}>Report an Incident</Text>
        <Text style={styles.subtitle}>Select a category and share details</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeadingRow}>
          <View style={styles.sectionIcon}>
            <Ionicons name="grid" size={13} color={COLORS.primary} />
          </View>
          <Text style={styles.sectionHeading}>Category</Text>
        </View>
        <CategoryGrid selected={category} onSelect={setCategory} />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeadingRow}>
          <View style={styles.sectionIcon}>
            <Ionicons name="location" size={13} color={COLORS.primary} />
          </View>
          <Text style={styles.sectionHeading}>Pinned Location</Text>
        </View>
        <PinnedLocationCard
          address={MOCK_LOCATION}
          latitude={MOCK_COORDS.latitude}
          longitude={MOCK_COORDS.longitude}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeadingRow}>
          <View style={styles.sectionIcon}>
            <Ionicons name="create" size={13} color={COLORS.primary} />
          </View>
          <Text style={styles.sectionHeading}>Details</Text>
        </View>
        <DetailsInput value={details} onChangeText={setDetails} />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeadingRow}>
          <View style={styles.sectionIcon}>
            <Ionicons name="camera" size={13} color={COLORS.primary} />
          </View>
          <Text style={styles.sectionHeading}>Photo</Text>
          <Text style={styles.optionalTag}>Optional</Text>
        </View>
        <PhotoPicker
          attached={photoAttached}
          onToggle={() => setPhotoAttached((v) => !v)}
        />
      </View>

      <PrimaryButton
        title="Submit Report"
        onPress={handleSubmit}
        disabled={!canSubmit}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.lg,
  },
  section: {
    gap: SPACING.sm,
  },
  title: {
    fontFamily: FONT_FAMILY.display,
    fontSize: TYPOGRAPHY.heading,
    color: COLORS.text,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  sectionIcon: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeading: {
    fontFamily: FONT_FAMILY.displaySemibold,
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.text,
  },
  optionalTag: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textTertiary,
  },
});
