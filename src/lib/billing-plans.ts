export const billingPlans = {
  solo: {
    name: "Premium",
    qrLimit: 1,
    monthlyPriceCents: 1990,
    quarterlyPriceCents: 5672,
  },
  duo: {
    name: "Duo",
    qrLimit: 2,
    monthlyPriceCents: 4790,
    quarterlyPriceCents: 13652,
  },
  studio: {
    name: "Estúdio",
    qrLimit: 5,
    monthlyPriceCents: 9790,
    quarterlyPriceCents: 27902,
  },
} as const;

export type PaidPlanId = keyof typeof billingPlans;
export type BillingInterval = "monthly" | "quarterly";
export type PlanId = "free" | PaidPlanId;

export type BillingAccess = {
  planId: PlanId;
  billingInterval: BillingInterval | null;
  status: string;
  qrLimit: number;
  hasMetrics: boolean;
  hasLogo: boolean;
  subscriptionId?: string;
  nextPaymentDate?: string;
  trialEndsAt?: string;
  isTrial?: boolean;
};

export function getBillingAccess(
  subscription: {
    planId?: unknown;
    billingInterval?: unknown;
    status?: unknown;
    subscriptionId?: unknown;
    nextPaymentDate?: unknown;
    trialEndsAt?: unknown;
  } | undefined,
): BillingAccess {
  const requestedPlanId = isPaidPlanId(subscription?.planId) ? subscription.planId : null;
  const paid = subscription?.status === "authorized" && requestedPlanId !== null;
  
  // Check if trial is active
  const trialEndsAt = typeof subscription?.trialEndsAt === "string" ? subscription.trialEndsAt : null;
  const isTrialActive = trialEndsAt && new Date(trialEndsAt) > new Date();
  
  const planId: PlanId = (paid && requestedPlanId) || isTrialActive ? (requestedPlanId || "solo") : "free";
  const plan = (paid && requestedPlanId) || isTrialActive ? billingPlans[requestedPlanId || "solo"] : undefined;
  const billingInterval = subscription?.billingInterval === "monthly"
    || subscription?.billingInterval === "quarterly"
    ? subscription.billingInterval
    : null;

  return {
    planId,
    billingInterval,
    status: typeof subscription?.status === "string" ? subscription.status : "free",
    qrLimit: plan?.qrLimit ?? 1,
    hasMetrics: Boolean(plan),
    hasLogo: Boolean(plan),
    ...(typeof subscription?.subscriptionId === "string"
      ? { subscriptionId: subscription.subscriptionId }
      : {}),
    ...(typeof subscription?.nextPaymentDate === "string"
      ? { nextPaymentDate: subscription.nextPaymentDate }
      : {}),
    ...(trialEndsAt ? { trialEndsAt, isTrial: isTrialActive || undefined } : {}),
  };
}

export function isPaidPlanId(value: unknown): value is PaidPlanId {
  return typeof value === "string" && Object.hasOwn(billingPlans, value);
}

export function getPlanPriceCents(planId: PaidPlanId, interval: BillingInterval) {
  const plan = billingPlans[planId];
  return interval === "monthly" ? plan.monthlyPriceCents : plan.quarterlyPriceCents;
}
