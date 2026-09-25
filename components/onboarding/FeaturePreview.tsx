// components/onboarding/FeaturePreview.tsx
// Drawn wireframe mockup of the screen each onboarding slide is describing
// (app/(onboarding)/app-intro.tsx, responder/screens/TourScreen.tsx) --
// not a real screenshot. Every slide uses the same treatment now (this
// used to mix in real device screenshots, which kept fighting the frame:
// some got cropped wrong, some had a real name or test text baked into
// the pixels). A drawn mockup sidesteps all of that -- it always fits the
// frame exactly (no source image aspect ratio to fight), and each one is
// still modeled on that screen's real layout (its actual buttons, cards,
// and icons), not a generic placeholder.
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";

import { RADIUS, SHADOW, useThemeColors, type ColorPalette } from "@/theme";

export type FeaturePreviewType =
  | "sos"
  | "report"
  | "map"
  | "notifications"
  | "history"
  | "hotlines"
  | "responder-dashboard"
  | "responder-new-incident"
  | "responder-live-map"
  | "responder-lobby"
  | "responder-navigate"
  | "responder-notifications";

const FRAME_WIDTH = 172;
const FRAME_HEIGHT_FLOOR = 240;
const FRAME_HEIGHT_CEIL = 320;

type Styles = ReturnType<typeof createStyles>;

export default function FeaturePreview({ type }: { type: FeaturePreviewType }) {
  const COLORS = useThemeColors();
  const { height: screenHeight } = useWindowDimensions();

  // Reserves space for everything else on the slide (Back/Skip row, title,
  // description, dots, the Next/Get Started button, and screen padding) so
  // the frame can never push the button off a short screen. A drawn
  // wireframe has no source-image aspect ratio to preserve, so this is the
  // only sizing constraint left -- it always fits by construction.
  const frameHeight = Math.max(
    FRAME_HEIGHT_FLOOR,
    Math.min(FRAME_HEIGHT_CEIL, screenHeight - 380),
  );
  const frameWidth = FRAME_WIDTH;

  const styles = useMemo(
    () => createStyles(COLORS, frameWidth, frameHeight),
    [COLORS, frameWidth, frameHeight],
  );

  return (
    <View style={styles.frameWrapper}>
      <View style={styles.sideButtonAction} />
      <View style={styles.sideButtonVolUp} />
      <View style={styles.sideButtonVolDown} />
      <View style={styles.sideButtonPower} />
      <View style={styles.frame}>
        <View style={styles.dynamicIsland} />
        <Wireframe type={type} styles={styles} COLORS={COLORS} />
      </View>
    </View>
  );
}

function Wireframe({
  type,
  styles,
  COLORS,
}: {
  type: FeaturePreviewType;
  styles: Styles;
  COLORS: ColorPalette;
}) {
  switch (type) {
    case "sos":
      return <SosWireframe styles={styles} COLORS={COLORS} />;
    case "report":
      return <ReportWireframe styles={styles} COLORS={COLORS} />;
    case "map":
      return <MapWireframe styles={styles} COLORS={COLORS} pinCount={3} />;
    case "history":
      return <HistoryWireframe styles={styles} COLORS={COLORS} />;
    case "hotlines":
      return <HotlinesWireframe styles={styles} COLORS={COLORS} />;
    case "notifications":
      return <NotificationsWireframe styles={styles} COLORS={COLORS} icon="notifications" />;
    case "responder-dashboard":
      return <ResponderDashboardWireframe styles={styles} COLORS={COLORS} />;
    case "responder-new-incident":
      return <NewIncidentWireframe styles={styles} COLORS={COLORS} />;
    case "responder-live-map":
      return <MapWireframe styles={styles} COLORS={COLORS} pinCount={4} />;
    case "responder-lobby":
      return <LobbyWireframe styles={styles} COLORS={COLORS} />;
    case "responder-navigate":
      return <NavigateWireframe styles={styles} COLORS={COLORS} />;
    case "responder-notifications":
      return <NotificationsWireframe styles={styles} COLORS={COLORS} icon="alert" />;
  }
}

