const LABELS: Record<string, string> = {
  monthly: 'Monthly',
  '6-months': '6 Months',
  yearly: 'Yearly',
  'one-time': 'One-time',
  installment: 'Installment',
};

export const billingCycleLabel = (cycle?: string) =>
  (cycle && LABELS[cycle]) || (cycle ? cycle.charAt(0).toUpperCase() + cycle.slice(1) : '—');

export const BILLING_CYCLE_OPTIONS = Object.entries(LABELS).map(([value, label]) => ({ value, label }));

interface InvoicePeriod {
  billingCycle?: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
}

// Older lifetime invoices were saved as "monthly" with an end date 100 years out.
const LIFETIME_MIN_YEARS = 50;

const isLifetimeInvoice = ({ billingCycle, subscriptionStartDate, subscriptionEndDate }: InvoicePeriod) => {
  if (billingCycle === 'one-time') return true;
  if (!subscriptionEndDate) return false;
  const start = subscriptionStartDate ? new Date(subscriptionStartDate) : new Date();
  return new Date(subscriptionEndDate).getFullYear() - start.getFullYear() >= LIFETIME_MIN_YEARS;
};

export const invoiceCycleLabel = (invoice: InvoicePeriod) =>
  billingCycleLabel(isLifetimeInvoice(invoice) ? 'one-time' : invoice.billingCycle);

// null means the period has no end date.
export const invoiceEndDate = (invoice: InvoicePeriod) =>
  invoice.subscriptionEndDate && !isLifetimeInvoice(invoice) ? new Date(invoice.subscriptionEndDate) : null;
