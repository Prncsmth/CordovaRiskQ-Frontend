import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";

import type { CategoryId } from "@/components/report/categories";
import ReportConfirmation from "@/components/report/ReportConfirmation";
import { useThemeColors } from "@/theme";

export default function ReportConfirmationScreen() {
  const router = useRouter();
  const COLORS = useThemeColors();
  const { ref, category, location } = useLocalSearchParams<{
    ref: string;
    category: CategoryId;
    location: string;
  }>();

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ReportConfirmation
        categoryId={category}
        location={location}
        refNumber={ref}
        onViewHistory={() => router.replace("/(tabs)/report-history")}
        onBackHome={() => router.replace("/(tabs)/home")}
      />
    </View>
  );
}
