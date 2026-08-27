// services/tide.service.ts
import { apiGet } from "./api";

export type TideStatus = {
  seaLevelM: number;
  nextExtremeAt: string | null;
  nextExtremeType: "high" | "low" | null;
  floodRiskLevel: "normal" | "watch" | "warning";
  updatedAt: string;
};

export async function getTideStatus(): Promise<TideStatus> {
  const response = await apiGet<{ success: true; tide: TideStatus }>("/api/tide");
  return response.tide;
}
