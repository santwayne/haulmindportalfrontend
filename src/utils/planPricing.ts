// Mirrors backend utils/planAssignment.js → priceForTrucks / resolvePlanPricing,
// so the price shown in a form matches what the server will charge.

export interface PricingTier {
  minTrucks: number;
  maxTrucks: number;
  monthlyPrice: number;
  currency?: string;
}

export interface PricingTruckPricing {
  tiers?: PricingTier[];
  extraTruckPrice?: number;
}

export interface PricingPlan {
  planType: 'lifetime' | 'monthly';
  lifetime?: {
    oneTime?: { price?: number };
    installments?: {
      threeMonths?: { price?: number };
      sixMonths?: { price?: number };
    };
  };
  monthly?: {
    fullApp?: { price?: number };
    truckPricing?: PricingTruckPricing;
  };
}

export const priceForTrucks = (truckCount: number, tp?: PricingTruckPricing): number => {
  const tiers = [...(tp?.tiers || [])].sort((a, b) => a.minTrucks - b.minTrucks);
  if (!tiers.length) return 0;
  const tier = tiers.find(t => truckCount >= t.minTrucks && truckCount <= t.maxTrucks);
  if (tier) return tier.monthlyPrice;
  if (truckCount < tiers[0].minTrucks) return tiers[0].monthlyPrice;
  const last = tiers[tiers.length - 1];
  return last.monthlyPrice + (truckCount - last.maxTrucks) * (tp?.extraTruckPrice || 0);
};

/** Standard price for a plan + billing option, or null when it can't be worked out yet. */
export const standardPlanPrice = (plan: PricingPlan | null | undefined, subscriptionType: string, truckCount?: number): number | null => {
  if (!plan || !subscriptionType) return null;
  if (plan.planType === 'lifetime') {
    if (subscriptionType === 'one-time') return plan.lifetime?.oneTime?.price ?? 0;
    if (subscriptionType === '3-months') return plan.lifetime?.installments?.threeMonths?.price ?? 0;
    if (subscriptionType === '6-months') return plan.lifetime?.installments?.sixMonths?.price ?? 0;
    return null;
  }
  if (subscriptionType === 'full-app') return plan.monthly?.fullApp?.price ?? 0;
  if (['1-month', '6-months', '1-year'].includes(subscriptionType)) {
    if (!truckCount || truckCount < 1) return null;
    const monthly = priceForTrucks(truckCount, plan.monthly?.truckPricing);
    if (subscriptionType === '1-month') return monthly;
    if (subscriptionType === '6-months') return monthly * 6;
    return monthly * 12;
  }
  return null;
};

/**
 * Checks tiers the way the backend does (planController.validateTruckTiers):
 * whole numbers, first tier starts at 1, each tier starts right after the previous one.
 */
export const validateTiers = (tiers: PricingTier[]): string | null => {
  if (!tiers.length) return 'Add at least one truck tier';
  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    if (!Number.isInteger(t.minTrucks) || !Number.isInteger(t.maxTrucks) || t.minTrucks < 1) {
      return `Tier ${i + 1}: truck counts must be whole numbers from 1`;
    }
    if (t.maxTrucks < t.minTrucks) return `Tier ${i + 1}: "to" trucks must be at least "from" trucks`;
    if (isNaN(t.monthlyPrice) || t.monthlyPrice < 0) return `Tier ${i + 1}: price must be 0 or more`;
    if (i === 0 && t.minTrucks !== 1) return 'The first tier must start at 1 truck';
    if (i > 0 && t.minTrucks !== tiers[i - 1].maxTrucks + 1) {
      return `Tier ${i + 1} must start at ${tiers[i - 1].maxTrucks + 1} trucks (right after tier ${i})`;
    }
  }
  return null;
};

export const formatCAD = (n: number, currency = 'CAD') =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(n || 0);
