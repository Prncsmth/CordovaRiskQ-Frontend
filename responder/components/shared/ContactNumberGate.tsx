// responder/components/shared/ContactNumberGate.tsx
// Makes sure every responder has a contact number a citizen can call. The
// Track Responder screen's Call Responder button dials the primary
// responder's saved number -- but admin-provisioned responder accounts skip
// the citizen phone-number onboarding step, so they could start responding
// with nothing on file and the citizen would only ever see "No contact
// number".
//
// Mounted once in the responder tab layout: checks the profile on entry
// and, if there's no valid PH mobile saved, shows a sheet that can't be
// dismissed until one is. A failed profile check (offline, server down)
// doesn't block -- it's re-checked the next time the tabs mount.
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "@/context/AuthContext";
import { getProfile, updateProfile } from "@/services/user.service";
import {
  FONT_FAMILY,
  RADIUS,
  SHADOW_LG,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";
import { isValidPhMobile, toPhMobile } from "@/utils/responderContact";

export default function ContactNumberGate() {
  const { token } = useAuth();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const [missing, setMissing] = useState(false);
  const [digits, setDigits] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    getProfile(token)
      .then((profile) => {
        if (!cancelled) setMissing(!isValidPhMobile(profile.mobile));
      })
      .catch(() => {
        // Best-effort -- see the header comment.
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const mobile = toPhMobile(digits);

  async function handleSave() {
    if (!token || !mobile || saving) return;
    setSaving(true);
    setError(null);
    try {
      const profile = await updateProfile(token, { mobile });
      setMissing(!isValidPhMobile(profile.mobile));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your number. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={missing} transparent animationType="fade" onRequestClose={() => {}}>
      <KeyboardAvoidingView
        style={styles.scrim}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.iconTile}>
            <Ionicons name="call" size={24} color={COLORS.white} />
          </View>

          <Text style={styles.title}>Add your contact number</Text>
          <Text style={styles.body}>
            Citizens need a way to reach you while you respond. Only the person who reported an
            incident you&apos;re leading can call you, and your number is never shown on their screen.
          </Text>

          <Text style={styles.label}>Mobile number</Text>
          <View style={[styles.inputRow, error && styles.inputRowError]}>
            <Text style={styles.prefix}>+63</Text>
            <View style={styles.prefixDivider} />
            <TextInput
              value={digits}
              onChangeText={(text) => {
                setDigits(text.replace(/\D/g, "").replace(/^0/, "").slice(0, 10));
                setError(null);
              }}
              placeholder="917 123 4567"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="phone-pad"
              autoFocus
              maxLength={10}
              style={styles.input}
              accessibilityLabel="Mobile number, after +63"
            />
          </View>
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <Text style={styles.hint}>Philippine mobile number, e.g. 917 123 4567</Text>
          )}

          <Pressable
            onPress={handleSave}
            disabled={!mobile || saving}
            style={[styles.saveButton, (!mobile || saving) && styles.saveButtonDisabled]}
            accessibilityRole="button"
            accessibilityState={{ disabled: !mobile || saving }}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.saveText}>Save number</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    scrim: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "center",
      paddingHorizontal: SPACING.lg,
    },
    sheet: {
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.lg,
      padding: SPACING.lg,
      ...SHADOW_LG,
    },
    iconTile: {
      width: 48,
      height: 48,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.primary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: SPACING.md,
    },
    title: {
      fontFamily: FONT_FAMILY.display,
      fontSize: TYPOGRAPHY.subtitle,
      color: COLORS.text,
    },
    body: {
      fontSize: TYPOGRAPHY.caption,
      lineHeight: 21,
      color: COLORS.textSecondary,
      marginTop: SPACING.xs,
    },
    label: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      color: COLORS.textSecondary,
      marginTop: SPACING.lg,
      marginBottom: SPACING.xs,
    },
    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.inputBg,
      paddingHorizontal: SPACING.md,
      height: 52,
    },
    inputRowError: {
      borderColor: COLORS.danger,
    },
    prefix: {
      fontSize: TYPOGRAPHY.body,
      fontWeight: "700",
      color: COLORS.text,
    },
    prefixDivider: {
      width: 1,
      height: 22,
      backgroundColor: COLORS.border,
      marginHorizontal: SPACING.sm,
    },
    input: {
      flex: 1,
      fontSize: TYPOGRAPHY.body,
      color: COLORS.text,
      letterSpacing: 0.5,
    },
    hint: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textTertiary,
      marginTop: SPACING.xs,
    },
    errorText: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.danger,
      marginTop: SPACING.xs,
    },
    saveButton: {
      height: 50,
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.primary,
      alignItems: "center",
      justifyContent: "center",
      marginTop: SPACING.lg,
    },
    saveButtonDisabled: {
      opacity: 0.45,
    },
    saveText: {
      fontSize: TYPOGRAPHY.body,
      fontWeight: "700",
      color: COLORS.white,
    },
  });
}
