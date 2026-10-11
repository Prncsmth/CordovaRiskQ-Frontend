// components/sos/SosFailureModal.tsx
// Shown when an SOS couldn't be sent for a reason other than being outside
// Cordova -- no GPS fix, no connection, or a timeout (see utils/sosFailure.ts).
// Offers a one-tap call to Cordova MDRRMO (the admin-managed hotline, or its
// verified fallback), Try Again, and the full hotline list. Calls open the
// phone's dialer; nothing is ever dialed automatically. Same overlay and
// Dialog pieces as GeofenceBlockedModal.
import { useRouter } from "expo-router";
import React from "react";
import { Linking, StyleSheet, View } from "react-native";

import {
  Dialog,
  DialogActions,
  DialogButton,
  DialogIcon,
  DialogMessage,
  DialogTertiaryAction,
  DialogTitle,
} from "@/components/common/Dialog";
import { useHotlines } from "@/context/HotlineContext";
import { useThemeColors } from "@/theme";
import { sosFailureActions, sosFailureCopy, type SosFailureReason } from "@/utils/sosFailure";

export default function SosFailureModal({
  reason,
  onDismiss,
  onRetry,
}: {
  reason: SosFailureReason | null;
  onDismiss: () => void;
  onRetry: () => void;
}) {
  const COLORS = useThemeColors();
  const router = useRouter();
  const { hotlines } = useHotlines();

  if (!reason) return null;

  const copy = sosFailureCopy(reason);
  const { callTelUrl: telUrl, canRetry } = sosFailureActions(reason, hotlines);

  return (
    <View style={styles.container}>
      <Dialog>
        <DialogIcon
          name={reason === "no-location" ? "location-outline" : "cloud-offline-outline"}
          color={COLORS.danger}
        />
        <DialogTitle>{copy.title}</DialogTitle>
        <DialogMessage>{copy.message}</DialogMessage>

        {telUrl ? (
          <DialogActions>
            <DialogButton
              label="Call Cordova MDRRMO"
              variant="primary"
              color={COLORS.success}
              onPress={() => {
                void Linking.openURL(telUrl);
              }}
            />
          </DialogActions>
        ) : null}
        <DialogActions>
          <DialogButton label="Close" variant="secondary" onPress={onDismiss} />
          {canRetry ? (
            <DialogButton label="Try Again" variant="secondary" onPress={onRetry} />
          ) : null}
        </DialogActions>
        <DialogTertiaryAction
          label="See all emergency hotlines"
          onPress={() => {
            onDismiss();
            router.push("/contacts");
          }}
        />
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 200,
    elevation: 200,
  },
});
