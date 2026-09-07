// components/responder/phaseForMyStatus.ts
// Maps a responder's own roster status on one incident to the phase view
// app/responder/[id].tsx should show. Pure so it's unit-testable without
// mounting the screen.
import type { MyResponderStatus } from "@/types/responder";

export type Phase = "pending" | "lobby" | "on_the_way" | "arrived";

export function phaseForMyStatus(myStatus: MyResponderStatus): Phase | null {
  switch (myStatus) {
    case "pending":
      return "pending";
    case "joined":
      return "lobby";
    case "on_the_way":
      return "on_the_way";
    case "arrived":
      return "arrived";
    case "declined":
    case "left":
      return null;
  }
}
