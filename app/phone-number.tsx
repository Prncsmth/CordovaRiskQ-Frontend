// app/phone-number.tsx
// Mandatory step shown right after a new account is created (register or
// first-time Google sign-in) -- see the `needsOnboarding` redirect in
// app/_layout.tsx. Not part of the (onboarding) welcome/terms walkthrough:
// it needs a token to save against, so it can only run once the user
// actually has an account. On success it hands off to the needsTerms gate,
// which forces (onboarding)/terms next -- see that file's post-registration
// branch.
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import PrimaryButton from "@/components/auth/PrimaryButton";
import { useAuth } from "@/context/AuthContext";
import { updateProfile } from "@/services/user.service";
import {
  FONT_FAMILY,
  RADIUS,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";

const KEYS: { digit: string; letters: string }[] = [
  { digit: "1", letters: "" },
  { digit: "2", letters: "ABC" },
  { digit: "3", letters: "DEF" },
  { digit: "4", letters: "GHI" },
  { digit: "5", letters: "JKL" },
  { digit: "6", letters: "MNO" },
  { digit: "7", letters: "PQRS" },
  { digit: "8", letters: "TUV" },
  { digit: "9", letters: "WXYZ" },
];

function formatPhone(digits: string): string {
  if (!digits) return "";
  const a = digits.slice(0, 3);
  const b = digits.slice(3, 6);
  const c = digits.slice(6, 10);
  let out = a;
  if (b) out += " " + b;
  if (c) out += " " + c;
  return out;
}

export default function PhoneNumberScreen() {
  const router = useRouter();
  const { token, user, completeOnboarding } = useAuth();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function appendDigit(d: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhone((p) => (p + d).slice(0, 10));
  }

  function backspace() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhone((p) => p.slice(0, -1));
  }

  async function handleContinue() {
    if (phone.trim().length === 0) {
      Alert.alert(
        "Phone number required",
        "Enter a valid mobile number first.",
      );
      return;
    }

    setIsSaving(true);
    try {
      if (token && user) {
        await updateProfile(token, {
          email: user.email,
          mobile: `+63 ${formatPhone(phone)}`,
        });
      }

      completeOnboarding();
      router.replace("/(onboarding)/terms");
    } catch (err) {
      Alert.alert(
        "Couldn't save phone number",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>One last thing</Text>
      <Text style={styles.title}>What&apos;s your number?</Text>
      <Text style={styles.subtitle}>
        We&apos;ll use this to send emergency and incident alerts.
      </Text>

      <View style={styles.displayWrap}>
        <View style={styles.numberRow}>
          <Text style={styles.prefix}>+63</Text>
          <Text style={phone ? styles.digits : styles.digitsPlaceholder}>
            {phone ? formatPhone(phone) : "912 345 6789"}
          </Text>
        </View>
        <View style={styles.divider} />
      </View>

      <PrimaryButton
        title="Continue"
        loading={isSaving}
        disabled={phone.length === 0 || isSaving}
        onPress={handleContinue}
      />

      <View style={styles.keypad}>
        {KEYS.map((k) => (
          <View key={k.digit} style={styles.keyCell}>
            <Pressable
              style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
              onPress={() => appendDigit(k.digit)}
            >
              <Text style={styles.keyDigit}>{k.digit}</Text>
              <Text style={styles.keyLetters}>{k.letters}</Text>
            </Pressable>
          </View>
        ))}
        <View style={styles.keyCell} />
        <View style={styles.keyCell}>
          <Pressable
            style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
            onPress={() => appendDigit("0")}
          >
            <Text style={styles.keyDigit}>0</Text>
            <Text style={styles.keyLetters}>+</Text>
          </Pressable>
        </View>
        <View style={styles.keyCell}>
          <Pressable
            style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
            onPress={backspace}
          >
            <Ionicons name="backspace-outline" size={24} color={COLORS.text} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
      paddingTop: 62,
      paddingHorizontal: SPACING.lg,
    },

    eyebrow: {
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 1,
      color: COLORS.primary,
      textTransform: "uppercase",
    },

    title: {
      fontFamily: FONT_FAMILY.display,
      fontSize: 26,
      color: COLORS.text,
      marginTop: SPACING.xs,
    },

    subtitle: {
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.textSecondary,
      marginTop: SPACING.xs,
      lineHeight: 20,
    },

    displayWrap: {
      marginTop: SPACING.xl,
      alignItems: "center",
    },

    numberRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
    },

    prefix: {
      fontSize: 30,
      fontWeight: "700",
      color: COLORS.textSecondary,
    },

    digits: {
      fontSize: 30,
      fontWeight: "700",
      color: COLORS.text,
    },

    digitsPlaceholder: {
      fontSize: 30,
      fontWeight: "700",
      color: COLORS.textFaint,
    },

    divider: {
      height: 1,
      backgroundColor: COLORS.borderMuted,
      width: "100%",
      marginTop: SPACING.md,
    },

    keypad: {
      flex: 1,
      flexDirection: "row",
      flexWrap: "wrap",
      alignContent: "center",
      justifyContent: "center",
      paddingVertical: SPACING.lg,
    },

    keyCell: {
      width: "33.33%",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: SPACING.sm,
    },

    key: {
      width: 72,
      height: 72,
      borderRadius: RADIUS.full,
      alignItems: "center",
      justifyContent: "center",
    },

    keyPressed: {
      backgroundColor: COLORS.surface,
    },

    keyDigit: {
      fontSize: 24,
      fontWeight: "500",
      color: COLORS.text,
    },

    keyLetters: {
      fontSize: 10,
      letterSpacing: 1.2,
      color: COLORS.textTertiary,
      marginTop: 2,
    },
  });
}
