// responder/components/incident-detail/ReporterContactCard.tsx
// Lets a responder call the citizen who reported the incident (or sent the
// SOS) -- e.g. to ask exactly where they are. The same contact card the
// citizen uses to call their responder, so both sides look alike.
//
// Renders nothing unless the backend sent the contact, which it only does
// for a responder actively on this incident (joined / on the way / arrived).
// The number is dialed, never shown.
import React from "react";
import type { StyleProp, ViewStyle } from "react-native";

import ResponderContactCard from "@/components/responder-contact/ResponderContactCard";
import type { Incident } from "@/responder/types/responder";

export default function ReporterContactCard({
  incident,
  style,
}: {
  incident: Incident;
  style?: StyleProp<ViewStyle>;
}) {
  const contact = incident.reporterContact;
  if (!contact) return null;

  return (
    <ResponderContactCard
      name={contact.name ?? "Reporter"}
      detail={incident.categoryId === "sos" ? "Sent this SOS" : "Reported this incident"}
      mobile={contact.mobile}
      showHotlinesFallback={false}
      style={style}
    />
  );
}
