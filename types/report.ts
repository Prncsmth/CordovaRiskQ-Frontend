export type Report = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  status: "pending" | "reviewed" | "resolved";
};
