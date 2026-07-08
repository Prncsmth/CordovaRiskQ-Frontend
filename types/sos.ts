export type SOSIncident = {
  id: string;
  location: string;
  severity: "low" | "medium" | "high";
  createdAt: string;
  status: "active" | "resolved";
};
