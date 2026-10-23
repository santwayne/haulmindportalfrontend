import { useState, useEffect, type CSSProperties } from 'react';
import {
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Sparkles,
  Crown,
  Zap,
  Calendar,
  DollarSign,
  TrendingUp,
  ArrowRight,
  Info,
  X,
  History,
  Package,
  Star,
  Truck,
} from 'lucide-react';
import { message, Modal, Button, Tag, Card, Spin, Tabs, Progress, Alert } from 'antd';
import { getAllPlans, getMySubscription, getMySubscriptions, createCheckoutSession, cancelSubscription, getTrialStatus, verifyCheckoutSession, addExtraTrucksCheckout } from '../../../axios/api/subscription';

interface Plan {
  _id: string;
  planName: string;
  planType: 'lifetime' | 'monthly';
  description: string;
  lifetime?: {
    oneTime: { price: number; currency: string };
    installments?: {
      threeMonths?: { price: number; currency: string; enabled: boolean };
      sixMonths?: { price: number; currency: string; enabled: boolean };
    };
  };
  monthly?: {
    fullApp?: { price: number; currency: string; enabled: boolean };
    withoutHR?: { price: number; currency: string; enabled: boolean };
    yearly?: { price: number; currency: string; enabled: boolean };
    truckPricing?: {
      tiers: { minTrucks: number; maxTrucks: number; monthlyPrice: number; currency: string; _id: string }[];
      extraTruckPrice: number;
      extraTruckCurrency?: string;
      sixMonthBonusDays?: number;
      annualFreeMonths?: number;
    };
  };
  allowedRoles?: string[];
  blockedRoles?: string[];
  status: 'active' | 'inactive';
  isDefault?: boolean;
  features?: { name: string; included: boolean; _id: string }[];
}

interface Subscription {
  _id: string;
  plan: Plan | string; // Can be populated Plan object or just plan ID
  planSnapshot?: {
    planName: string;
    allowedRoles?: string[];
    blockedRoles?: string[];
    snapshotDate?: string;
  };
  planType: 'lifetime' | 'monthly';
  subscriptionType: string;
  amount: number;
  currency: string;
  status: 'pending' | 'active' | 'cancelled' | 'expired' | 'past_due';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  startDate: string;
  endDate?: string;
  nextBillingDate?: string;
  cancelledAt?: string;
  stripeSessionId?: string;
  truckCount?: number;
  maxTrucks?: number;
  usedTrucks?: number;
  extraTrucksPurchased?: number;
  installments?: {
    total: number;
    paid: number;
    remaining: number;
  };
}

interface TrialStatus {
  hasActiveSubscription: boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  hasTrial: boolean;
  trialStartDate?: string;
  trialEndDate?: string;
  daysUsed?: number;
  daysRemaining?: number;
  message?: string;
}

// Self-service plan browsing/checkout/cancel is disabled by client request — all plan changes now
// go through the Super Admin. Left in place (not deleted) behind this flag so it's easy to
// re-enable later; flip to `true` to restore the old self-service UI.
const SELF_SERVICE_PLAN_UI_ENABLED = false;

