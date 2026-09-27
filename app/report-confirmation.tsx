import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback } from "react";
import { BackHandler, View } from "react-native";

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

  const goHome = useCallback(() => {
    router.replace("/(tabs)/home");
  }, [router]);

  // The submitted report was replace()'d in, so this screen has no lower
  // stack entry to pop to -- without this, Android hardware back would fall
  // through to the OS default (exit/backgrounds the app) instead of landing
  // on the established home route.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
        goHome();
        return true;
      });
      return () => subscription.remove();
    }, [goHome]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ReportConfirmation
        categoryId={category}
        location={location}
        refNumber={ref}
        onViewHistory={() => router.replace("/(tabs)/report-history")}
        onBackHome={goHome}
      />
    </View>
  );
}