// Home: greeting header, a slim status card, the SOS slide-button front
// and center, then two quick-action rows (evacuation, hotlines) below.
function SosWireframe({ styles, COLORS }: { styles: Styles; COLORS: ColorPalette }) {
  return (
    <View style={styles.screen}>
      <View style={styles.headerBar} />
      <View style={styles.statusCard} />
      <View style={styles.sosArea}>
        <View style={styles.sosRing} />
        <View style={styles.sosButton}>
          <Ionicons name="alert" size={20} color={COLORS.white} />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.miniIconCircle}>
          <Ionicons name="home-outline" size={12} color={COLORS.success} />
        </View>
        <View style={styles.lineBar} />
      </View>
      <View style={styles.row}>
        <View style={styles.miniIconCircle}>
          <Ionicons name="call-outline" size={12} color={COLORS.primary} />
        </View>
        <View style={[styles.lineBar, styles.lineBarShort]} />
      </View>
    </View>
  );
}

// Report an Incident: title, a category grid (flood/fire/medical/road/
// other), a map preview strip, and a submit button pinned at the bottom.
function ReportWireframe({ styles, COLORS }: { styles: Styles; COLORS: ColorPalette }) {
  const categories: { icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
    { icon: "water-outline", color: COLORS.tide },
    { icon: "flame-outline", color: COLORS.secondary },
    { icon: "medkit-outline", color: COLORS.primary },
    { icon: "car-outline", color: COLORS.warning },
  ];
  return (
    <View style={styles.screen}>
      <View style={styles.headerBar} />
      <View style={styles.categoryGrid}>
        {categories.map((c, i) => (
          <View key={i} style={styles.categoryBox}>
            <Ionicons name={c.icon} size={16} color={c.color} />
          </View>
        ))}
      </View>
      <View style={styles.mapArea}>
        <View style={styles.mapPinPrimary}>
          <Ionicons name="location" size={12} color={COLORS.white} />
        </View>
      </View>
      <View style={styles.submitButton} />
    </View>
  );
}

// Evacuation map: search bar, map area with scattered pins and one
// highlighted "nearest" pin.
function MapWireframe({
  styles,
  COLORS,
  pinCount,
}: {
  styles: Styles;
  COLORS: ColorPalette;
  pinCount: number;
}) {
  const positions = [
    { top: 18, left: 18 },
    { top: 54, left: 64 },
    { top: 30, left: 100 },
    { top: 74, left: 30 },
  ];
  return (
    <View style={styles.screen}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={12} color={COLORS.textTertiary} />
      </View>
      <View style={styles.mapAreaTall}>
        {positions.slice(0, pinCount - 1).map((pos, i) => (
          <View key={i} style={[styles.mapPin, pos]} />
        ))}
        <View style={[styles.mapPinPrimary, { top: 46, left: 78 }]}>
          <Ionicons name="location" size={12} color={COLORS.white} />
        </View>
      </View>
    </View>
  );
}

// Report History: "+ New Report" button up top, then a stack of report
// cards each with a status pill.
function HistoryWireframe({ styles, COLORS }: { styles: Styles; COLORS: ColorPalette }) {
  return (
    <View style={styles.screen}>
      <View style={styles.headerBar} />
      <View style={styles.newReportButton} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.historyCard}>
          <View style={styles.miniIconCircle}>
            <Ionicons name="alert-circle-outline" size={12} color={COLORS.primary} />
          </View>
          <View style={styles.wireframeCardLines}>
            <View style={styles.lineBar} />
            <View style={[styles.lineBar, styles.lineBarShort]} />
          </View>
          <View style={styles.statusPill} />
        </View>
      ))}
    </View>
  );
}

// Emergency Hotlines: title, then a plain list of contact rows (icon +
// name/number, no card chrome -- matches the real screen's list style).
function HotlinesWireframe({ styles, COLORS }: { styles: Styles; COLORS: ColorPalette }) {
  return (
    <View style={styles.screen}>
      <View style={styles.headerBar} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.wireframeRow}>
          <View style={styles.rowIcon}>
            <Ionicons name="call" size={12} color={COLORS.primary} />
          </View>
          <View style={styles.wireframeCardLines}>
            <View style={[styles.lineBar, styles.lineBarShort]} />
          </View>
        </View>
      ))}
    </View>
  );
}

// Notifications (citizen and responder): title, then a stack of alert
// cards -- shared shape, just a different lead icon per role.
function NotificationsWireframe({
  styles,
  COLORS,
  icon,
}: {
  styles: Styles;
  COLORS: ColorPalette;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.screen}>
      <View style={styles.headerBar} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.wireframeCard}>
          <View style={styles.miniIconCircle}>
            <Ionicons name={icon} size={14} color={COLORS.primary} />
          </View>
          <View style={styles.wireframeCardLines}>
            <View style={styles.lineBar} />
            <View style={[styles.lineBar, styles.lineBarShort]} />
          </View>
        </View>
      ))}
    </View>
  );
}

