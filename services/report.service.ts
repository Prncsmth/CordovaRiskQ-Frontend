// services/report.service.ts
export async function createReport(payload: Record<string, unknown>) {
  return {
    success: true,
    payload,
    ref: `RQ-${Math.floor(20000 + Math.random() * 900)}`,
  };
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

const HISTORY: ReportHistoryItem[] = [];

export async function getReportHistory(): Promise<ReportHistoryItem[]> {
  return HISTORY;
}
