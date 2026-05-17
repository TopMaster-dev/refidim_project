export type PlanTier = "START" | "PRO" | "SCALE";

export interface PlanConfig {
  tier: PlanTier;
  label: string;
  monthlyPriceBRL: number;
  leadLimit: number;
  consultantLimit: number;
}

export const PLAN_CONFIGS: Record<PlanTier, PlanConfig> = {
  START: {
    tier: "START",
    label: "Start",
    monthlyPriceBRL: 97,
    leadLimit: 3000,
    consultantLimit: 1,
  },
  PRO: {
    tier: "PRO",
    label: "Pro",
    monthlyPriceBRL: 197,
    leadLimit: 8000,
    consultantLimit: 3,
  },
  SCALE: {
    tier: "SCALE",
    label: "Scale",
    monthlyPriceBRL: 397,
    leadLimit: 20000,
    consultantLimit: 999,
  },
};

export const ALL_PLANS = Object.values(PLAN_CONFIGS);