// Responder Dashboard: greeting header with a bell, two stat tiles
// (Nearby / High Urgency), then nearest-incident cards.
function ResponderDashboardWireframe({
  styles,
  COLORS,
}: {
  styles: Styles;
  COLORS: ColorPalette;
}) {
  return (
    <View style={styles.screen}>
      <View style={styles.dashboardHeaderRow}>
        <View style={styles.avatarCircle} />
        <View style={styles.wireframeCardLines}>
          <View style={[styles.lineBar, styles.lineBarShort]} />
        </View>
        <Ionicons name="notifications-outline" size={14} color={COLORS.textSecondary} />
      </View>
      <View style={styles.statTileRow}>
        <View style={styles.statTile}>
          <Ionicons name="navigate-outline" size={14} color={COLORS.tide} />
        </View>
        <View style={styles.statTile}>
          <Ionicons name="alert-circle-outline" size={14} color={COLORS.primary} />
        </View>
      </View>
      {[0, 1].map((i) => (
        <View key={i} style={styles.historyCard}>
          <View style={styles.miniIconCircle}>
            <Ionicons name="alert" size={12} color={COLORS.primary} />
          </View>
          <View style={styles.wireframeCardLines}>
            <View style={styles.lineBar} />
            <View style={[styles.lineBar, styles.lineBarShort]} />
          </View>
          <View style={styles.statusPill} />
        </View>
      ))}
    </View>
  );
}

// New Incident alert: centered urgent icon + ring, urgency pill, and the
// Accept / Decline button pair.
function NewIncidentWireframe({ styles, COLORS }: { styles: Styles; COLORS: ColorPalette }) {
  return (
    <View style={styles.screen}>
      <View style={styles.sosArea}>
        <View style={styles.sosRing} />
        <View style={styles.sosButton}>
          <Ionicons name="alert" size={20} color={COLORS.white} />
        </View>
      </View>
      <View style={[styles.lineBar, styles.centerLine]} />
      <View style={[styles.statusPill, styles.centerPill]} />
      <View style={styles.submitButton} />
      <View style={styles.outlineButton} />
    </View>
  );
}

// Team Lobby: the joined incident card up top, then a couple of
// responder rows (avatar + status pill), and a Head Out action bar.
function LobbyWireframe({ styles, COLORS }: { styles: Styles; COLORS: ColorPalette }) {
  return (
    <View style={styles.screen}>
      <View style={styles.historyCard}>
        <View style={styles.miniIconCircle}>
          <Ionicons name="medkit" size={12} color={COLORS.primary} />
        </View>
        <View style={styles.wireframeCardLines}>
          <View style={styles.lineBar} />
        </View>
      </View>
      {[0, 1].map((i) => (
        <View key={i} style={styles.wireframeRow}>
          <View style={styles.avatarCircleSmall} />
          <View style={styles.wireframeCardLines}>
            <View style={[styles.lineBar, styles.lineBarShort]} />
          </View>
          <View style={styles.statusPill} />
        </View>
      ))}
      <View style={styles.submitButton} />
    </View>
  );
}

// Navigate: a tall map area with the responder's own position, then the
// pinned incident card and the Navigate action bar underneath it.
function NavigateWireframe({ styles, COLORS }: { styles: Styles; COLORS: ColorPalette }) {
  return (
    <View style={styles.screen}>
      <View style={styles.mapAreaTall}>
        <View style={[styles.mapPinPrimary, { top: 40, left: 60 }]}>
          <Ionicons name="location" size={12} color={COLORS.white} />
        </View>
      </View>
      <View style={styles.wireframeRow}>
        <View style={styles.miniIconCircle}>
          <Ionicons name="medkit" size={12} color={COLORS.primary} />
        </View>
        <View style={styles.wireframeCardLines}>
          <View style={[styles.lineBar, styles.lineBarShort]} />
        </View>
      </View>
      <View style={styles.submitButton} />
    </View>
  );
}

