// services/report.service.ts
export async function createReport(payload: Record<string, unknown>) {
  return { success: true, payload, ref: `RQ-${Math.floor(20000 + Math.random() * 900)}` };
}

export type ReportHistoryItem = {
  id: string;
  category: string;
  location: string;
  date: string;
  ref: string;
  status: "Resolved" | "Reviewing";
  statusColor: string;
  statusBg: string;
};

const HISTORY: ReportHistoryItem[] = [
  {
    id: "1",
    category: "Flood",
    location: "Barangay Poblacion",
    date: "Jul 20, 2026",
    ref: "RQ-20487",
    status: "Resolved",
    statusColor: "#1E8E3E",
    statusBg: "#EAF7EE",
  },
  {
    id: "2",
    category: "Road Accident",
    location: "Cordova Public Market Rd.",
    date: "Jul 15, 2026",
    ref: "RQ-20411",
    status: "Reviewing",
    statusColor: "#B45309",
    statusBg: "#FEF3E2",
  },
  {
    id: "3",
    category: "Medical Emergency",
    location: "Brgy. Day-as",
    date: "Jul 9, 2026",
    ref: "RQ-20308",
    status: "Resolved",
    statusColor: "#1E8E3E",
    statusBg: "#EAF7EE",
  },
];

export async function getReportHistory(): Promise<ReportHistoryItem[]> {
  return HISTORY;
}