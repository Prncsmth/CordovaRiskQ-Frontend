// constants/hotlines.ts
// Last-resort fallback, used ONLY when the live GET /api/hotlines call
// fails (e.g. offline/backend down). These are the same six hotlines that
// used to be hardcoded in services/contacts.service.ts before it was wired
// to the real backend -- kept verbatim so a disaster-response screen never
// renders empty just because the network is down. The backend is still the
// source of truth whenever it's reachable. Shared by the Contacts screen
// and the SOS failure modal (utils/sosFailure.ts).
import type { Hotline } from "@/services/contacts.service";

export const FALLBACK_HOTLINES: Hotline[] = [
  {
    id: "mdrrmo",
    name: "Cordova MDRRMO (Ambulance / Rescue)",
    number: "0917-149-8457",
    category: "medical",
  },
  {
    id: "police",
    name: "Cordova Police Station",
    number: "0998-598-6392",
    category: "police",
  },
  {
    id: "bfp",
    name: "Bureau of Fire Protection (BFP) - Cordova",
    number: "0933-394-9073",
    category: "fire",
  },
  {
    id: "coast-guard",
    name: "Philippine Coast Guard (PCG) - Cordova",
    number: "0927-941-2486",
    category: "maritime",
  },
  {
    id: "health-center",
    name: "Cordova Primary Health Care Facility",
    number: "0967-491-5579",
    category: "medical",
  },
  {
    id: "red-cross",
    name: "Philippine Red Cross (Lapu-Lapu/Cordova Chapter)",
    number: "0969-450-8482",
    category: "medical",
  },
];