const SubscriptionPage = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedType, setSelectedType] = useState<string>('');
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelSubscriptionId, setCancelSubscriptionId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [selectedTier, setSelectedTier] = useState<{ minTrucks: number; maxTrucks: number; monthlyPrice: number; currency: string; _id: string } | null>(null);
  const [truckCount, setTruckCount] = useState<number>(1);
  const [extraTrucks, setExtraTrucks] = useState<number>(0);
  const [pricingTabs, setPricingTabs] = useState<Record<string, 'monthly' | '6months' | 'annual'>>({});
  const [showAddTruckModal, setShowAddTruckModal] = useState(false);
  const [addTruckCount, setAddTruckCount] = useState(1);
  const [addTruckProcessing, setAddTruckProcessing] = useState(false);


  const primaryButtonStyle: CSSProperties = {
    background: 'linear-gradient(90deg, #1a8ee8 0%, #1183e0 40%, #0d6bc7 100%)',
    color: '#fff',
    border: 'none',
    boxShadow: `0 18px 32px rgba(17, 131, 224, 0.25)`,
  };
  const cardAccentStyle: CSSProperties = {
    borderColor: 'rgba(17, 131, 224, 0.2)',
    boxShadow: `0 4px 20px rgba(17, 131, 224, 0.1)`,
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plansRes, subscriptionRes, subscriptionsRes, trialRes] = await Promise.all([
        getAllPlans(),
        getMySubscription(),
        getMySubscriptions(),
        getTrialStatus(),
      ]);

      if (plansRes?.success) {
        setPlans(plansRes.data || []);
      }

      if (subscriptionRes?.success) {
        setActiveSubscription(subscriptionRes.data || null);
      }

      if (subscriptionsRes?.success) {
        setSubscriptions(subscriptionsRes.data || []);
      }

      if (trialRes?.success && trialRes.data) {
        setTrialStatus(trialRes.data);
      }
    } catch (error: any) {
      console.error('Error fetching subscription data:', error);
      // Don't show error message if it's just a missing subscription
      if (!error?.message?.includes('No active subscription')) {
        message.error(error?.message || 'Failed to fetch data');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number, currency: string = 'CAD') => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: currency,
    }).format(price);
  };

  const handleTierSubscribe = (plan: Plan, tier: { minTrucks: number; maxTrucks: number; monthlyPrice: number; currency: string; _id: string }, subscriptionType: string) => {
    setSelectedPlan(plan);
    setSelectedType(subscriptionType);
    setSelectedTier(tier);
    setTruckCount(tier.maxTrucks);
    setExtraTrucks(0);
    setShowSubscribeModal(true);
  };

  const confirmSubscribe = async () => {
    if (!selectedPlan) return;

    setProcessing(true);
    try {
      const response = await createCheckoutSession({
        planId: selectedPlan._id,
        subscriptionType: selectedType,
        ...((selectedType === '1-month' || selectedType === '6-months' || selectedType === '1-year') && {
          truckCount: selectedTier ? selectedTier.maxTrucks + extraTrucks : truckCount,
        }),
      });

      if (response?.success && response.data?.url) {
        // Redirect to Stripe checkout
        window.location.href = response.data.url;
      } else {
        message.error(response?.message || 'Failed to create checkout session');
      }
    } catch (error: any) {
      console.error('Error creating checkout:', error);
      message.error(error?.message || 'Failed to create checkout session');
    } finally {
      setProcessing(false);
    }
  };

  const confirmAddTrucks = async () => {
    if (!activeSubscription) return;
    const planId = typeof activeSubscription.plan === 'object' ? activeSubscription.plan?._id : activeSubscription.plan as string;
    if (!planId) return;

    setAddTruckProcessing(true);
    try {
      const response = await addExtraTrucksCheckout({ planId, extraTruck: addTruckCount });
      if (response?.success && response.data?.url) {
        window.location.href = response.data.url;
      } else {
        message.error(response?.message || 'Failed to create checkout session');
      }
    } catch (error: any) {
      message.error(error?.message || 'Failed to create checkout session');
    } finally {
      setAddTruckProcessing(false);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    console.log('Cancel subscription clicked for:', subscriptionId);
    setCancelSubscriptionId(subscriptionId);
    setShowCancelModal(true);
  };

  const confirmCancelSubscription = async () => {
    if (!cancelSubscriptionId) return;

    console.log('Confirming cancellation for:', cancelSubscriptionId);
    setCancelling(true);

    try {
      console.log('Calling cancelSubscription API with ID:', cancelSubscriptionId);
      const response = await cancelSubscription(cancelSubscriptionId);
      console.log('Cancel subscription API response:', response);

      if (response?.success) {
        message.success('Subscription cancelled successfully');
        setShowCancelModal(false);
        setCancelSubscriptionId(null);
        fetchData();
      } else {
        message.error(response?.message || 'Failed to cancel subscription');
      }
    } catch (error: any) {
      console.error('Error cancelling subscription:', error);
      message.error(error?.message || 'Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'default';
      case 'expired':
      case 'past_due':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'cancelled':
      case 'expired':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-secondary" />;
    }
  };

  // Check if returning from Stripe checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const sessionId = params.get('session_id');
    window.history.replaceState({}, '', window.location.pathname);

    if (status === 'success' && sessionId) {
      // Verify payment directly with Stripe — don't rely solely on webhook
      verifyCheckoutSession(sessionId).then((res) => {
        if (res?.success && res?.data?.status === 'active') {
          message.success('Payment successful! Your subscription is now active.');
        } else {
          message.info('Payment received. Activating your subscription...');
        }
        fetchData();
      }).catch(() => {
        message.info('Payment received. Loading your subscription...');
        fetchData();
      });
    } else if (status === 'cancel') {
      message.info('Payment was cancelled.');
    }
  }, []);

  const [activeTab, setActiveTab] = useState<string>('plans');

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-card" >
        <div className="text-center">
          <Spin size="large" />
          <p className="mt-4 text-primary">Loading your subscriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-main">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl shadow-lg bg-[rgba(17,131,224,0.1)]">
                <CreditCard className="w-8 h-8 text-[var(--accent-navyblue)]" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-primary">
                  My Subscription
                </h1>
                <p className="text-secondary mt-1 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  View your current plan status and renewal date
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Prominent Alert Banner for Expired Trial or No Subscription */}
        {((trialStatus && trialStatus.isTrialExpired && !trialStatus.hasActiveSubscription) ||
          (trialStatus && !trialStatus.hasActiveSubscription && !trialStatus.hasTrial)) && (
            <div className="mb-6">
              <Alert
                message={
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 text-white" />
                    <div>
                      <div className="font-bold text-lg text-white">Subscription Required</div>
                      <div className="text-sm mt-1 text-white">
                        {trialStatus?.isTrialExpired
                          ? "Your free trial has expired. You don't have an active subscription plan to use this software. Please subscribe to a plan to continue."
                          : "You don't have an active subscription plan to use this software. Please subscribe to a plan to continue."}
                      </div>
                    </div>
                  </div>
                }
                type="error"
                showIcon={false}
                closable={false}
                className="border-2 border-red-500"
                style={{
                  backgroundColor: 'rgba(239,68,68,0.1)',
                  borderColor: '#ef4444',
                  padding: '20px'
                }}
              />
            </div>
          )}

        {/* Trial Status Card */}
        {trialStatus && !trialStatus.hasActiveSubscription && trialStatus.hasTrial && (
          <div
          className="mb-8 relative overflow-hidden rounded-2xl shadow-2xl border-2"
          style={{
            background: trialStatus.isTrialExpired
              ? 'linear-gradient(135deg, #1a0a0e 0%, #1f0d12 50%, #150810 100%)'
              : trialStatus.daysRemaining && trialStatus.daysRemaining <= 2
                ? 'linear-gradient(135deg, #1a1100 0%, #1f1500 50%, #160e00 100%)'
                : 'linear-gradient(135deg, #091527 0%, #0d1e3a 50%, #091527 100%)',
            borderColor: trialStatus.isTrialExpired
              ? 'rgba(244, 63, 94, 0.4)'
              : trialStatus.daysRemaining && trialStatus.daysRemaining <= 2
                ? 'rgba(245, 158, 11, 0.4)'
                : 'rgba(17, 131, 224, 0.45)',
            boxShadow: trialStatus.isTrialExpired
              ? '0 4px 28px rgba(244, 63, 94, 0.15)'
              : trialStatus.daysRemaining && trialStatus.daysRemaining <= 2
                ? '0 4px 28px rgba(245, 158, 11, 0.15)'
                : '0 4px 28px rgba(17, 131, 224, 0.18)',
          }}
        >
            <div className="absolute inset-0 bg-black/10 pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-card/5 rounded-full -mr-32 -mt-32 pointer-events-none"></div>

            <div className="relative p-8 z-10">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                      {trialStatus.isTrialExpired ? (
                        <XCircle className="w-6 h-6 text-white" />
                      ) : (
                        <Clock className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        {trialStatus.isTrialExpired ? 'Free Trial Expired' : 'Free Trial Active'}
                      </h2>
                      <p className="text-white/90 mt-1">
                        {trialStatus.isTrialExpired
                          ? 'Your 1-month free trial has ended. Subscribe now to continue using the platform.'
                          : trialStatus.daysRemaining && trialStatus.daysRemaining <= 2
                            ? `⚠️ Your free trial is expiring soon! Only ${trialStatus.daysRemaining} day${trialStatus.daysRemaining === 1 ? '' : 's'} remaining.`
                            : `You have ${trialStatus.daysRemaining || 0} days remaining in your free trial.`
                        }
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="rounded-xl p-4 border" style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-5 h-5 text-white" />
                        <span className="text-white/80 text-sm font-medium">Days Used</span>
                      </div>
                      <p className="text-white text-2xl font-bold">
                        {trialStatus.daysUsed || 0} / {(trialStatus.daysUsed || 0) + (trialStatus.daysRemaining || 0) || 30}
                      </p>
                    </div>

                    <div className="rounded-xl p-4 border" style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-5 h-5 text-white" />
                        <span className="text-white/80 text-sm font-medium">Days Remaining</span>
                      </div>
                      <p className="text-white text-2xl font-bold">
                        {trialStatus.daysRemaining || 0}
                      </p>
                    </div>

                    {trialStatus.trialEndDate && (
                      <div className="rounded-xl p-4 border" style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-5 h-5 text-white" />
                          <span className="text-white/80 text-sm font-medium">Expires On</span>
                        </div>
                        <p className="text-white text-lg font-bold">
                          {new Date(trialStatus.trialEndDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    )}
                  </div>

                  {trialStatus.daysRemaining !== undefined && trialStatus.daysRemaining > 0 && (
                    <div className="mb-6">
                      {(() => {
                        const trialLengthDays = (trialStatus.daysUsed || 0) + (trialStatus.daysRemaining || 0) || 30;
                        const progressPercent = Math.round(((trialLengthDays - (trialStatus.daysRemaining || 0)) / trialLengthDays) * 100);
                        return (
                          <>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-white/80 text-sm font-medium">Trial Progress</span>
                              <span className="text-white text-sm font-bold">
                                {progressPercent}%
                              </span>
                            </div>
                            <Progress
                              percent={progressPercent}
                              strokeColor={
                                trialStatus.isTrialExpired ? '#F43F5E'
                                : trialStatus.daysRemaining && trialStatus.daysRemaining <= 2 ? '#F59E0B'
                                : '#1183e0'
                              }
                              trailColor={
                                trialStatus.isTrialExpired ? 'rgba(244,63,94,0.15)'
                                : trialStatus.daysRemaining && trialStatus.daysRemaining <= 2 ? 'rgba(245,158,11,0.15)'
                                : 'rgba(17,131,224,0.15)'
                              }
                              showInfo={false}
                            />
                          </>
                        );
                      })()}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-white/80 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>Contact your account manager to subscribe or change your plan.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Active Subscription Card */}
        {activeSubscription && (
          <div
            className="mb-8 relative overflow-hidden rounded-2xl shadow-2xl bg-card border-2 border-theme"
            style={{ boxShadow: `0 4px 24px rgba(17, 131, 224, 0.12)` }}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-card rounded-full -mr-32 -mt-32 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-card rounded-full -ml-24 -mb-24 pointer-events-none"></div>

            <div className="relative p-8 z-10">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-[rgba(17,131,224,0.1)] rounded-lg">
                      <Crown className="w-6 h-6 text-[var(--accent-navyblue)]" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
                        Active Subscription
                        {getStatusIcon(activeSubscription.status)}
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <Tag color={getStatusColor(activeSubscription.status)}>
                          {activeSubscription.status.toUpperCase()}
                        </Tag>
                        <Tag color={activeSubscription.paymentStatus === 'paid' ? 'success' : 'warning'}>
                          {activeSubscription.paymentStatus.toUpperCase()}
                        </Tag>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-[rgba(17,131,224,0.06)] rounded-xl p-4 border border-[rgba(17,131,224,0.15)]">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-5 h-5 text-[var(--accent-navyblue)]" />
                        <span className="text-primary text-sm font-medium">Plan Name</span>
                      </div>
                      <p className="text-primary text-xl font-bold">
                        {typeof activeSubscription.plan === 'object'
                          ? activeSubscription.plan?.planName
                          : activeSubscription.planSnapshot?.planName || 'Plan'}
                      </p>
                    </div>

                    <div className="bg-[rgba(168,85,247,0.06)] rounded-xl p-4 border border-[rgba(168,85,247,0.2)]">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-5 h-5 text-[#A855F7]" />
                        <span className="text-primary text-sm font-medium">Subscription Type</span>
                      </div>
                      <p className="text-primary text-xl font-bold capitalize">
                        {activeSubscription.planType} - {activeSubscription.subscriptionType.replace('-', ' ')}
                      </p>
                    </div>

                    <div className="bg-[rgba(0,255,163,0.06)] rounded-xl p-4 border border-[rgba(0,255,163,0.2)]">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-5 h-5 text-[#00FFA3]" />
                        <span className="text-primary text-sm font-medium">Amount</span>
                      </div>
                      <p className="text-primary text-2xl font-bold">
                        {formatPrice(activeSubscription.amount, activeSubscription.currency)}
                        {activeSubscription.planType === 'monthly' && (
                          <span className="text-base font-normal">/month</span>
                        )}
                      </p>
                    </div>

                    {activeSubscription.nextBillingDate && (
                      <div className="bg-[rgba(245,158,11,0.06)] rounded-xl p-4 border border-[rgba(245,158,11,0.2)]">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-5 h-5 text-[#F59E0B]" />
                          <span className="text-primary text-sm font-medium">Next Billing</span>
                        </div>
                        <p className="text-primary text-xl font-bold">
                          {new Date(activeSubscription.nextBillingDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    )}

                    {activeSubscription.maxTrucks != null && activeSubscription.maxTrucks > 0 && (
                      <div className="bg-[rgba(17,131,224,0.06)] rounded-xl p-4 border border-[rgba(17,131,224,0.15)] md:col-span-2">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-[var(--accent-navyblue)]" />
                            <span className="text-primary text-sm font-medium">Truck Usage</span>
                          </div>
                          <span className="text-primary font-bold">
                            {activeSubscription.usedTrucks ?? 0} / {activeSubscription.maxTrucks}
                          </span>
                        </div>
                        <Progress
                          percent={Math.min(
                            100,
                            Math.round(((activeSubscription.usedTrucks ?? 0) / activeSubscription.maxTrucks) * 100)
                          )}
                          strokeColor={
                            (activeSubscription.usedTrucks ?? 0) >= activeSubscription.maxTrucks
                              ? { '0%': '#ef4444', '100%': '#dc2626' }
                              : { '0%': '#1183e0', '100%': '#00FFA3' }
                          }
                          className="mb-2"
                        />
                        <p className="text-secondary text-xs">
                          {Math.max(0, activeSubscription.maxTrucks - (activeSubscription.usedTrucks ?? 0))} truck slot{Math.max(0, activeSubscription.maxTrucks - (activeSubscription.usedTrucks ?? 0)) !== 1 ? 's' : ''} remaining
                          {activeSubscription.extraTrucksPurchased ? ` (includes ${activeSubscription.extraTrucksPurchased} extra purchased)` : ''}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-secondary text-sm">
                    <Clock className="w-4 h-4" />
                    <span>Started on {new Date(activeSubscription.startDate).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}</span>
                  </div>
                </div>

                {/* Cancelling is plan management — kept out of the customer-facing UI per client
                    request (contact your account manager instead). Not deleted: gated behind
                    SELF_SERVICE_PLAN_UI_ENABLED so it's easy to re-enable. */}
                {SELF_SERVICE_PLAN_UI_ENABLED && activeSubscription!.status === 'active' && (
                  <div className="lg:self-start">
                    <Button
                      danger
                      size="large"
                      icon={<X className="w-4 h-4" />}
                      onClick={(e) => handleCancelSubscription(activeSubscription!._id, e)}
                      className="
      !bg-red-500 !hover:bg-red-600 !border-red-500 hover:border-red-600
      !dark:bg-red-700 dark:hover:bg-red-800 dark:border-red-700 dark:hover:border-red-800
      !text-white font-semibold shadow-lg
    "
                      style={{ pointerEvents: 'auto', zIndex: 10 }}
                    >
                      Cancel Subscription
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Self-service plan browsing/checkout/add-trucks is disabled by client request — customers
            only see their read-only subscription status now; all plan changes go through Super Admin.
            Left in place (not deleted) behind SELF_SERVICE_PLAN_UI_ENABLED so it can be re-enabled easily later. */}
        {SELF_SERVICE_PLAN_UI_ENABLED && (
        <>
        {/* ── Add More Trucks (active subscription only) ── */}
        {activeSubscription && activeSubscription!.status === 'active' && (() => {
          const activePlan = typeof activeSubscription!.plan === 'object' ? activeSubscription!.plan as Plan : null;
          const extraTruckPrice = activePlan?.monthly?.truckPricing?.extraTruckPrice ?? 0;
          const extraTruckCurrency = activePlan?.monthly?.truckPricing?.extraTruckCurrency ?? 'CAD';
          const currentMaxTrucks = activeSubscription!.maxTrucks ?? activeSubscription!.truckCount ?? 0;
          const extraAlreadyPurchased = activeSubscription!.extraTrucksPurchased ?? 0;
          if (extraTruckPrice <= 0) return null;
          return (
            <div className="mb-8 bg-card rounded-2xl shadow-lg border-2 border-[rgba(245,158,11,0.3)] overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-card/20 rounded-xl">
                    <Truck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Need More Trucks?</h3>
                    <p className="text-white/80 text-sm">Add extra trucks to your current plan — no plan change needed</p>
                  </div>
                </div>
                <Button
                  size="large"
                  icon={<TrendingUp className="w-4 h-4" />}
                  onClick={() => { setAddTruckCount(1); setShowAddTruckModal(true); }}
                  className="bg-card !text-white hover:!text-blue-500 border-white/30 font-bold hover:bg-[rgba(245,158,11,0.1)] flex-shrink-0"
                >
                  Add Trucks
                </Button>
              </div>
              <div className="px-6 py-4 flex flex-wrap gap-6 items-center">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-[rgba(245,158,11,0.1)] rounded-lg flex items-center justify-center">
                    <Truck className="w-4 h-4 text-[#F59E0B]" />
                  </div>
                  <div>
                    <p className="text-xs text-secondary font-medium">Current Truck Limit</p>
                    <p className="text-lg font-bold text-primary">{currentMaxTrucks} trucks</p>
                  </div>
                </div>
                {extraAlreadyPurchased > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-[rgba(0,255,163,0.1)] rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-[#00FFA3]" />
                    </div>
                    <div>
                      <p className="text-xs text-secondary font-medium">Extra Trucks Added</p>
                      <p className="text-lg font-bold text-primary">+{extraAlreadyPurchased} trucks</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-[rgba(245,158,11,0.1)] rounded-lg flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-[#F59E0B]" />
                  </div>
                  <div>
                    <p className="text-xs text-secondary font-medium">Rate Per Extra Truck</p>
                    <p className="text-lg font-bold text-[#F59E0B]">{formatPrice(extraTruckPrice, extraTruckCurrency)}<span className="text-sm font-normal text-secondary">/truck/mo</span></p>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Enhanced Available Plans with Tabs */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[rgba(168,85,247,0.15)] rounded-lg">
                <Star className="w-5 h-5 text-[#A855F7]" />
              </div>
              <h2 className="text-3xl font-bold text-primary">Available Plans</h2>
            </div>
          </div>

          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'plans',
                label: (
                  <span className="flex items-center gap-2 text-white">
                    <Package className="w-4 h-4" />
                    All Plans
                  </span>
                ),
              },
              {
                key: 'history',
                label: (
                  <span className="flex items-center gap-2 text-white">
                    <History className="w-4 h-4" />
                    Subscription History
                  </span>
                ),
              },
            ]}
            className="mb-6"
          />

          {activeTab === 'plans' && (
            <div className="space-y-8">
              {plans.filter(p => p.planType === 'monthly').map((plan) => {
                const currentPlanId = typeof activeSubscription?.plan === 'object' ? activeSubscription.plan?._id : null;
                const isCurrentPlan = currentPlanId === plan._id;
                const tiers = plan.monthly?.truckPricing?.tiers ?? [];
                const tp = plan.monthly?.truckPricing;
                const extraPrice = tp?.extraTruckPrice ?? 0;
                const extraCurrency = tp?.extraTruckCurrency ?? 'CAD';
                const bonusDays = tp?.sixMonthBonusDays ?? 15;
                const freeMonths = tp?.annualFreeMonths ?? 1;

                // Auto-select the tab matching the current subscription's billing period
                const activeSubType = activeSubscription?.subscriptionType;
                const defaultTab: 'monthly' | '6months' | 'annual' =
                  isCurrentPlan && activeSubType === '6-months' ? '6months' :
                    isCurrentPlan && activeSubType === '1-year' ? 'annual' : 'monthly';
                const planTab = pricingTabs[plan._id] ?? defaultTab;

                // Determine which tier index matches the active subscription
                const activeTierIndex = (() => {
                  if (!isCurrentPlan || !activeSubscription?.amount) return -1;
                  const factor = activeSubType === '1-month' ? 1 : activeSubType === '6-months' ? 6 : 12;
                  const monthlyEquiv = activeSubscription.amount / factor;
                  return tiers.findIndex(t => Math.abs(t.monthlyPrice - monthlyEquiv) < 0.01);
                })();

                return (
                  <div
                    key={plan._id}
                    className={`bg-card rounded-3xl shadow-xl overflow-hidden border-2 transition-all duration-300 ${isCurrentPlan ? 'border-[var(--accent-navyblue)]' : 'border-theme hover:border-theme'}`}
                  >
                    {/* ── Plan Header ── */}
                    <div className={`px-8 py-6 ${isCurrentPlan ? 'bg-[var(--accent-navyblue)]' : 'bg-gradient-to-r from-slate-700 to-slate-800'}`}>
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <div className="p-2 bg-card/20 rounded-xl">
                              <Truck className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold text-white">{plan.planName}</h3>
                            {plan.isDefault && (
                              <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2.5 py-1 rounded-full">Default</span>
                            )}
                          </div>
                          {plan.description && (
                            <p className="text-white/75 text-sm mt-1 max-w-xl">{plan.description}</p>
                          )}
                        </div>
                        {isCurrentPlan && (
                          <div className="bg-card/15 backdrop-blur border border-white/30 px-4 py-2 rounded-xl flex items-center gap-2 flex-shrink-0">
                            <Crown className="w-4 h-4 text-yellow-300" />
                            <span className="text-white font-bold text-sm">Your Active Plan</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-8">
                      {tiers.length > 0 && (
                        <>
                          {/* ── Billing Period Selector ── */}
                          <div className="flex justify-center mb-8">
                            <div className="inline-flex bg-[#0B1220] rounded-2xl p-1 gap-1 border border-[rgba(17,131,224,0.12)]">
                              {(['monthly', '6months', 'annual'] as const).map((tab) => {
                                const isActiveTab = planTab === tab;
                                const isCurrentBillingTab = isCurrentPlan && (
                                  (tab === 'monthly' && activeSubType === '1-month') ||
                                  (tab === '6months' && activeSubType === '6-months') ||
                                  (tab === 'annual' && activeSubType === '1-year')
                                );
                                return (
                                  <button
                                    key={tab}
                                    onClick={() => setPricingTabs(prev => ({ ...prev, [plan._id]: tab }))}
                                    className={`relative px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex flex-col items-center min-w-[110px] ${isActiveTab
                                        ? 'bg-[#182235] shadow-md text-[#00D1FF] ring-1 ring-[rgba(0,209,255,0.2)]'
                                        : 'text-secondary hover:text-primary'
                                      }`}
                                  >
                                    <span>{tab === 'monthly' ? 'Monthly' : tab === '6months' ? '6 Months' : 'Annual'}</span>
                                    <span className={`text-[10px] font-bold mt-0.5 ${isActiveTab
                                        ? tab === '6months' ? 'text-[#F59E0B]' : tab === 'annual' ? 'text-[#00FFA3]' : 'text-transparent'
                                        : 'text-secondary'
                                      }`}>
                                      {tab === '6months' ? `+${bonusDays} days free` : tab === 'annual' ? `+${freeMonths} mo free` : '‎'}
                                    </span>
                                    {isCurrentBillingTab && (
                                      <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-[var(--accent-navyblue)] rounded-full border-2 border-[#121A2B] shadow-sm" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* ── Savings / Bonus Banner ── */}
                          {planTab === '6months' && (
                            <div className="mb-6 flex items-center gap-4 bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.3)] rounded-2xl px-6 py-4">
                              <div className="w-10 h-10 bg-[#F59E0B] rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                                <Zap className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-[#F59E0B]">6-Month Plan Bonus</p>
                                <p className="text-xs text-secondary mt-0.5">Pay for 6 months and receive <strong>{bonusDays} extra days</strong> of access — completely free</p>
                              </div>
                              <div className="ml-auto text-right flex-shrink-0">
                                <span className="bg-[rgba(245,158,11,0.2)] text-[#F59E0B] text-xs font-bold px-3 py-1.5 rounded-full">+{bonusDays} Days</span>
                              </div>
                            </div>
                          )}
                          {planTab === 'annual' && (
                            <div className="mb-6 flex items-center gap-4 bg-[rgba(0,255,163,0.08)] border border-[rgba(0,255,163,0.3)] rounded-2xl px-6 py-4">
                              <div className="w-10 h-10 bg-[#00FFA3] rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                                <Star className="w-5 h-5 text-[#0B1220]" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-[#00FFA3]">Annual Plan — Best Value</p>
                                <p className="text-xs text-secondary mt-0.5">Pay 12 months upfront and get <strong>{freeMonths} month{freeMonths > 1 ? 's' : ''} completely free</strong></p>
                              </div>
                              <div className="ml-auto text-right flex-shrink-0">
                                <span className="bg-[rgba(0,255,163,0.2)] text-[#00FFA3] text-xs font-bold px-3 py-1.5 rounded-full">+{freeMonths} Mo Free</span>
                              </div>
                            </div>
                          )}

                          {/* ── Tier Cards ── */}
                          <div className={`grid gap-5 mb-6 ${tiers.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' : tiers.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
                            {tiers.map((tier, idx) => {
                              const currency = tier.currency ?? 'CAD';
                              const baseMonthly = tier.monthlyPrice;
                              const displayPrice = planTab === 'monthly' ? baseMonthly : planTab === '6months' ? baseMonthly * 6 : baseMonthly * 12;
                              const strikethroughPrice = planTab === 'annual' ? baseMonthly * (12 + freeMonths) : null;
                              const subscriptionType = planTab === 'monthly' ? '1-month' : planTab === '6months' ? '6-months' : '1-year';

                              // Is this tier the one the user is currently on (any billing period)?
                              const isActiveTier = idx === activeTierIndex && isCurrentPlan;
                              // Is this tier active AND on the same billing period currently shown?
                              const isCurrentTabAndTier = isActiveTier && (
                                (planTab === 'monthly' && activeSubType === '1-month') ||
                                (planTab === '6months' && activeSubType === '6-months') ||
                                (planTab === 'annual' && activeSubType === '1-year')
                              );

                              return (
                                <div
                                  key={tier._id}
                                  className={`relative rounded-2xl border-2 p-6 transition-all duration-200 flex flex-col ${isCurrentTabAndTier
                                      ? 'border-[#00D1FF] bg-[rgba(0,209,255,0.06)] shadow-xl ring-2 ring-[rgba(0,209,255,0.15)]'
                                      : isActiveTier
                                        ? 'border-[rgba(0,209,255,0.3)] bg-[rgba(0,209,255,0.03)] shadow-md'
                                        : 'border-theme bg-card hover:border-[rgba(0,209,255,0.25)] hover:shadow-lg'
                                    }`}
                                >
                                  {/* "Your Current Plan" badge */}
                                  {isCurrentTabAndTier && (
                                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[var(--accent-navyblue)] text-[#0B1220] text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1.5 shadow-lg whitespace-nowrap">
                                      <CheckCircle className="w-3 h-3" />
                                      Your Current Plan
                                    </div>
                                  )}
                                  {/* "Same tier, different billing" hint */}
                                  {isActiveTier && !isCurrentTabAndTier && (
                                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[rgba(17,131,224,0.2)] text-[var(--accent-navyblue)] text-xs font-semibold px-4 py-1 rounded-full whitespace-nowrap shadow border border-[rgba(17,131,224,0.3)]">
                                      Your Tier
                                    </div>
                                  )}

                                  {/* Tier label */}
                                  <div className="flex items-center gap-3 mb-5">
                                    <div className={`p-2.5 rounded-xl ${isCurrentTabAndTier ? 'bg-[var(--accent-navyblue)]' : 'bg-[rgba(245,158,11,0.1)]'}`}>
                                      <Truck className={`w-5 h-5 ${isCurrentTabAndTier ? 'text-[#0B1220]' : 'text-[#F59E0B]'}`} />
                                    </div>
                                    <div>
                                      <p className="text-[11px] text-secondary font-semibold uppercase tracking-wider">Fleet Size</p>
                                      <p className="text-xl font-bold text-primary">{tier.minTrucks}–{tier.maxTrucks} Trucks</p>
                                    </div>
                                  </div>

                                  {/* Price block */}
                                  <div className="mb-5 flex-1">
                                    {strikethroughPrice && (
                                      <p className="text-sm text-secondary line-through mb-0.5">{formatPrice(strikethroughPrice, currency)}</p>
                                    )}
                                    <div className="flex items-baseline gap-1.5">
                                      <span className={`text-4xl font-extrabold ${isCurrentTabAndTier ? 'text-[var(--accent-navyblue)]' : 'text-primary'}`}>
                                        {formatPrice(displayPrice, currency)}
                                      </span>
                                      <span className="text-sm text-secondary font-medium">
                                        {planTab === 'monthly' ? '/mo' : planTab === '6months' ? '/6 mo' : '/yr'}
                                      </span>
                                    </div>
                                    {planTab !== 'monthly' && (
                                      <p className="text-xs text-secondary mt-1.5 flex items-center gap-1">
                                        <span className="w-1 h-1 bg-[#8B9BB4] rounded-full" />
                                        {formatPrice(baseMonthly, currency)}/mo equivalent
                                      </p>
                                    )}
                                  </div>

                                  {/* Additional truck note — shown on every tier */}
                                  {extraPrice > 0 && (() => {
                                    const lastTierMax = tiers[tiers.length - 1]?.maxTrucks ?? tier.maxTrucks;
                                    const billingFactor = planTab === 'monthly' ? 1 : planTab === '6months' ? 6 : 12;
                                    const billingLabel = planTab === 'monthly' ? '/mo' : planTab === '6months' ? '/6 mo' : '/yr';
                                    return (
                                      <div className="mb-4 rounded-lg border border-[rgba(245,158,11,0.25)] bg-card overflow-hidden">
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(245,158,11,0.08)] border-b border-[rgba(245,158,11,0.2)]">
                                          <TrendingUp className="w-3 h-3 text-[#F59E0B]" />
                                          <span className="text-[10px] font-bold text-[#F59E0B] uppercase tracking-wide">Additional Trucks</span>
                                        </div>
                                        <div className="flex items-center justify-between px-3 py-2">
                                          <span className="text-xs text-secondary">Beyond {lastTierMax} trucks</span>
                                          <span className="text-xs font-bold text-[#F59E0B]">+{formatPrice(extraPrice * billingFactor, extraCurrency)}{billingLabel}/truck</span>
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {/* Divider */}
                                  <div className={`h-px mb-5 ${isCurrentTabAndTier ? 'bg-[rgba(17,131,224,0.2)]' : 'bg-[rgba(255,255,255,0.06)]'}`} />

                                  {/* CTA */}
                                  <Button
                                    type="primary"
                                    size="middle"
                                    block
                                    icon={isCurrentTabAndTier
                                      ? <CheckCircle className="w-4 h-4" />
                                      : <ArrowRight className="w-4 h-4" />}
                                    onClick={() => { if (!isCurrentTabAndTier) handleTierSubscribe(plan, tier, subscriptionType); }}
                                    disabled={isCurrentTabAndTier}
                                    style={isCurrentTabAndTier
                                      ? { background: '#2563eb', color: '#fff', border: 'none', cursor: 'default', opacity: 1, fontWeight: 600 }
                                      : { ...primaryButtonStyle, fontWeight: 600 }}
                                  >
                                    {isCurrentTabAndTier ? 'Current Plan' : isCurrentPlan ? 'Switch to This' : 'Subscribe Now'}
                                  </Button>
                                </div>
                              );
                            })}
                          </div>

                          {/* ── Additional Truck Pricing ── */}
                          {extraPrice > 0 && (() => {
                            const billingFactor = planTab === 'monthly' ? 1 : planTab === '6months' ? 6 : 12;
                            const billingLabel = planTab === 'monthly' ? '/truck / month' : planTab === '6months' ? '/truck / 6 months' : '/truck / year';
                            const extraDisplayPrice = extraPrice * billingFactor;
                            const lastTierMax = tiers[tiers.length - 1]?.maxTrucks ?? 0;
                            return (
                              <div className="mb-6 rounded-2xl border-2 border-dashed border-[rgba(245,158,11,0.35)] bg-card overflow-hidden">
                                <div className="flex items-center gap-2 px-5 py-3 bg-[rgba(245,158,11,0.08)] border-b border-[rgba(245,158,11,0.2)]">
                                  <TrendingUp className="w-4 h-4 text-[#F59E0B]" />
                                  <span className="text-sm font-bold text-[#F59E0B]">Additional Trucks Beyond {lastTierMax}</span>
                                </div>
                                <div className="flex items-center gap-5 flex-wrap px-5 py-4">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-primary">Have more than <strong>{lastTierMax} trucks</strong>? Add extras at a flat per-truck rate — no plan change needed.</p>
                                    <p className="text-xs text-secondary mt-1">Base rate: {formatPrice(extraPrice, extraCurrency)}/truck/month</p>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className="text-2xl font-extrabold text-[#F59E0B]">{formatPrice(extraDisplayPrice, extraCurrency)}</p>
                                    <p className="text-xs text-orange-500 font-medium">{billingLabel}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </>
                      )}

                      {/* ── Features ── */}
                      {plan.features && plan.features.filter(f => f.included).length > 0 && (
                        <div className={`${tiers.length > 0 ? 'border-t border-theme pt-6' : ''}`}>
                          <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-4">What's Included</p>
                          <div className={`grid gap-2.5 ${plan.features.filter(f => f.included).length > 4 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                            {plan.features.filter(f => f.included).map((f, fIdx) => (
                              <div key={fIdx} className="flex items-center gap-2.5">
                                <div className="w-5 h-5 bg-[rgba(0,255,163,0.1)] rounded-full flex items-center justify-center flex-shrink-0">
                                  <CheckCircle className="w-3.5 h-3.5 text-[#00FFA3]" />
                                </div>
                                <span className="text-sm text-primary">{f.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Subscription History Tab */}
          {activeTab === 'history' && (
            <div>
              {subscriptions.length > 0 ? (
                <div className="space-y-4">
                  {subscriptions.map((sub) => (
                    <Card
                      key={sub._id}
                      className="hover:shadow-lg transition-all duration-300 border-2 border-theme hover:border-[#1183e0]/40 !mb-4"
                      style={cardAccentStyle}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-4">
                            {getStatusIcon(sub.status)}
                            <h3 className="text-xl font-bold text-primary">
                              {typeof sub.plan === 'object'
                                ? sub.plan?.planName
                                : sub.planSnapshot?.planName || 'Plan'}
                            </h3>
                            <Tag color={getStatusColor(sub.status)}>{sub.status.toUpperCase()}</Tag>
                            <Tag color={sub.paymentStatus === 'paid' ? 'success' : 'warning'}>
                              {sub.paymentStatus.toUpperCase()}
                            </Tag>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-[rgba(17,131,224,0.06)] rounded-lg p-3 border border-[rgba(17,131,224,0.15)]">
                              <div className="flex items-center gap-2 mb-1">
                                <DollarSign className="w-4 h-4 text-[var(--accent-navyblue)]" />
                                <span className="text-xs text-secondary font-medium">Amount</span>
                              </div>
                              <p className="text-lg font-bold text-primary">
                                {formatPrice(sub.amount, sub.currency)}
                                {sub.planType === 'monthly' && (
                                  <span className="text-sm font-normal text-secondary">/month</span>
                                )}
                              </p>
                            </div>
                            <div className="bg-[rgba(168,85,247,0.06)] rounded-lg p-3 border border-[rgba(168,85,247,0.2)]">
                              <div className="flex items-center gap-2 mb-1">
                                <Calendar className="w-4 h-4 text-[#A855F7]" />
                                <span className="text-xs text-secondary font-medium">Started</span>
                              </div>
                              <p className="text-sm font-bold text-primary">
                                {new Date(sub.startDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </p>
                            </div>
                            {sub.nextBillingDate && (
                              <div className="bg-[rgba(0,255,163,0.06)] rounded-lg p-3 border border-[rgba(0,255,163,0.2)]">
                                <div className="flex items-center gap-2 mb-1">
                                  <Clock className="w-4 h-4 text-[#00FFA3]" />
                                  <span className="text-xs text-secondary font-medium">Next Billing</span>
                                </div>
                                <p className="text-sm font-bold text-primary">
                                  {new Date(sub.nextBillingDate).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </p>
                              </div>
                            )}
                            {sub.installments && (
                              <div className="bg-[rgba(245,158,11,0.06)] rounded-lg p-3 border border-[rgba(245,158,11,0.2)]">
                                <div className="flex items-center gap-2 mb-1">
                                  <TrendingUp className="w-4 h-4 text-[#F59E0B]" />
                                  <span className="text-xs text-secondary font-medium">Installments</span>
                                </div>
                                <p className="text-sm font-bold text-primary">
                                  {sub.installments.paid}/{sub.installments.total}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        {sub.status === 'active' && (
                          <Button
                            danger
                            size="large"
                            icon={<X className="w-4 h-4" />}
                            onClick={(e) => handleCancelSubscription(sub._id, e)}
                            className="lg:self-start !bg-red-500 !text-white"
                            style={{ pointerEvents: 'auto', zIndex: 10 }}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="text-center py-12">
                  <History className="w-16 h-16 text-secondary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-primary mb-2">No Subscription History</h3>
                  <p className="text-secondary">You don't have any past subscriptions yet.</p>
                </Card>
              )}
            </div>
          )}
        </div>
        </>
        )}
      </div>

      {/* Enhanced Subscribe Confirmation Modal */}
      <Modal
        title={
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--accent-navyblue)] rounded-lg">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-primary">Confirm Subscription</span>
          </div>
        }
        open={showSubscribeModal}
        onCancel={() => {
          setShowSubscribeModal(false);
          setSelectedPlan(null);
          setSelectedType('');
          setSelectedTier(null);
          setTruckCount(1);
          setExtraTrucks(0);
        }}
        footer={[
          <Button
            key="cancel"
            size="large"
            onClick={() => {
              setShowSubscribeModal(false);
              setSelectedPlan(null);
              setSelectedType('');
              setSelectedTier(null);
              setTruckCount(1);
            }}
            className="font-semibold"
          >
            Cancel
          </Button>,
          <Button
            key="confirm"
            type="primary"
            size="large"
            loading={processing}
            onClick={confirmSubscribe}
            icon={<ArrowRight className="w-4 h-4" />}
            style={primaryButtonStyle}
          >
            {processing ? 'Processing...' : 'Proceed to Checkout'}
          </Button>,
        ]}
        width={600}
        styles={{
          content: { background: 'var(--bg-card)', padding: 0 },
          header: { background: 'var(--bg-card)', padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 0 },
          body: { background: 'var(--bg-card)', padding: '0 24px' },
          footer: { background: 'var(--bg-card)', padding: '16px 24px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 0 },
        }}
      >
        {selectedPlan && (
          <div className="space-y-6 py-4">
            <div className="bg-[rgba(17,131,224,0.08)] rounded-xl p-4 border-2 border-[rgba(17,131,224,0.25)]">
              <p className="text-primary mb-2">
                You are about to subscribe to
              </p>
              <h3 className="text-2xl font-bold text-primary mb-4">{selectedPlan.planName}</h3>
              <div className="flex items-center gap-2">
                <Tag color={selectedPlan.planType === 'lifetime' ? 'blue' : 'green'}>
                  {selectedPlan.planType}
                </Tag>
                <span className="text-secondary text-sm">with the following option:</span>
              </div>
            </div>

            <div className="bg-[#0B1220] rounded-xl p-6 border-2 border-theme">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[var(--accent-navyblue)]" />
                  <p className="font-bold text-primary text-lg capitalize">
                    {selectedType.replace('-', ' ')}
                  </p>
                </div>
              </div>
              {selectedPlan.planType === 'lifetime' && selectedPlan.lifetime && (
                <>
                  {selectedType === 'one-time' && (
                    <div>
                      <p className="text-3xl font-bold text-primary mb-2">
                        {formatPrice(selectedPlan.lifetime.oneTime.price, selectedPlan.lifetime.oneTime.currency)}
                      </p>
                      <p className="text-sm text-secondary">One-time payment, lifetime access</p>
                    </div>
                  )}
                  {selectedType === '3-months' && (
                    <div>
                      <p className="text-3xl font-bold text-primary mb-2">
                        {formatPrice(selectedPlan.lifetime.installments?.threeMonths?.price ?? 0, selectedPlan.lifetime.installments?.threeMonths?.currency ?? 'CAD')}
                        <span className="text-lg font-normal text-secondary">/month</span>
                      </p>
                      <p className="text-sm text-secondary">3 monthly payments of {formatPrice(selectedPlan.lifetime.installments?.threeMonths?.price ?? 0, selectedPlan.lifetime.installments?.threeMonths?.currency ?? 'CAD')}</p>
                    </div>
                  )}
                  {selectedType === '6-months' && (
                    <div>
                      <p className="text-3xl font-bold text-primary mb-2">
                        {formatPrice(selectedPlan.lifetime.installments?.sixMonths?.price ?? 0, selectedPlan.lifetime.installments?.sixMonths?.currency ?? 'CAD')}
                        <span className="text-lg font-normal text-secondary">/month</span>
                      </p>
                      <p className="text-sm text-secondary">6 monthly payments of {formatPrice(selectedPlan.lifetime.installments?.sixMonths?.price ?? 0, selectedPlan.lifetime.installments?.sixMonths?.currency ?? 'CAD')}</p>
                    </div>
                  )}
                </>
              )}
              {selectedPlan.planType === 'monthly' && selectedPlan.monthly && (
                <>
                  {selectedType === 'full-app' && (
                    <div>
                      <p className="text-3xl font-bold text-primary mb-2">
                        {formatPrice(selectedPlan.monthly.fullApp?.price ?? 0, selectedPlan.monthly.fullApp?.currency ?? 'CAD')}
                        <span className="text-lg font-normal text-secondary">/month</span>
                      </p>
                      <p className="text-sm text-secondary">Complete feature bundle</p>
                    </div>
                  )}
                  {selectedType === 'without-hr' && (
                    <div>
                      <p className="text-3xl font-bold text-primary mb-2">
                        {formatPrice(selectedPlan.monthly.withoutHR?.price ?? 0, selectedPlan.monthly.withoutHR?.currency ?? 'CAD')}
                        <span className="text-lg font-normal text-secondary">/month</span>
                      </p>
                      <p className="text-sm text-secondary">Streamlined experience without HR</p>
                    </div>
                  )}
                  {(selectedType === '1-month' || selectedType === '6-months' || selectedType === '1-year') && selectedTier && (() => {
                    const billingFactor = selectedType === '1-month' ? 1 : selectedType === '6-months' ? 6 : 12;
                    const billingLabel = selectedType === '1-month' ? '/month' : selectedType === '6-months' ? '/6 months' : '/year';
                    const allTiers = selectedPlan?.monthly?.truckPricing?.tiers ?? [];
                    const globalMaxTrucks = allTiers.length > 0 ? allTiers[allTiers.length - 1].maxTrucks : selectedTier.maxTrucks;
                    const extraTruckPrice = selectedPlan?.monthly?.truckPricing?.extraTruckPrice ?? 0;
                    const extraTruckCurrency = selectedPlan?.monthly?.truckPricing?.extraTruckCurrency ?? selectedTier.currency;
                    const basePriceTotal = selectedTier.monthlyPrice * billingFactor;
                    const extraCostTotal = extraTrucks * extraTruckPrice * billingFactor;
                    const grandTotal = basePriceTotal + extraCostTotal;

                    return (
                      <div className="space-y-4">
                        {/* Tier base price row */}
                        <div className="bg-card rounded-xl border border-theme overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-3 border-b border-theme">
                            <div className="flex items-center gap-2">
                              <Truck className="w-4 h-4 text-orange-500" />
                              <span className="text-sm font-semibold text-primary">{selectedTier.minTrucks}–{selectedTier.maxTrucks} Trucks (base)</span>
                            </div>
                            <span className="text-sm font-bold text-primary">
                              {formatPrice(basePriceTotal, selectedTier.currency)}<span className="text-xs font-normal text-secondary">{billingLabel}</span>
                            </span>
                          </div>

                          {/* Extra trucks row — shown for all tiers */}
                          {extraTruckPrice > 0 && (
                            <div className="px-4 py-3 border-b border-theme">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-secondary">Extra trucks (beyond {globalMaxTrucks})</span>
                                <span className="text-xs text-[#F59E0B] font-medium">{formatPrice(extraTruckPrice, extraTruckCurrency)}/truck/mo</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => setExtraTrucks(Math.max(0, extraTrucks - 1))}
                                  className="w-8 h-8 rounded-lg border border-[rgba(17,131,224,0.2)] bg-[#0B1220] flex items-center justify-center text-primary hover:bg-[rgba(17,131,224,0.08)] font-bold text-lg leading-none"
                                >−</button>
                                <span className="w-12 text-center font-bold text-lg text-primary">{extraTrucks}</span>
                                <button
                                  onClick={() => setExtraTrucks(extraTrucks + 1)}
                                  className="w-8 h-8 rounded-lg border border-[rgba(17,131,224,0.2)] bg-[#0B1220] flex items-center justify-center text-primary hover:bg-[rgba(17,131,224,0.08)] font-bold text-lg leading-none"
                                >+</button>
                                {extraTrucks > 0 && (
                                  <span className="ml-auto text-sm font-semibold text-[#F59E0B]">
                                    +{formatPrice(extraCostTotal, extraTruckCurrency)}{billingLabel}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Grand total */}
                          <div className="flex items-center justify-between px-4 py-3 bg-card">
                            <span className="text-sm font-bold text-primary">Total</span>
                            <div className="text-right">
                              <span className="text-xl font-extrabold text-[var(--accent-navyblue)]">{formatPrice(grandTotal, selectedTier.currency)}</span>
                              <span className="text-xs text-secondary ml-1">{billingLabel}</span>
                              {selectedType !== '1-month' && (
                                <p className="text-xs text-secondary mt-0.5">{formatPrice(grandTotal / billingFactor, selectedTier.currency)}/mo equivalent</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>

            <div className="bg-card rounded-lg p-4 border border-[rgba(17,131,224,0.15)] flex items-start gap-3">
              <Info className="w-5 h-5 text-[var(--accent-navyblue)] mt-0.5 flex-shrink-0" />
              <p className="text-sm text-primary">
                You will be redirected to <strong>Stripe checkout</strong> to complete your payment securely.
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Extra Trucks Modal */}
      <Modal
        title={
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-primary">Add Extra Trucks</span>
          </div>
        }
        open={showAddTruckModal}
        onCancel={() => { setShowAddTruckModal(false); setAddTruckCount(1); }}
        footer={[
          <Button key="cancel" size="large" onClick={() => { setShowAddTruckModal(false); setAddTruckCount(1); }}>Cancel</Button>,
          <Button
            key="confirm"
            type="primary"
            size="large"
            loading={addTruckProcessing}
            onClick={confirmAddTrucks}
            icon={<ArrowRight className="w-4 h-4" />}
            style={{ background: 'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)', border: 'none', fontWeight: 600 }}
          >
            {addTruckProcessing ? 'Processing...' : 'Proceed to Checkout'}
          </Button>,
        ]}
        width={500}
        styles={{
          content: { background: 'var(--bg-card)', padding: 0 },
          header: { background: 'var(--bg-card)', padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 0 },
          body: { background: 'var(--bg-card)', padding: '0 24px' },
          footer: { background: 'var(--bg-card)', padding: '16px 24px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 0 },
        }}
      >
        {activeSubscription && (() => {
          const activePlan = typeof activeSubscription.plan === 'object' ? activeSubscription.plan as Plan : null;
          const extraTruckPrice = activePlan?.monthly?.truckPricing?.extraTruckPrice ?? 0;
          const extraTruckCurrency = activePlan?.monthly?.truckPricing?.extraTruckCurrency ?? 'CAD';
          const currentMaxTrucks = activeSubscription.maxTrucks ?? activeSubscription.truckCount ?? 0;
          const totalCost = addTruckCount * extraTruckPrice;

          return (
            <div className="space-y-5 py-4">
              <div className="bg-card border border-[rgba(245,158,11,0.25)] rounded-xl p-4">
                <p className="text-sm text-primary mb-1">You are adding extra trucks to:</p>
                <p className="text-lg font-bold text-[#F59E0B]">
                  {activePlan?.planName || 'Your Current Plan'}
                </p>
                <p className="text-xs text-secondary mt-1">Current limit: {currentMaxTrucks} trucks</p>
              </div>

              <div className="bg-card rounded-xl border border-theme p-5">
                <p className="text-sm font-semibold text-primary mb-3">How many extra trucks do you need?</p>
                <div className="flex items-center gap-4 mb-4">
                  <button
                    onClick={() => setAddTruckCount(Math.max(1, addTruckCount - 1))}
                    className="w-10 h-10 rounded-xl border-2 border-[rgba(17,131,224,0.2)] bg-[#0B1220] flex items-center justify-center text-primary hover:bg-[rgba(17,131,224,0.08)] font-bold text-xl leading-none"
                  >−</button>
                  <span className="w-16 text-center font-bold text-2xl text-primary">{addTruckCount}</span>
                  <button
                    onClick={() => setAddTruckCount(addTruckCount + 1)}
                    className="w-10 h-10 rounded-xl border-2 border-[rgba(245,158,11,0.4)] bg-[#0B1220] flex items-center justify-center text-[#F59E0B] hover:bg-[rgba(245,158,11,0.08)] font-bold text-xl leading-none"
                  >+</button>
                  <div className="ml-2">
                    <p className="text-xs text-secondary">truck{addTruckCount > 1 ? 's' : ''} to add</p>
                    <p className="text-xs text-secondary">New limit: <strong>{currentMaxTrucks + addTruckCount}</strong> trucks</p>
                  </div>
                </div>

                <div className="border-t border-theme pt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-secondary">{addTruckCount} truck{addTruckCount > 1 ? 's' : ''} × {formatPrice(extraTruckPrice, extraTruckCurrency)}/truck/mo</span>
                    <span className="font-semibold text-primary">{formatPrice(totalCost, extraTruckCurrency)}/mo</span>
                  </div>
                  <div className="flex items-center justify-between bg-card rounded-lg px-3 py-2">
                    <span className="text-sm font-bold text-primary">Total charge now</span>
                    <span className="text-xl font-extrabold text-[#F59E0B]">{formatPrice(totalCost, extraTruckCurrency)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-lg p-4 border border-[rgba(17,131,224,0.15)] flex items-start gap-3">
                <Info className="w-5 h-5 text-[var(--accent-navyblue)] mt-0.5 flex-shrink-0" />
                <p className="text-sm text-primary">
                  You will be redirected to <strong>Stripe checkout</strong> to complete the payment. Your truck limit will be increased immediately after payment.
                </p>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Cancel Subscription Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <span className="text-xl font-bold text-primary">Cancel Subscription</span>
          </div>
        }
        open={showCancelModal}
        onCancel={() => {
          setShowCancelModal(false);
          setCancelSubscriptionId(null);
        }}
        footer={[
          <Button
            key="cancel"
            size="large"
            onClick={() => {
              setShowCancelModal(false);
              setCancelSubscriptionId(null);
            }}
            disabled={cancelling}
            className="font-semibold"
          >
            Keep Subscription
          </Button>,
          <Button
            key="confirm"
            type="primary"
            danger
            size="large"
            loading={cancelling}
            onClick={confirmCancelSubscription}
            icon={<X className="w-4 h-4" />}
            className="bg-red-500 hover:bg-red-600 border-red-500 hover:border-red-600 font-semibold shadow-lg"
          >
            {cancelling ? 'Cancelling...' : 'Yes, Cancel Subscription'}
          </Button>,
        ]}
        width={500}
        centered
        maskClosable={!cancelling}
        styles={{
          content: { background: 'var(--bg-card)', padding: 0 },
          header: { background: 'var(--bg-card)', padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 0 },
          body: { background: 'var(--bg-card)', padding: '0 24px' },
          footer: { background: 'var(--bg-card)', padding: '16px 24px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 0 },
        }}
      >
        <div className="py-4">
          <div className="mb-4">
            <p className="text-primary mb-2">
              Are you sure you want to cancel this subscription?
            </p>
            <p className="text-[var(--accent-navyblue)] font-semibold">
              This action cannot be undone.
            </p>
          </div>
          <div className="bg-card border border-[rgba(245,158,11,0.25)] rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-[#00FFA3] mt-0.5 flex-shrink-0" />
              <p className="text-sm text-secondary">
                Your subscription will remain active until the end of the current billing period.
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SubscriptionPage;

