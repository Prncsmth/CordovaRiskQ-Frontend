// hooks/useEmergencyAlarm.ts
// Rings (siren + vibration) while `active` -- used by RingOverlay so a new
// incident/SOS is heard, not just seen. Plays through expo-audio rather than
// a notification sound, so it also works in Expo Go (where Android
// notifications are unavailable, see utils/safeNotifications.ts) and isn't
// muted by the notification channel's settings. Stops on its own after
// MAX_RING_MS so an unattended phone doesn't ring forever.
// ringAlarmFor() is the one-shot version for events with no popup to
// dismiss (a teammate's "Ring Team").
//
// Each kind has its own sound so a responder can tell them apart without
// looking: SOS is a fast rising "yelp" siren, an incident report the
// classic hi-lo two-tone, a team ring a phone-style double ring.
import { createAudioPlayer, setAudioModeAsync, useAudioPlayer, type AudioPlayer } from "expo-audio";
import { useEffect } from "react";
import { Vibration } from "react-native";

export type AlarmKind = "sos" | "incident" | "team_ring";

const ALARM_SOUNDS: Record<AlarmKind, number> = {
  sos: require("@/assets/sounds/alarm-sos.wav"),
  incident: require("@/assets/sounds/alarm-incident.wav"),
  team_ring: require("@/assets/sounds/alarm-team-ring.wav"),
};

// SOS buzzes harder and faster than the rest.
const VIBRATION_PATTERNS: Record<AlarmKind, number[]> = {
  sos: [0, 300, 150, 300, 150],
  incident: [0, 600, 400, 600, 400],
  team_ring: [0, 350, 150, 350, 1150],
};

export const MAX_RING_MS = 30_000;

const AUDIO_MODE = { playsInSilentMode: true, interruptionMode: "duckOthers" } as const;

function startPlayer(player: AudioPlayer, isStopped: () => boolean = () => false): void {
  // Best-effort: a failing audio mode or player must never block the alert
  // itself -- the popup/notification still shows, and vibration still runs.
  setAudioModeAsync(AUDIO_MODE)
    .catch(() => {})
    .finally(() => {
      if (isStopped()) return;
      try {
        player.loop = true;
        player.seekTo(0).catch(() => {});
        player.play();
      } catch {
        // ignore
      }
    });
}

function stopPlayer(player: AudioPlayer): void {
  try {
    player.pause();
    player.seekTo(0).catch(() => {});
  } catch {
    // Player already released -- nothing left to stop.
  }
}

const oneShotPlayers: Partial<Record<AlarmKind, AudioPlayer>> = {};
let oneShotTimer: ReturnType<typeof setTimeout> | null = null;
let oneShotKind: AlarmKind | null = null;

// Rings `kind` for `ms`, then stops by itself. A second call while ringing
// replaces the first. Never throws.
export function ringAlarmFor(kind: AlarmKind, ms: number): void {
  try {
    if (oneShotTimer) clearTimeout(oneShotTimer);
    if (oneShotKind && oneShotKind !== kind) {
      const previous = oneShotPlayers[oneShotKind];
      if (previous) stopPlayer(previous);
    }
    const player = (oneShotPlayers[kind] ??= createAudioPlayer(ALARM_SOUNDS[kind]));
    oneShotKind = kind;
    startPlayer(player);
    Vibration.vibrate(VIBRATION_PATTERNS[kind], true);
    oneShotTimer = setTimeout(() => {
      oneShotTimer = null;
      oneShotKind = null;
      stopPlayer(player);
      Vibration.cancel();
    }, ms);
  } catch {
    // Audio unavailable -- the notification entry still shows.
  }
}

// `kind` null = not ringing.
export function useEmergencyAlarm(kind: AlarmKind | null): void {
  const sosPlayer = useAudioPlayer(ALARM_SOUNDS.sos);
  const incidentPlayer = useAudioPlayer(ALARM_SOUNDS.incident);

  useEffect(() => {
    if (!kind || kind === "team_ring") return;
    const player = kind === "sos" ? sosPlayer : incidentPlayer;
    let stopped = false;
    const stop = () => {
      if (stopped) return;
      stopped = true;
      stopPlayer(player);
      Vibration.cancel();
    };

    startPlayer(player, () => stopped);
    Vibration.vibrate(VIBRATION_PATTERNS[kind], true);

    const timer = setTimeout(stop, MAX_RING_MS);
    return () => {
      clearTimeout(timer);
      stop();
    };
  }, [kind, sosPlayer, incidentPlayer]);
}
