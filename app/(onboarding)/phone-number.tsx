import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import BackButton from "@/components/common/BackButton";
import { useAuth } from "@/context/AuthContext";
import { updateProfile } from "@/services/user.service";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

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
    if (!token || !user) return;

    setIsSaving(true);
    try {
      await updateProfile(token, {
        email: user.email,
        mobile: formatPhone(phone),
      });
      router.push("/terms");
    } catch (err) {
      Alert.alert(
        "Couldn't save phone number",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const canContinue = phone.length === 10 && !isSaving;

  return (
    <View style={styles.container}>
      <BackButton onPress={() => router.back()} />

      <Text style={styles.title}>Your phone number</Text>
      <Text style={styles.subtitle}>
        It&apos;s helpful to provide a good reason why the phone number is
        required.
      </Text>

      <View style={styles.displayWrap}>
        <Text style={phone ? styles.digits : styles.digitsPlaceholder}>
          {phone ? formatPhone(phone) : "(555) 123-4567"}
        </Text>
        <View style={styles.divider} />
      </View>

      <TouchableOpacity
        style={[
          styles.continueButton,
          !canContinue && styles.continueButtonDisabled,
        ]}
        onPress={handleContinue}
        disabled={!canContinue}
        activeOpacity={0.8}
      >
        {isSaving ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : (
          <Text
            style={[
              styles.continueText,
              !canContinue && styles.continueTextDisabled,
            ]}
          >
            Continue
          </Text>
        )}
      </TouchableOpacity>

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

  continueButton: {
    marginTop: SPACING.md,
    height: 54,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  continueButtonDisabled: {
    backgroundColor: COLORS.borderMuted,
  },

  continueText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },

  continueTextDisabled: {
    color: COLORS.textTertiary,
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
