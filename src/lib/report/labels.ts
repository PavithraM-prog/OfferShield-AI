import type { Finding } from "@/lib/analysis/types";

export const BASIS_LABELS: Record<Finding["basis"], string> = {
  rule: "Rule-based check",
  ai: "AI review",
  both: "Rule-based check + AI review",
};
