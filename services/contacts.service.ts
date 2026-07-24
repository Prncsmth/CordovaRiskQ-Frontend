// services/contacts.service.ts
export type Hotline = { id: string; name: string; number: string };
export type Contact = { id: string; name: string; number: string };

const HOTLINES: Hotline[] = [
  { id: "pnp", name: "PNP Cordova", number: "(032) 888-1911" },
  { id: "bfp", name: "Bureau of Fire Protection", number: "(032) 888-1160" },
  {
    id: "coast-guard",
    name: "Coast Guard Station Cordova",
    number: "(032) 888-1729",
  },
  {
    id: "disaster-office",
    name: "Municipal Disaster Office",
    number: "(032) 888-1045",
  },
];

const MY_CONTACTS: Contact[] = [
  { id: "1", name: "Mama Beckett", number: "+63 917 555 0142" },
];

export async function getHotlines(): Promise<Hotline[]> {
  return HOTLINES;
}

export async function getMyContacts(): Promise<Contact[]> {
  return MY_CONTACTS;
}
