import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import PrimaryButton from "@/components/auth/PrimaryButton";
import BackButton from "@/components/common/BackButton";
import StepIndicator from "@/components/onboarding/StepIndicator";
import { useAuth } from "@/context/AuthContext";
import { updateProfile } from "@/services/user.service";
import { COLORS, SPACING, TYPOGRAPHY } from "@/theme";

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
  let out = a.length ? `(${a}` : "";
  if (a.length === 3) out += ") ";
  if (b) out += b;
  if (c) out += "-" + c;
  return out;
}

export default function PhoneNumberScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function appendDigit(d: string) {
    setPhone((p) => (p + d).slice(0, 10));
  }

  function backspace() {
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
          mobile: formatPhone(phone),
        });
      }

      router.push("/(onboarding)/terms");
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
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <StepIndicator step={1} style={styles.stepIndicator} />
      </View>

      <Text style={styles.title}>What&apos;s your number?</Text>
      <Text style={styles.subtitle}>
        We&apos;ll use this to send emergency and incident alerts.
      </Text>

      <View style={styles.displayWrap}>
        <Text style={phone ? styles.digits : styles.digitsPlaceholder}>
          {phone ? formatPhone(phone) : "(555) 123-4567"}
        </Text>
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
          <TouchableOpacity
            key={k.digit}
            style={styles.key}
            onPress={() => appendDigit(k.digit)}
          >
            <Text style={styles.keyDigit}>{k.digit}</Text>
            <Text style={styles.keyLetters}>{k.letters}</Text>
          </TouchableOpacity>
        ))}
        <View style={styles.key} />
        <TouchableOpacity style={styles.key} onPress={() => appendDigit("0")}>
          <Text style={styles.keyDigit}>0</Text>
          <Text style={styles.keyLetters}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.key} onPress={backspace}>
          <Ionicons name="backspace-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 62,
    paddingHorizontal: SPACING.lg,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },

  stepIndicator: {
    flex: 1,
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: SPACING.md,
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

  key: {
    width: "33.33%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.sm,
  },

  keyDigit: {
    fontSize: 24,
    fontWeight: "500",
    color: COLORS.text,
  },

  keyLetters: {
    fontSize: 9,
    letterSpacing: 1.2,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
});