function createStyles(COLORS: ColorPalette, frameWidth: number, frameHeight: number) {
  return StyleSheet.create({
    // iPhone 16/17 Pro-style silhouette: tall rounded corners, thin
    // titanium-dark bezel, floating Dynamic Island, and small side-button
    // bumps. The buttons sit just outside `frame`'s own bounds, so they
    // live on this wrapper (frame itself clips to its rounded corners via
    // overflow: hidden, which would cut them off).
    frameWrapper: {
      marginBottom: 20,
    },
    frame: {
      width: frameWidth,
      height: frameHeight,
      borderRadius: 38,
      backgroundColor: COLORS.text,
      borderWidth: 6,
      borderColor: COLORS.text,
      alignItems: "center",
      overflow: "hidden",
      ...SHADOW,
    },
    dynamicIsland: {
      position: "absolute",
      top: 10,
      alignSelf: "center",
      width: 70,
      height: 22,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.text,
      zIndex: 1,
    },
    sideButtonAction: {
      position: "absolute",
      left: -2,
      top: 64,
      width: 3,
      height: 20,
      borderRadius: 2,
      backgroundColor: COLORS.text,
    },
    sideButtonVolUp: {
      position: "absolute",
      left: -2,
      top: 100,
      width: 3,
      height: 30,
      borderRadius: 2,
      backgroundColor: COLORS.text,
    },
    sideButtonVolDown: {
      position: "absolute",
      left: -2,
      top: 140,
      width: 3,
      height: 30,
      borderRadius: 2,
      backgroundColor: COLORS.text,
    },
    sideButtonPower: {
      position: "absolute",
      right: -2,
      top: 108,
      width: 3,
      height: 50,
      borderRadius: 2,
      backgroundColor: COLORS.text,
    },

    screen: {
      flex: 1,
      width: "100%",
      backgroundColor: COLORS.background,
      padding: 12,
      paddingTop: 40,
      gap: 10,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    headerBar: {
      width: "55%",
      height: 8,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.borderMuted,
    },
    lineBar: {
      height: 6,
      width: "80%",
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.borderMuted,
    },
    lineBarShort: {
      width: "50%",
    },
    centerLine: {
      alignSelf: "center",
      width: "60%",
    },

    // SOS / New Incident alert button
    sosArea: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 8,
    },
    sosRing: {
      position: "absolute",
      width: 64,
      height: 64,
      borderRadius: RADIUS.full,
      borderWidth: 1,
      borderColor: `${COLORS.primary}33`,
    },
    sosButton: {
      width: 44,
      height: 44,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.primary,
      alignItems: "center",
      justifyContent: "center",
    },

    // Status/quick-info card (Home's tide card, etc.)
    statusCard: {
      height: 34,
      width: "100%",
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.tideTint,
    },

    miniIconCircle: {
      width: 22,
      height: 22,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.primaryTint,
      alignItems: "center",
      justifyContent: "center",
    },

    // Generic card (notifications, dashboard incident rows)
    wireframeCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 8,
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
    },
    wireframeCardLines: {
      flex: 1,
      gap: 4,
    },
    wireframeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.borderMuted,
    },
    rowIcon: {
      width: 22,
      height: 22,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.primaryTint,
      alignItems: "center",
      justifyContent: "center",
    },

    // Report category grid
    categoryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    categoryBox: {
      width: 44,
      height: 34,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      backgroundColor: COLORS.surface,
      alignItems: "center",
      justifyContent: "center",
    },

    // Map
    mapArea: {
      height: 60,
      width: "100%",
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.tideTint,
      alignItems: "center",
      justifyContent: "center",
    },
    mapAreaTall: {
      flex: 1,
      width: "100%",
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.tideTint,
    },
    searchBar: {
      height: 26,
      width: "100%",
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    mapPin: {
      position: "absolute",
      width: 8,
      height: 8,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.tide,
    },
    mapPinPrimary: {
      position: "absolute",
      width: 20,
      height: 20,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.primary,
      alignItems: "center",
      justifyContent: "center",
    },

    // Buttons
    submitButton: {
      height: 30,
      width: "100%",
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.primary,
    },
    outlineButton: {
      height: 26,
      width: "70%",
      alignSelf: "center",
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
    },
    newReportButton: {
      height: 30,
      width: "100%",
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.primary,
    },

    // History / dashboard incident cards
    historyCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 8,
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
    },
    statusPill: {
      width: 30,
      height: 12,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.warningBg,
    },
    centerPill: {
      alignSelf: "center",
      width: 40,
      height: 14,
      backgroundColor: COLORS.primaryTint,
    },

    // Dashboard header + stat tiles
    dashboardHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    avatarCircle: {
      width: 24,
      height: 24,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.tide,
    },
    avatarCircleSmall: {
      width: 20,
      height: 20,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.tide,
    },
    statTileRow: {
      flexDirection: "row",
      gap: 8,
    },
    statTile: {
      flex: 1,
      height: 34,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      backgroundColor: COLORS.surface,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
