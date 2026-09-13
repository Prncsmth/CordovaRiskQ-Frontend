// services/contacts.service.ts
export type Hotline = { id: string; name: string; number: string };

const HOTLINES: Hotline[] = [
  {
    id: "mdrrmo",
    name: "Cordova MDRRMO (Ambulance / Rescue)",
    number: "0917-116-9819 / 0917-149-8457",
  },
  { id: "police", name: "Cordova Police Station", number: "0998-598-6392" },
  {
    id: "bfp",
    name: "Bureau of Fire Protection (BFP) - Cordova",
    number: "(032) 436-4245 / 0933-394-9073",
  },
  {
    id: "coast-guard",
    name: "Philippine Coast Guard (PCG) - Cordova",
    number: "0927-941-2486",
  },
  {
    id: "health-center",
    name: "Cordova Primary Health Care Facility",
    number: "0967-491-5579",
  },
  {
    id: "red-cross",
    name: "Philippine Red Cross (Lapu-Lapu/Cordova Chapter)",
    number: "0969-450-8482",
  },
];

export async function getHotlines(): Promise<Hotline[]> {
  return HOTLINES;
}
