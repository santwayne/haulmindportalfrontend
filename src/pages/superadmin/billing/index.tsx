import { useState, useEffect } from 'react';
import {
  CreditCard, Plus, Edit, Trash2, Eye, Search, Calendar,
  CheckCircle, XCircle, Zap, BarChart3, Grid3x3, List,
  Star, Copy, ArrowUpDown, Sparkles, TrendingUp, AlertCircle,
  ToggleLeft, ToggleRight,
} from 'lucide-react';
import { message, Modal, Input, Select, Button, Switch, Tag, Tooltip, Dropdown } from 'antd';
import { getAllPlans, createPlan, updatePlan, deletePlan } from '../../../axios/api/superadmin';

interface TruckTier {
  minTrucks: number;
  maxTrucks: number;
  monthlyPrice: number;
  currency: string;
}

interface TruckPricing {
  tiers: TruckTier[];
  extraTruckPrice: number;
  extraTruckCurrency: string;
  sixMonthBonusDays: number;
  annualFreeMonths: number;
}

interface Plan {
  _id: string;
  planName: string;
  planType: 'lifetime' | 'monthly';
  description: string;
  lifetime?: {
    oneTime: { price: number; currency: string; };
    installments: {
      threeMonths: { price: number; currency: string; enabled: boolean; };
      sixMonths: { price: number; currency: string; enabled: boolean; };
    };
  };
  monthly?: {
    fullApp: { price: number; currency: string; enabled: boolean; };
    truckPricing?: TruckPricing;
    yearly?: { price: number; currency: string; enabled: boolean; };
  };
  features?: Array<{ name: string; included: boolean }>;
  allowedRoles?: string[];
  blockedRoles?: string[];
  status: 'active' | 'inactive';
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'active' | 'inactive' | 'default';
type SortType = 'name' | 'price' | 'created' | 'status';


const createDefaultTruckPricing = (): TruckPricing => ({
  tiers: [
    { minTrucks: 1, maxTrucks: 10, monthlyPrice: 199, currency: 'CAD' },
    { minTrucks: 11, maxTrucks: 20, monthlyPrice: 399, currency: 'CAD' },
  ],
  extraTruckPrice: 19.99,
  extraTruckCurrency: 'CAD',
  sixMonthBonusDays: 15,
  annualFreeMonths: 1,
});

const createDefaultMonthly = () => ({
  fullApp: { price: 0, currency: 'CAD', enabled: false },
  truckPricing: createDefaultTruckPricing(),
  yearly: { price: 0, currency: 'CAD', enabled: false },
});

const Billing = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);
  const [deletePlanName, setDeletePlanName] = useState<string>('');
  const [deleting, setDeleting] = useState(false);
  const [statusTogglingId, setStatusTogglingId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortType, setSortType] = useState<SortType>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [previewTab, setPreviewTab] = useState<'monthly' | '6months' | 'annual'>('monthly');
  const [editDescription, setEditDescription] = useState('');

  const [formData, setFormData] = useState({
    planName: '',
    planType: 'monthly' as 'lifetime' | 'monthly',
    description: '',
    lifetime: {
      oneTime: { price: 17999, currency: 'CAD' },
      installments: {
        threeMonths: { price: 6200, currency: 'CAD', enabled: true },
        sixMonths: { price: 3150, currency: 'CAD', enabled: true }
      }
    },
    monthly: createDefaultMonthly(),
    features: [] as Array<{ name: string; included: boolean }>,
    allowedRoles: [] as string[],
    blockedRoles: [] as string[],
    status: 'active' as 'active' | 'inactive',
    isDefault: false
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const response = await getAllPlans();
      console.log('Plans API Response:', response);
      if (response?.success) {
        setPlans(response.data || []);
        console.log('Plans loaded:', response.data?.length || 0);
      } else {
        console.error('Failed to fetch plans:', response);
        message.error(response?.message || 'Failed to fetch plans');
      }
    } catch (error: any) {
      console.error('Error fetching plans:', error);
      console.error('Error details:', error?.response?.data || error);
      message.error(error?.response?.data?.message || error?.message || 'Failed to fetch plans');
    } finally {
      setLoading(false);
    }
  };

  // Only monthly plans are shown
  const monthlyPlans = plans.filter(p => p.planType === 'monthly');

  // Calculate statistics
  const stats = {
    totalPlans: monthlyPlans.length,
    activePlans: monthlyPlans.filter(p => p.status === 'active').length,
    defaultPlan: monthlyPlans.find(p => p.isDefault) || null,
  };

  // Filter and sort plans (lifetime always hidden)
  const filteredAndSortedPlans = monthlyPlans
    .filter(plan => {
      if (searchTerm && !plan.planName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !plan.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (filterType === 'active' && plan.status !== 'active') return false;
      if (filterType === 'inactive' && plan.status !== 'inactive') return false;
      if (filterType === 'default' && !plan.isDefault) return false;
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortType) {
        case 'name':
          comparison = a.planName.localeCompare(b.planName);
          break;
        case 'price':
          const priceA = a.planType === 'lifetime'
            ? (a.lifetime?.oneTime.price || 0)
            : (a.monthly?.fullApp.price || 0);
          const priceB = b.planType === 'lifetime'
            ? (b.lifetime?.oneTime.price || 0)
            : (b.monthly?.fullApp.price || 0);
          comparison = priceA - priceB;
          break;
        case 'created':
          comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const resetForm = () => {
    setFormData({
      planName: '',
      planType: 'monthly',
      description: '',
      lifetime: {
        oneTime: { price: 17999, currency: 'CAD' },
        installments: {
          threeMonths: { price: 6200, currency: 'CAD', enabled: true },
          sixMonths: { price: 3150, currency: 'CAD', enabled: true }
        }
      },
      monthly: createDefaultMonthly(),
      features: [],
      allowedRoles: [],
      blockedRoles: [],
      status: 'active',
      isDefault: false
    });
    setSelectedPlan(null);
  };

  const handleCreate = async () => {
    try {
      if (!formData.planName) {
        message.error('Plan name is required');
        return;
      }

      const response = await createPlan(formData);
      if (response?.success) {
        message.success(response.message || 'Plan created successfully');
        setShowCreateModal(false);
        resetForm();
        fetchPlans();
      } else {
        message.error(response?.message || 'Failed to create plan');
      }
    } catch (error: any) {
      console.error('Error creating plan:', error);
      message.error(error?.message || 'Failed to create plan');
    }
  };

  const handleEdit = (plan: Plan) => {
    setSelectedPlan(plan);
    setEditDescription(plan.description || '');
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedPlan) return;
    try {
      const response = await updatePlan(selectedPlan._id, { description: editDescription });
      if (response?.success) {
        message.success('Description updated successfully');
        setShowEditModal(false);
        fetchPlans();
      } else {
        message.error(response?.message || 'Failed to update plan');
      }
    } catch (error: any) {
      message.error(error?.message || 'Failed to update plan');
    }
  };

  const handleToggleStatus = async (plan: Plan) => {
    const newStatus = plan.status === 'active' ? 'inactive' : 'active';
    setStatusTogglingId(plan._id);
    try {
      const response = await updatePlan(plan._id, { status: newStatus });
      if (response?.success) {
        message.success(`Plan is now ${newStatus}`);
        fetchPlans();
      } else {
        message.error(response?.message || 'Failed to update plan status');
      }
    } catch (error: any) {
      message.error(error?.message || 'Failed to update plan status');
    } finally {
      setStatusTogglingId(null);
    }
  };

  const handleDelete = (plan: Plan) => {
    setDeletePlanId(plan._id);
    setDeletePlanName(plan.planName);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deletePlanId) return;

    setDeleting(true);
    try {
      const response = await deletePlan(deletePlanId);
      if (response?.success) {
        message.success(response.message || 'Plan deleted successfully');
        setShowDeleteModal(false);
        setDeletePlanId(null);
        setDeletePlanName('');
        fetchPlans();
      } else {
        message.error(response?.message || 'Failed to delete plan');
      }
    } catch (error: any) {
      console.error('Error deleting plan:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete plan';
      message.error(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  const handleView = (plan: Plan) => {
    setSelectedPlan(plan);
    setShowViewModal(true);
  };

  const handleDuplicate = async (plan: Plan) => {
    try {
      const tp = plan.monthly?.truckPricing;
      setFormData({
        planName: `${plan.planName} (Copy)`,
        planType: plan.planType,
        description: plan.description || '',
        lifetime: plan.lifetime || {
          oneTime: { price: 17999, currency: 'CAD' },
          installments: {
            threeMonths: { price: 6200, currency: 'CAD', enabled: true },
            sixMonths: { price: 3150, currency: 'CAD', enabled: true }
          }
        },
        monthly: {
          fullApp: { price: plan.monthly?.fullApp?.price ?? 0, currency: 'CAD', enabled: plan.monthly?.fullApp?.enabled ?? false },
          truckPricing: {
            tiers: tp?.tiers ?? [],
            extraTruckPrice: tp?.extraTruckPrice ?? 0,
            extraTruckCurrency: tp?.extraTruckCurrency ?? 'CAD',
            sixMonthBonusDays: tp?.sixMonthBonusDays ?? 15,
            annualFreeMonths: tp?.annualFreeMonths ?? 1,
          },
          yearly: { price: plan.monthly?.yearly?.price ?? 0, currency: 'CAD', enabled: plan.monthly?.yearly?.enabled ?? false },
        },
        features: plan.features || [],
        allowedRoles: plan.allowedRoles || [],
        blockedRoles: plan.blockedRoles || [],
        status: 'inactive',
        isDefault: false
      });
      setShowCreateModal(true);
    } catch (error: any) {
      message.error('Failed to duplicate plan');
    }
  };

  const formatPrice = (price: number, currency: string = 'CAD') => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: currency
    }).format(price);
  };

  const getPlanHeaderStyle = (plan: Plan): React.CSSProperties => {
    if (plan.isDefault) return { background: 'linear-gradient(135deg, #091527 0%, #0d1e3a 100%)', borderBottom: '1px solid rgba(17,131,224,0.25)' };
    return { background: 'linear-gradient(135deg, #0a1a10 0%, #0d2318 100%)', borderBottom: '1px solid rgba(0,255,163,0.15)' };
  };

  const toggleSort = (type: SortType) => {
    if (sortType === type) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortType(type);
      setSortDirection('asc');
    }
  };

  const updateTruckPricing = (field: keyof TruckPricing, value: any) => {
    setFormData(prev => ({
      ...prev,
      monthly: { ...prev.monthly, truckPricing: { ...prev.monthly.truckPricing!, [field]: value } }
    }));
  };

  const updateTier = (idx: number, field: keyof TruckTier, value: number | string) => {
    updateTruckPricing('tiers', (formData.monthly.truckPricing?.tiers || []).map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  const addFeature = () => setFormData(prev => ({ ...prev, features: [...prev.features, { name: '', included: true }] }));
  const removeFeature = (idx: number) => setFormData(prev => ({ ...prev, features: prev.features.filter((_, i) => i !== idx) }));
  const updateFeature = (idx: number, field: 'name' | 'included', value: string | boolean) =>
    setFormData(prev => ({ ...prev, features: prev.features.map((f, i) => i === idx ? { ...f, [field]: value } : f) }));

  const renderPricingPreview = (tiers: TruckTier[], tp: TruckPricing, tab: 'monthly' | '6months' | 'annual', onTabChange: (t: 'monthly' | '6months' | 'annual') => void) => {
    const bonusDays = tp.sixMonthBonusDays ?? 15;
    const freeMonths = tp.annualFreeMonths ?? 1;
    const extraPrice = tp.extraTruckPrice ?? 0;

    return (
      <div className="rounded-xl p-4 mt-4" style={{ backgroundColor: 'var(--bg-card-light)' }}>
        {/* Tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {(['monthly', '6months', 'annual'] as const).map(t => (
            <button key={t} onClick={() => onTabChange(t)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${tab === t ? 'bg-card border-theme shadow-sm text-primary' : 'bg-transparent border-transparent text-secondary hover:text-primary'}`}>
              {t === 'monthly' ? 'Monthly' : t === '6months' ? (
                <span className="flex items-center gap-1.5">6 Months {bonusDays > 0 && <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold text-[#F59E0B]" style={{ backgroundColor: 'rgba(245,158,11,0.12)' }}>+{bonusDays} days free</span>}</span>
              ) : (
                <span className="flex items-center gap-1.5">Annual {freeMonths > 0 && <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold text-[#00FFA3]" style={{ backgroundColor: 'rgba(0,255,163,0.1)' }}>{freeMonths} month free</span>}</span>
              )}
            </button>
          ))}
        </div>

        {/* Bonus banner */}
        {tab === '6months' && bonusDays > 0 && (
          <div className="rounded-lg px-4 py-2.5 mb-3 text-sm border" style={{ backgroundColor: 'rgba(0,255,163,0.06)', borderColor: 'rgba(0,255,163,0.2)', color: '#00FFA3' }}>
            <strong>6-month bonus:</strong> Pay upfront for 6 months and receive {bonusDays} extra days of usage at no additional cost.
          </div>
        )}
        {tab === 'annual' && freeMonths > 0 && (
          <div className="rounded-lg px-4 py-2.5 mb-3 text-sm border" style={{ backgroundColor: 'rgba(17,131,224,0.06)', borderColor: 'rgba(17,131,224,0.2)', color: 'var(--accent-navyblue)' }}>
            <strong>Annual incentive:</strong> Pay for 12 months and get {freeMonths} full month{freeMonths > 1 ? 's' : ''} free — {12 + freeMonths} months of access for the price of 12.
          </div>
        )}

        {tiers.length === 0 ? (
          <p className="text-center text-sm text-secondary py-4 italic">Add truck tiers above to see pricing preview</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tiers.map((tier, i) => {
              const isPopular = i === 1 || (tiers.length === 1 && i === 0);
              const isLastTier = i === tiers.length - 1;
              let price: number;
              let priceLabel: string;
              let strikethrough: number | null = null;
              let saveLine: string | null = null;
              if (tab === 'monthly') {
                price = tier.monthlyPrice;
                priceLabel = '/month';
              } else if (tab === '6months') {
                price = tier.monthlyPrice * 6;
                priceLabel = ' for 6 months';
                saveLine = `${formatPrice(tier.monthlyPrice, tier.currency)}/month equivalent`;
              } else {
                price = tier.monthlyPrice * 12;
                strikethrough = tier.monthlyPrice * (12 + freeMonths);
                priceLabel = '/year';
                saveLine = `${formatPrice(tier.monthlyPrice, tier.currency)}/month · save ${formatPrice(tier.monthlyPrice * freeMonths, tier.currency)} vs monthly`;
              }
              return (
                <div key={i} className={`relative bg-card rounded-xl p-4 border-2 transition-shadow ${isPopular ? 'border-blue-500 shadow-md' : 'border-theme'}`}>
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full border border-blue-200">Most popular</div>
                  )}
                  <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-1">{tier.minTrucks} – {tier.maxTrucks} Trucks</p>
                  <div className="flex items-baseline gap-1 mb-1">
                    {strikethrough !== null && <span className="text-sm text-secondary line-through mr-1">{formatPrice(strikethrough, tier.currency)}</span>}
                    <span className="text-3xl font-bold text-primary">{formatPrice(price, tier.currency)}</span>
                    <span className="text-sm text-secondary">{priceLabel}</span>
                  </div>
                  {saveLine && <p className="text-xs text-secondary mb-3">{saveLine}</p>}
                  <hr className="border-theme mb-3" />
                  <ul className="space-y-1.5">
                    <li className="flex items-center gap-2 text-sm text-primary">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      Up to {tier.maxTrucks} trucks included
                    </li>
                    {tab === '6months' && bonusDays > 0 && (
                      <li className="flex items-center gap-2 text-sm text-primary">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        {bonusDays} bonus days at no extra cost
                      </li>
                    )}
                    {tab === 'annual' && freeMonths > 0 && (
                      <li className="flex items-center gap-2 text-sm text-primary">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        {freeMonths} month{freeMonths > 1 ? 's' : ''} free — {12 + freeMonths} months total
                      </li>
                    )}
                    {isLastTier && extraPrice > 0 && (
                      <li className="flex items-center gap-2 text-sm text-orange-700">
                        <TrendingUp className="w-4 h-4 text-orange-500 flex-shrink-0" />
                        +{formatPrice(extraPrice, tp.extraTruckCurrency ?? 'CAD')}/truck/mo beyond {tier.maxTrucks}
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {extraPrice > 0 && tiers.length > 0 && (() => {
          const lastTierMax = tiers[tiers.length - 1]?.maxTrucks ?? 0;
          const extraCur = tp.extraTruckCurrency ?? 'CAD';
          const periodPrice = tab === 'monthly' ? extraPrice : tab === '6months' ? extraPrice * 6 : extraPrice * 12;
          const periodLabel = tab === 'monthly' ? '/truck / month' : tab === '6months' ? '/truck / 6 months' : '/truck / year';
          return (
            <div className="mt-3 rounded-xl border-2 border-dashed border-orange-200 bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2 bg-orange-100 border-b border-orange-200">
                <span className="text-xs font-bold text-orange-800 uppercase tracking-wide">Additional Trucks Beyond {lastTierMax}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 flex-wrap gap-3">
                <p className="text-sm text-primary">
                  Base rate: <strong>{formatPrice(extraPrice, extraCur)}/truck/month</strong>
                  {tab !== 'monthly' && <span className="text-secondary"> (applied per month within your billing period)</span>}
                </p>
                <div className="text-right">
                  <span className="text-xl font-bold text-[#F59E0B]">{formatPrice(periodPrice, extraCur)}</span>
                  <span className="text-xs text-orange-500 ml-1">{periodLabel}</span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  };

  const renderPlanFormBody = () => {
    const tp = formData.monthly.truckPricing || createDefaultTruckPricing();
    const tiers = tp.tiers.length >= 2 ? tp.tiers : createDefaultTruckPricing().tiers;

    return (
      <div className="space-y-6 py-4">

        {/* ── Identity ── */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-1">Plan Name <span className="text-red-500">*</span></label>
            <Input
              value={formData.planName}
              onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
              placeholder="e.g. Standard Fleet Plan"
              size="large"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1">Status</label>
            <Select value={formData.status} onChange={(value) => setFormData({ ...formData, status: value })} className="w-full" size="large">
              <Select.Option value="active">Active</Select.Option>
              <Select.Option value="inactive">Inactive</Select.Option>
            </Select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-primary mb-1">Description</label>
          <Input.TextArea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Briefly describe what this plan includes..."
            rows={2}
          />
        </div>

        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border" style={{ backgroundColor: 'rgba(17,131,224,0.04)', borderColor: 'rgba(17,131,224,0.15)' }}>
          <Switch checked={formData.isDefault} onChange={(checked) => setFormData({ ...formData, isDefault: checked })} />
          <div>
            <p className="text-sm font-semibold text-primary">Set as Default Plan</p>
            <p className="text-xs text-secondary">New admins will be shown this plan first</p>
          </div>
        </div>

        {/* ── Fleet Tier Pricing ── */}
        <div className="border border-theme rounded-xl overflow-hidden">
          <div className="px-5 py-3 bg-card border-b border-theme flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-bold text-primary">Fleet Tier Pricing</span>
            <span className="ml-auto text-xs text-secondary bg-card border border-theme px-2 py-0.5 rounded-full">Fixed: 2 tiers</span>
          </div>

          <div className="p-5 grid grid-cols-2 gap-4">
            {/* Tier 1: 1–10 Trucks */}
            <div className="rounded-xl border-2 bg-card p-4" style={{ borderColor: 'rgba(245,158,11,0.3)' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-[#F59E0B] font-semibold uppercase tracking-wide">Tier 1</p>
                  <p className="text-sm font-bold text-primary">1 – 10 Trucks</p>
                </div>
              </div>
              <label className="block text-xs text-secondary mb-1">Monthly Price (CAD)</label>
              <Input
                type="number"
                size="large"
                value={tiers[0]?.monthlyPrice ?? 199}
                min={0}
                prefix="$"
                addonAfter="CAD/mo"
                onChange={(e) => updateTier(0, 'monthlyPrice', parseFloat(e.target.value) || 0)}
              />
            </div>

            {/* Tier 2: 11–20 Trucks */}
            <div className="rounded-xl border-2 bg-card p-4" style={{ borderColor: 'rgba(17,131,224,0.25)' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Star className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-[#00D1FF] font-semibold uppercase tracking-wide">Tier 2</p>
                  <p className="text-sm font-bold text-primary">11 – 20 Trucks</p>
                </div>
              </div>
              <label className="block text-xs text-secondary mb-1">Monthly Price (CAD)</label>
              <Input
                type="number"
                size="large"
                value={tiers[1]?.monthlyPrice ?? 399}
                min={0}
                prefix="$"
                addonAfter="CAD/mo"
                onChange={(e) => updateTier(1, 'monthlyPrice', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Extra truck price */}
          <div className="px-5 pb-5">
            <div className="rounded-xl border border-dashed p-4" style={{ borderColor: 'rgba(245,158,11,0.3)', backgroundColor: 'rgba(245,158,11,0.04)' }}>
              <div className="flex items-start gap-3">
                <TrendingUp className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-primary mb-0.5">Additional Truck Rate</label>
                  <p className="text-xs text-secondary mb-2">Charged per truck beyond 20 (last tier max)</p>
                  <Input
                    type="number"
                    value={tp.extraTruckPrice}
                    min={0}
                    prefix="$"
                    addonAfter="CAD / truck / month"
                    onChange={(e) => updateTruckPricing('extraTruckPrice', parseFloat(e.target.value) || 0)}
                    placeholder="19.99"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Billing bonuses */}
          <div className="px-5 pb-5 border-t border-theme pt-4">
            <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-3">Billing Period Bonuses</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl p-4 border" style={{ backgroundColor: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.2)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <label className="text-sm font-semibold text-primary">6-Month Bonus</label>
                </div>
                <p className="text-xs text-secondary mb-2">Free days added when paying 6 months upfront</p>
                <Input
                  type="number"
                  value={tp.sixMonthBonusDays}
                  min={0}
                  addonAfter="days free"
                  onChange={(e) => updateTruckPricing('sixMonthBonusDays', parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="rounded-xl p-4 border" style={{ backgroundColor: 'rgba(0,255,163,0.05)', borderColor: 'rgba(0,255,163,0.15)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-3.5 h-3.5 text-green-500" />
                  <label className="text-sm font-semibold text-primary">Annual Free Months</label>
                </div>
                <p className="text-xs text-secondary mb-2">Free months added when paying annually</p>
                <Input
                  type="number"
                  value={tp.annualFreeMonths}
                  min={0}
                  addonAfter="month(s) free"
                  onChange={(e) => updateTruckPricing('annualFreeMonths', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          {/* Live Preview */}
          <div className="px-5 pb-5 border-t border-theme pt-4">
            <p className="text-xs font-bold text-secondary uppercase tracking-widest mb-3">Live Pricing Preview</p>
            {renderPricingPreview(tiers, tp, previewTab, setPreviewTab)}
          </div>
        </div>

        {/* ── Features ── */}
        <div className="border border-theme rounded-xl overflow-hidden">
          <div className="px-5 py-3 bg-card border-b border-theme flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm font-bold text-primary">Plan Features</span>
            </div>
            <Button size="small" icon={<Plus className="w-3 h-3" />} onClick={addFeature}>Add Feature</Button>
          </div>
          <div className="p-5">
            {formData.features.length === 0 && (
              <p className="text-xs text-secondary italic text-center py-3">No features yet — click "Add Feature" to start</p>
            )}
            <div className="space-y-2">
              {formData.features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Switch size="small" checked={feature.included} onChange={(checked) => updateFeature(idx, 'included', checked)} />
                  <Input
                    value={feature.name}
                    onChange={(e) => updateFeature(idx, 'name', e.target.value)}
                    placeholder="e.g. Fleet Maintenance Tracking"
                    className="flex-1"
                    size="small"
                  />
                  <Button size="small" danger onClick={() => removeFeature(idx)}>×</Button>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    );
  };

  const mStyles = {
    content: { background: 'var(--bg-card)', padding: 0, borderRadius: '16px', overflow: 'hidden' as const, border: '1px solid rgba(17,131,224,0.2)' },
    body: { background: 'var(--bg-card)', padding: 0 },
  };
  const divider = { borderColor: 'rgba(17,131,224,0.12)' };

  // CSS overrides for Ant Design inputs inside dark modals
  const antdDarkInputs = `
    .billing-modal .ant-input, .billing-modal .ant-input-affix-wrapper,
    .billing-modal .ant-input-number, .billing-modal .ant-input-number-input {
      background: transparent !important; color: var(--text-primary) !important;
      border-color: rgba(17,131,224,0.2) !important;
    }
    .billing-modal .ant-input::placeholder { color: var(--text-secondary) !important; }
    .billing-modal .ant-input-affix-wrapper > input { background: transparent !important; color: var(--text-primary) !important; }
    .billing-modal .ant-input:focus, .billing-modal .ant-input-focused,
    .billing-modal .ant-input-affix-wrapper:focus, .billing-modal .ant-input-affix-wrapper-focused {
      border-color: var(--accent-navyblue) !important; box-shadow: 0 0 0 2px rgba(17,131,224,0.15) !important;
    }
    .billing-modal .ant-input-group-addon {
      background: rgba(17,131,224,0.06) !important; color: var(--text-secondary) !important;
      border-color: rgba(17,131,224,0.2) !important;
    }
    .billing-modal .ant-input-number-handler-wrap { background: var(--bg-card) !important; }
    .billing-modal .ant-input-number-handler { border-color: rgba(17,131,224,0.15) !important; }
    .billing-modal .ant-input-number-handler:hover { background: rgba(17,131,224,0.08) !important; }
    .billing-modal .ant-select-selector {
      background: transparent !important; border-color: rgba(17,131,224,0.2) !important;
    }
    .billing-modal .ant-select-selection-item, .billing-modal .ant-select-selection-placeholder {
      color: var(--text-primary) !important;
    }
    .billing-modal textarea.ant-input { background: transparent !important; }
    .billing-modal .ant-switch { background: rgba(255,255,255,0.15) !important; }
    .billing-modal .ant-switch-checked { background: var(--accent-navyblue) !important; }
    .billing-modal .ant-btn-sm { background: rgba(17,131,224,0.06) !important; color: var(--text-primary) !important; border-color: rgba(17,131,224,0.2) !important; }
    .billing-modal .ant-btn-sm:hover { background: rgba(17,131,224,0.12) !important; }
    .billing-modal .ant-btn-sm.ant-btn-dangerous { background: rgba(244,63,94,0.08) !important; color: var(--accent-red) !important; border-color: rgba(244,63,94,0.2) !important; }
  `;

  return (
    <div className="min-h-screen bg-main">
      {/* Header */}
      <div className="bg-card border-b border-theme shadow-sm">
        <div className="px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-primary flex items-center">
                <div className="relative">
                  <CreditCard className="w-8 h-8 mr-3" style={{ color: 'var(--accent-navyblue)' }} />
                  <Sparkles className="w-4 h-4 text-yellow-400 absolute -top-1 -right-1" />
                </div>
                Plan Management
              </h1>
              <p className="text-secondary mt-2">Create, manage, and optimize pricing plans for your customers</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                icon={<BarChart3 className="w-4 h-4" />}
                onClick={() => {
                  setShowCompareModal(true);
                  if (selectedPlans.length === 0 && plans.length >= 2) {
                    // Auto-select first two plans if none selected
                    setSelectedPlans(plans.slice(0, 2).map(p => p._id));
                  }
                }}
              >
                Compare Plans
              </Button>
              <Button
                type="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  resetForm();
                  setShowCreateModal(true);
                }}
                style={{ backgroundColor: 'var(--accent-navyblue)', border: 'none' }}
                size="large"
              >
                Create Plan
              </Button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="rounded-xl shadow-lg p-4 text-white border" style={{ background: 'linear-gradient(135deg, #091527 0%, #0d1e3a 100%)', borderColor: 'rgba(17,131,224,0.3)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90 mb-1">Total Plans</p>
                  <p className="text-2xl font-bold">{stats.totalPlans}</p>
                </div>
                <CreditCard className="w-8 h-8 opacity-80" />
              </div>
            </div>
            <div className="rounded-xl shadow-lg p-4 text-white border" style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)', borderColor: 'rgba(0,255,163,0.2)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90 mb-1">Active Plans</p>
                  <p className="text-2xl font-bold">{stats.activePlans}</p>
                </div>
                <CheckCircle className="w-8 h-8 opacity-80" />
              </div>
            </div>
            <div className="rounded-xl shadow-lg p-4 text-white border" style={{ background: 'linear-gradient(135deg, #451a03 0%, #78350f 100%)', borderColor: 'rgba(245,158,11,0.25)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90 mb-1">Default Plan</p>
                  <p className="text-lg font-bold truncate">{stats.defaultPlan ? stats.defaultPlan.planName : 'None'}</p>
                </div>
                <Star className="w-8 h-8 opacity-80 flex-shrink-0" />
              </div>
            </div>
          </div>

          {/* Search, Filter, and View Controls */}
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-5 h-5 z-10" />
              <input
                type="text"
                placeholder="Search plans by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-11 rounded-lg border pl-10 pr-4 text-sm text-primary bg-transparent focus:outline-none"
                style={{ borderColor: 'rgba(17,131,224,0.2)' }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--accent-navyblue)'; e.target.style.boxShadow = '0 0 0 2px rgba(17,131,224,0.15)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(17,131,224,0.2)'; e.target.style.boxShadow = ''; }}
              />
            </div>

            <div className="flex gap-2 items-center">
              {/* Filter select */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FilterType)}
                className="h-11 rounded-lg border px-3 pr-8 text-sm text-primary focus:outline-none w-36"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'rgba(17,131,224,0.2)' }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--accent-navyblue)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(17,131,224,0.2)'; }}
              >
                <option value="all" style={{ backgroundColor: 'var(--bg-card)' }}>All Plans</option>
                <option value="active" style={{ backgroundColor: 'var(--bg-card)' }}>Active</option>
                <option value="inactive" style={{ backgroundColor: 'var(--bg-card)' }}>Inactive</option>
                <option value="default" style={{ backgroundColor: 'var(--bg-card)' }}>Default</option>
              </select>

              {/* Sort dropdown */}
              <Dropdown
                menu={{
                  items: [
                    { key: 'name', label: 'Sort by Name', onClick: () => toggleSort('name') },
                    { key: 'price', label: 'Sort by Price', onClick: () => toggleSort('price') },
                    { key: 'created', label: 'Sort by Created', onClick: () => toggleSort('created') },
                    { key: 'status', label: 'Sort by Status', onClick: () => toggleSort('status') },
                  ]
                }}
                trigger={['click']}
              >
                <button className="h-11 flex items-center gap-2 px-4 rounded-lg border text-sm font-medium text-primary transition-colors"
                  style={{ backgroundColor: 'transparent', borderColor: 'rgba(17,131,224,0.2)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(17,131,224,0.06)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                  <ArrowUpDown className="w-4 h-4" /> Sort
                </button>
              </Dropdown>

              {/* Grid/List toggle */}
              <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'rgba(17,131,224,0.2)' }}>
                <button onClick={() => setViewMode('grid')}
                  className="w-10 h-10 flex items-center justify-center transition-all"
                  style={viewMode === 'grid'
                    ? { backgroundColor: 'var(--accent-navyblue)', color: '#fff' }
                    : { backgroundColor: 'transparent', color: 'var(--text-secondary)' }}>
                  <Grid3x3 className="w-4 h-4" />
                </button>
                <button onClick={() => setViewMode('list')}
                  className="w-10 h-10 flex items-center justify-center transition-all border-l"
                  style={viewMode === 'list'
                    ? { backgroundColor: 'var(--accent-navyblue)', color: '#fff', borderColor: 'rgba(17,131,224,0.2)' }
                    : { backgroundColor: 'transparent', color: 'var(--text-secondary)', borderColor: 'rgba(17,131,224,0.2)' }}>
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Plans Display */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-navyblue)]"></div>
          </div>
        ) : filteredAndSortedPlans.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-xl shadow-sm border border-theme">
            <CreditCard className="w-20 h-20 text-secondary mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-primary mb-2">No plans found</h3>
            <p className="text-secondary mb-6">
              {searchTerm || filterType !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first pricing plan to get started'}
            </p>
            {(!searchTerm && filterType === 'all') && (
              <Button
                type="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  resetForm();
                  setShowCreateModal(true);
                }}
                style={{ backgroundColor: 'var(--accent-navyblue)', border: 'none' }}
                size="large"
              >
                Create Plan
              </Button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="space-y-8">
            {filteredAndSortedPlans.map((plan) => {
              const tiers = plan.monthly?.truckPricing?.tiers ?? [];
              const tp = plan.monthly?.truckPricing;
              const extraPrice = tp?.extraTruckPrice ?? 0;
              const bonusDays = tp?.sixMonthBonusDays ?? 15;
              const freeMonths = tp?.annualFreeMonths ?? 1;
              const planTab = previewTab;

              return (
                <div
                  key={plan._id}
                  className="bg-card rounded-3xl shadow-xl overflow-hidden border-2 transition-all duration-300 hover:shadow-2xl"
                  style={{ borderColor: plan.isDefault ? 'rgba(17,131,224,0.4)' : 'rgba(0,209,255,0.1)' }}
                >
                  {/* ── Plan Header ── */}
                  <div className="px-8 py-6 relative overflow-hidden" style={getPlanHeaderStyle(plan)}>
                    <div className="absolute top-0 right-0 w-40 h-40 bg-card opacity-10 rounded-full -mr-20 -mt-20" />
                    <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <div className="p-2 bg-card/20 rounded-xl">
                            <CreditCard className="w-5 h-5 text-white" />
                          </div>
                          <h3 className="text-2xl font-bold text-white">{plan.planName}</h3>
                          {plan.isDefault && (
                            <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                              <Star className="w-3 h-3 fill-yellow-900" /> Default
                            </span>
                          )}
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize border ${plan.status === 'active' ? 'bg-card/20 border-white/30 text-white' : 'bg-black/20 border-black/30 text-white/80'}`}>
                            {plan.status}
                          </span>
                        </div>
                        {plan.description && (
                          <p className="text-white/75 text-sm mt-1 max-w-xl">{plan.description}</p>
                        )}
                      </div>
                      {/* Action buttons in header */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Tooltip title="View Details">
                          <Button size="small" icon={<Eye className="w-3.5 h-3.5" />} onClick={() => handleView(plan)} className="bg-card/20 border-white/30 text-white hover:bg-card/30">View</Button>
                        </Tooltip>
                        <Tooltip title="Edit Description">
                          <Button size="small" icon={<Edit className="w-3.5 h-3.5" />} onClick={() => handleEdit(plan)} className="bg-card/20 border-white/30 text-white hover:bg-card/30">Edit</Button>
                        </Tooltip>
                        <Tooltip title={plan.status === 'active' ? 'Deactivate (hide from portal)' : 'Activate (show on portal)'}>
                          <Button
                            size="small"
                            loading={statusTogglingId === plan._id}
                            icon={plan.status === 'active' ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                            onClick={() => handleToggleStatus(plan)}
                            className="bg-card/20 border-white/30 text-white hover:bg-card/30"
                          >
                            {plan.status === 'active' ? 'Active' : 'Inactive'}
                          </Button>
                        </Tooltip>
                        <Tooltip title="Duplicate Plan">
                          <Button size="small" icon={<Copy className="w-3.5 h-3.5" />} onClick={() => handleDuplicate(plan)} className="bg-card/20 border-white/30 text-white hover:bg-card/30" />
                        </Tooltip>
                        <Tooltip title="Delete Plan">
                          <Button size="small" danger icon={<Trash2 className="w-3.5 h-3.5" />} onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(plan); }} className="bg-red-500/80 border-red-400/50 text-white hover:bg-red-600" />
                        </Tooltip>
                      </div>
                    </div>
                  </div>

                  <div className="p-8">
                    {tiers.length > 0 && (
                      <>
                        {/* ── Billing Period Selector ── */}
                        <div className="flex justify-center mb-8">
                          <div className="inline-flex bg-card rounded-2xl p-1 gap-1">
                            {(['monthly', '6months', 'annual'] as const).map((tab) => (
                              <button
                                key={tab}
                                onClick={() => setPreviewTab(tab)}
                                className={`relative px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex flex-col items-center min-w-[110px] ${planTab === tab
                                    ? 'shadow-md'
                                    : 'text-secondary hover:text-primary'
                                  }`}
                                style={planTab === tab ? { backgroundColor: 'rgba(17,131,224,0.15)', color: 'var(--accent-navyblue)', border: '1px solid rgba(17,131,224,0.25)' } : undefined}
                              >
                                <span>{tab === 'monthly' ? 'Monthly' : tab === '6months' ? '6 Months' : 'Annual'}</span>
                                <span className={`text-[10px] font-bold mt-0.5 ${planTab === tab
                                    ? tab === '6months' ? 'text-amber-500' : tab === 'annual' ? 'text-green-600' : 'text-transparent'
                                    : 'text-secondary'
                                  }`}>
                                  {tab === '6months' ? `+${bonusDays} days free` : tab === 'annual' ? `+${freeMonths} mo free` : '‎'}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* ── Bonus Banner ── */}
                        {planTab === '6months' && bonusDays > 0 && (
                          <div className="mb-6 flex items-center gap-4 rounded-2xl px-6 py-4 border" style={{ backgroundColor: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.25)' }}>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(245,158,11,0.15)' }}>
                              <Zap className="w-5 h-5 text-[#F59E0B]" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-[#F59E0B]">6-Month Plan Bonus</p>
                              <p className="text-xs text-secondary mt-0.5">Admins pay for 6 months and receive <strong>{bonusDays} extra days</strong> of access free</p>
                            </div>
                            <div className="ml-auto flex-shrink-0">
                              <span className="text-xs font-bold px-3 py-1.5 rounded-full text-[#F59E0B]" style={{ backgroundColor: 'rgba(245,158,11,0.15)' }}>+{bonusDays} Days</span>
                            </div>
                          </div>
                        )}
                        {planTab === 'annual' && freeMonths > 0 && (
                          <div className="mb-6 flex items-center gap-4 rounded-2xl px-6 py-4 border" style={{ backgroundColor: 'rgba(0,255,163,0.06)', borderColor: 'rgba(0,255,163,0.2)' }}>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(0,255,163,0.12)' }}>
                              <Star className="w-5 h-5 text-[#00FFA3]" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-[#00FFA3]">Annual Plan — Best Value</p>
                              <p className="text-xs text-secondary mt-0.5">Admins get <strong>{freeMonths} month{freeMonths > 1 ? 's' : ''} free</strong> when paying annually</p>
                            </div>
                            <div className="ml-auto flex-shrink-0">
                              <span className="text-xs font-bold px-3 py-1.5 rounded-full text-[#00FFA3]" style={{ backgroundColor: 'rgba(0,255,163,0.12)' }}>+{freeMonths} Mo Free</span>
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
                            const isPopular = idx === 1 || (tiers.length === 1 && idx === 0);
                            return (
                              <div
                                key={idx}
                                className={`relative rounded-2xl border-2 p-6 transition-all duration-200 flex flex-col ${isPopular ? 'shadow-xl' : 'bg-card hover:shadow-lg'}`}
                              style={isPopular ? { borderColor: 'rgba(17,131,224,0.5)', backgroundColor: 'rgba(17,131,224,0.06)', boxShadow: '0 0 20px rgba(17,131,224,0.1)' } : { borderColor: 'rgba(0,209,255,0.1)' }}
                              >
                                {isPopular && (
                                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg whitespace-nowrap" style={{ backgroundColor: 'var(--accent-navyblue)' }}>
                                    Most Popular
                                  </div>
                                )}

                                <div className="flex items-center gap-3 mb-5">
                                  <div className="p-2.5 rounded-xl" style={{ backgroundColor: isPopular ? 'var(--accent-navyblue)' : 'rgba(245,158,11,0.12)' }}>
                                    <BarChart3 className={`w-5 h-5 ${isPopular ? 'text-white' : 'text-[#F59E0B]'}`} />
                                  </div>
                                  <div>
                                    <p className="text-[11px] text-secondary font-semibold uppercase tracking-wider">Fleet Size</p>
                                    <p className="text-xl font-bold text-primary">{tier.minTrucks}–{tier.maxTrucks} Trucks</p>
                                  </div>
                                </div>

                                <div className="mb-5 flex-1">
                                  {strikethroughPrice && (
                                    <p className="text-sm text-secondary line-through mb-0.5">{formatPrice(strikethroughPrice, currency)}</p>
                                  )}
                                  <div className="flex items-baseline gap-1.5">
                                    <span className={`text-4xl font-extrabold ${isPopular ? 'text-[var(--accent-navyblue)]' : 'text-primary'}`}>
                                      {formatPrice(displayPrice, currency)}
                                    </span>
                                    <span className="text-sm text-secondary font-medium">
                                      {planTab === 'monthly' ? '/mo' : planTab === '6months' ? '/6 mo' : '/yr'}
                                    </span>
                                  </div>
                                  {planTab !== 'monthly' && (
                                    <p className="text-xs text-secondary mt-1.5">
                                      {formatPrice(baseMonthly, currency)}/mo equivalent
                                    </p>
                                  )}
                                </div>

                                {/* Additional truck note */}
                                {extraPrice > 0 && (() => {
                                  const lastTierMax = tiers[tiers.length - 1]?.maxTrucks ?? tier.maxTrucks;
                                  const billingFactor = planTab === 'monthly' ? 1 : planTab === '6months' ? 6 : 12;
                                  const billingLabel = planTab === 'monthly' ? '/mo' : planTab === '6months' ? '/6 mo' : '/yr';
                                  return (
                                    <div className="mb-4 rounded-lg overflow-hidden border" style={{ borderColor: 'rgba(245,158,11,0.2)' }}>
                                      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b" style={{ backgroundColor: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.2)' }}>
                                        <TrendingUp className="w-3 h-3 text-[#F59E0B]" />
                                        <span className="text-[10px] font-bold text-[#F59E0B] uppercase tracking-wide">Additional Trucks</span>
                                      </div>
                                      <div className="flex items-center justify-between px-3 py-2">
                                        <span className="text-xs text-secondary">Beyond {lastTierMax} trucks</span>
                                        <span className="text-xs font-bold text-[#F59E0B]">+{formatPrice(extraPrice * billingFactor, tp?.extraTruckCurrency ?? 'CAD')}{billingLabel}/truck</span>
                                      </div>
                                    </div>
                                  );
                                })()}

                                <div className="h-px mb-5" style={{ backgroundColor: isPopular ? 'rgba(17,131,224,0.2)' : 'rgba(255,255,255,0.06)' }} />

                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm text-primary">
                                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                    Up to {tier.maxTrucks} trucks included
                                  </div>
                                  {planTab === '6months' && bonusDays > 0 && (
                                    <div className="flex items-center gap-2 text-sm text-primary">
                                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                      {bonusDays} bonus days free
                                    </div>
                                  )}
                                  {planTab === 'annual' && freeMonths > 0 && (
                                    <div className="flex items-center gap-2 text-sm text-primary">
                                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                      {freeMonths} month{freeMonths > 1 ? 's' : ''} free — {12 + freeMonths} months total
                                    </div>
                                  )}
                                </div>
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
                          const extraCur = tp?.extraTruckCurrency ?? 'CAD';
                          return (
                            <div className="mb-6 rounded-2xl border-2 border-dashed overflow-hidden" style={{ borderColor: 'rgba(245,158,11,0.3)', backgroundColor: 'var(--bg-card)' }}>
                              <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ backgroundColor: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.2)' }}>
                                <TrendingUp className="w-4 h-4 text-[#F59E0B]" />
                                <span className="text-sm font-bold text-[#F59E0B]">Additional Trucks Beyond {lastTierMax}</span>
                              </div>
                              <div className="flex items-center gap-5 flex-wrap px-5 py-4">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-primary">Admins with more than <strong>{lastTierMax} trucks</strong> are charged a flat per-truck rate.</p>
                                  <p className="text-xs text-secondary mt-1">Base rate: {formatPrice(extraPrice, extraCur)}/truck/month</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-2xl font-extrabold text-[#F59E0B]">{formatPrice(extraDisplayPrice, extraCur)}</p>
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
                              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(0,255,163,0.1)' }}>
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
        ) : (
          // List View
          <div className="bg-card rounded-xl shadow-sm border border-theme overflow-hidden">
            <div className="divide-y divide-theme">
              {filteredAndSortedPlans.map((plan) => (
                <div
                  key={plan._id}
                  className="p-6 hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-primary">{plan.planName}</h3>
                        {plan.isDefault && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: 'rgba(17,131,224,0.12)', color: 'var(--accent-navyblue)' }}>
                            <Star className="w-3 h-3" /> Default
                          </span>
                        )}
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: 'rgba(0,255,163,0.08)', color: '#00FFA3' }}>
                          {plan.planType === 'lifetime' ? 'Lifetime' : 'Monthly'}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor: plan.status === 'active' ? 'rgba(0,255,163,0.08)' : 'rgba(255,255,255,0.06)',
                            color: plan.status === 'active' ? '#00FFA3' : 'var(--text-secondary)',
                          }}>
                          {plan.status}
                        </span>
                      </div>
                      {plan.description && (
                        <p className="text-sm text-secondary mb-3">{plan.description}</p>
                      )}

                      <div className="flex items-center gap-6 text-sm">
                        {plan.planType === 'lifetime' && plan.lifetime && (
                          <div>
                            <span className="text-secondary">One-time: </span>
                            <span className="font-semibold text-primary">
                              {formatPrice(plan.lifetime.oneTime.price, plan.lifetime.oneTime.currency)}
                            </span>
                          </div>
                        )}
                        {plan.planType === 'monthly' && plan.monthly?.fullApp && (
                          <div>
                            <span className="text-secondary">Monthly Price: </span>
                            <span className="font-semibold text-primary">
                              {formatPrice(plan.monthly.fullApp.price, plan.monthly.fullApp.currency)}/mo
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => handleView(plan)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                        style={{ backgroundColor: 'rgba(17,131,224,0.07)', borderColor: 'rgba(17,131,224,0.2)', color: 'var(--accent-navyblue)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(17,131,224,0.14)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(17,131,224,0.07)'; }}>
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                      <button onClick={() => handleEdit(plan)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors text-primary"
                        style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; }}>
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleToggleStatus(plan)}
                        disabled={statusTogglingId === plan._id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors text-primary disabled:opacity-50"
                        style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; }}>
                        {plan.status === 'active' ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                        {plan.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => handleDuplicate(plan)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors text-primary"
                        style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; }}>
                        <Copy className="w-3.5 h-3.5" /> Duplicate
                      </button>
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(plan); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                        style={{ backgroundColor: 'rgba(244,63,94,0.08)', borderColor: 'rgba(244,63,94,0.2)', color: 'var(--accent-red)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(244,63,94,0.15)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(244,63,94,0.08)'; }}>
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Plan Modal */}
      <Modal open={showCreateModal} onCancel={() => { setShowCreateModal(false); resetForm(); }}
        footer={null} width={880} title={null} styles={mStyles}>
        <style>{antdDarkInputs}</style>
        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-center gap-3 border-b" style={divider}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(17,131,224,0.12)' }}>
            <Plus className="w-5 h-5" style={{ color: 'var(--accent-navyblue)' }} />
          </div>
          <div>
            <h3 className="font-semibold text-primary">Create New Plan</h3>
            <p className="text-xs text-secondary">Configure pricing tiers and features for your new plan</p>
          </div>
        </div>
        {/* Body */}
        <div className="billing-modal overflow-y-auto max-h-[68vh] px-6 py-5">
          {renderPlanFormBody()}
        </div>
        {/* Footer */}
        <div className="px-6 pb-5 pt-4 flex justify-end gap-3 border-t" style={divider}>
          <button onClick={() => { setShowCreateModal(false); resetForm(); }}
            className="px-4 py-2 rounded-lg text-sm font-medium text-secondary border border-theme hover:text-primary transition-colors">
            Cancel
          </button>
          <button onClick={handleCreate}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:-translate-y-0.5 transform flex items-center gap-2"
            style={{ backgroundColor: 'var(--accent-navyblue)' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#0d6fc7'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent-navyblue)'; }}>
            <Plus className="w-4 h-4" /> Create Plan
          </button>
        </div>
      </Modal>

      {/* Edit Plan Modal — description only */}
      <Modal open={showEditModal} onCancel={() => setShowEditModal(false)}
        footer={null} width={500} title={null} styles={mStyles}>
        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-center gap-3 border-b" style={divider}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(17,131,224,0.12)' }}>
            <Edit className="w-4 h-4" style={{ color: 'var(--accent-navyblue)' }} />
          </div>
          <div>
            <h3 className="font-semibold text-primary">Edit Plan</h3>
            <p className="text-xs text-secondary truncate max-w-xs">{selectedPlan?.planName}</p>
          </div>
        </div>
        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="rounded-lg px-3 py-2.5 text-sm border flex items-center gap-2"
            style={{ backgroundColor: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.2)', color: '#F59E0B' }}>
            <Sparkles className="w-4 h-4 flex-shrink-0" />
            Only the plan description can be edited after creation.
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-secondary">Description</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Describe what this plan includes..."
              rows={4}
              autoFocus
              className="block w-full rounded-lg border px-3 py-2.5 text-sm text-primary bg-transparent focus:outline-none resize-none"
              style={{ borderColor: 'rgba(17,131,224,0.2)' }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--accent-navyblue)'; e.target.style.boxShadow = '0 0 0 2px rgba(17,131,224,0.15)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(17,131,224,0.2)'; e.target.style.boxShadow = ''; }}
            />
          </div>
        </div>
        {/* Footer */}
        <div className="px-6 pb-5 pt-4 flex justify-end gap-3 border-t" style={divider}>
          <button onClick={() => setShowEditModal(false)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-secondary border border-theme hover:text-primary transition-colors">
            Cancel
          </button>
          <button onClick={handleUpdate}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:-translate-y-0.5 transform"
            style={{ backgroundColor: 'var(--accent-navyblue)' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#0d6fc7'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent-navyblue)'; }}>
            Save Description
          </button>
        </div>
      </Modal>

      {/* View Plan Modal */}
      {showViewModal && selectedPlan && (
        <Modal open={showViewModal} onCancel={() => setShowViewModal(false)}
          footer={null} width={720} title={null} styles={mStyles}>
          {/* Header */}
          <div className="px-6 pt-5 pb-4 flex items-center gap-3 border-b" style={divider}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(17,131,224,0.12)' }}>
              <CreditCard className="w-4 h-4" style={{ color: 'var(--accent-navyblue)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-primary truncate">{selectedPlan.planName}</h3>
                {selectedPlan.isDefault && <Tag color="blue" icon={<Star className="w-3 h-3" />}>Default</Tag>}
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: selectedPlan.status === 'active' ? 'rgba(0,255,163,0.1)' : 'rgba(244,63,94,0.1)',
                    color: selectedPlan.status === 'active' ? '#00FFA3' : 'var(--accent-red)',
                  }}>
                  {selectedPlan.status}
                </span>
              </div>
              <p className="text-xs text-secondary mt-0.5">{selectedPlan.description || 'No description'}</p>
            </div>
          </div>
          {/* Body */}
          <div className="overflow-y-auto max-h-[65vh]"
        >
          <div className="space-y-6 py-4">
            {/* Header Info */}
            <div className="rounded-lg p-4 border border-theme" style={{ backgroundColor: 'rgba(17,131,224,0.04)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-secondary mb-1">Plan Type</p>
                  <Tag color={selectedPlan.planType === 'lifetime' ? 'blue' : 'green'} className="text-sm">
                    {selectedPlan.planType === 'lifetime' ? 'Lifetime Plan' : 'Monthly Plan'}
                  </Tag>
                </div>
                <div>
                  <p className="text-sm text-secondary mb-1">Status</p>
                  <Tag color={selectedPlan.status === 'active' ? 'success' : 'default'} className="text-sm">
                    {selectedPlan.status === 'active' ? 'Active' : 'Inactive'}
                  </Tag>
                </div>
                {selectedPlan.createdAt && (
                  <div>
                    <p className="text-sm text-secondary mb-1">Created</p>
                    <p className="text-sm font-medium text-primary">
                      {new Date(selectedPlan.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {selectedPlan.description && (
              <div>
                <label className="block text-sm font-semibold text-primary mb-2">Description</label>
                <div className="bg-card rounded-lg p-4 border border-theme">
                  <p className="text-primary leading-relaxed">{selectedPlan.description}</p>
                </div>
              </div>
            )}

            {/* Pricing Section */}
            {selectedPlan.planType === 'lifetime' && selectedPlan.lifetime && (
              <div className="border-t pt-6">
                <h4 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-blue-500" />
                  Lifetime Pricing Options
                </h4>
                <div className="space-y-3">
                  <div className="p-5 rounded-xl border-2" style={{ background: 'linear-gradient(135deg, rgba(17,131,224,0.08), rgba(17,131,224,0.04))', borderColor: 'rgba(17,131,224,0.25)' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-secondary mb-1">One-time Payment</p>
                        <p className="text-3xl font-bold text-primary">
                          {formatPrice(selectedPlan.lifetime.oneTime.price, selectedPlan.lifetime.oneTime.currency)}
                        </p>
                        <p className="text-xs text-secondary mt-1">Best value - Pay once, own forever</p>
                      </div>
                      <CheckCircle className="w-8 h-8 text-blue-500" />
                    </div>
                  </div>
                  {selectedPlan.lifetime.installments.threeMonths.enabled && (
                    <div className="bg-card p-4 rounded-lg border border-theme">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-primary">3 Monthly Installments</p>
                          <p className="text-xl font-bold text-primary mt-1">
                            {formatPrice(selectedPlan.lifetime.installments.threeMonths.price, selectedPlan.lifetime.installments.threeMonths.currency)}
                            <span className="text-sm font-normal text-secondary">/month</span>
                          </p>
                          <p className="text-xs text-secondary mt-1">Total: {formatPrice(selectedPlan.lifetime.installments.threeMonths.price * 3, selectedPlan.lifetime.installments.threeMonths.currency)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {selectedPlan.lifetime.installments.sixMonths.enabled && (
                    <div className="bg-card p-4 rounded-lg border border-theme">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-primary">6 Monthly Installments</p>
                          <p className="text-xl font-bold text-primary mt-1">
                            {formatPrice(selectedPlan.lifetime.installments.sixMonths.price, selectedPlan.lifetime.installments.sixMonths.currency)}
                            <span className="text-sm font-normal text-secondary">/month</span>
                          </p>
                          <p className="text-xs text-secondary mt-1">Total: {formatPrice(selectedPlan.lifetime.installments.sixMonths.price * 6, selectedPlan.lifetime.installments.sixMonths.currency)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedPlan.planType === 'monthly' && selectedPlan.monthly && (selectedPlan.monthly.truckPricing?.tiers?.length ?? 0) > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-base font-bold text-primary mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-green-500" />
                  Pricing Plans
                </h4>
                {renderPricingPreview(
                  selectedPlan.monthly.truckPricing!.tiers,
                  selectedPlan.monthly.truckPricing as TruckPricing,
                  previewTab,
                  setPreviewTab
                )}
              </div>
            )}

            {/* Features */}
            {(selectedPlan.features?.length ?? 0) > 0 && (
              <div className="border-t pt-6">
                <h4 className="text-lg font-bold text-primary mb-3">Features</h4>
                <div className="grid grid-cols-2 gap-2">
                  {selectedPlan.features!.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {f.included
                        ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        : <XCircle className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                      <span className={f.included ? 'text-primary' : 'text-secondary line-through'}>{f.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Roles */}
            {((selectedPlan.allowedRoles?.length ?? 0) > 0 || (selectedPlan.blockedRoles?.length ?? 0) > 0) && (
              <div className="border-t pt-6">
                <h4 className="text-lg font-bold text-primary mb-3">Role Access</h4>
                {(selectedPlan.allowedRoles?.length ?? 0) > 0 && (
                  <div className="mb-3">
                    <p className="text-sm font-medium text-primary mb-2">Allowed Roles</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedPlan.allowedRoles!.map(r => <Tag key={r} color="blue">{r}</Tag>)}
                    </div>
                  </div>
                )}
                {(selectedPlan.blockedRoles?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-sm font-medium text-primary mb-2">Blocked Roles</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedPlan.blockedRoles!.map(r => <Tag key={r} color="red">{r}</Tag>)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          </div>{/* end overflow-y-auto body */}
          {/* Footer */}
          <div className="px-6 pb-5 pt-4 flex justify-end gap-3 border-t" style={divider}>
            <button onClick={() => setShowViewModal(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-secondary border border-theme hover:text-primary transition-colors">
              Close
            </button>
            <button onClick={() => { setShowViewModal(false); handleEdit(selectedPlan); }}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:-translate-y-0.5 transform flex items-center gap-2"
              style={{ backgroundColor: 'var(--accent-navyblue)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#0d6fc7'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent-navyblue)'; }}>
              <Edit className="w-3.5 h-3.5" /> Edit Plan
            </button>
          </div>
        </Modal>
      )}

      {/* Compare Plans Modal */}
      <Modal open={showCompareModal} onCancel={() => { setShowCompareModal(false); setSelectedPlans([]); }}
        footer={null} width={1000} title={null} styles={mStyles}>
        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-center gap-3 border-b" style={divider}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(17,131,224,0.12)' }}>
            <BarChart3 className="w-4 h-4" style={{ color: 'var(--accent-navyblue)' }} />
          </div>
          <div>
            <h3 className="font-semibold text-primary">Compare Plans</h3>
            <p className="text-xs text-secondary">Select at least 2 plans for side-by-side comparison</p>
          </div>
          <button onClick={() => { setShowCompareModal(false); setSelectedPlans([]); }} className="ml-auto text-secondary hover:text-primary transition-colors p-1">✕</button>
        </div>
        <div className="px-6 py-5">
          <div className="mb-4">
            <p className="text-sm text-secondary mb-3">Select plans to compare (select at least 2 plans):</p>
            <div className="flex flex-wrap gap-2">
              {plans.map((plan) => (
                <Button
                  key={plan._id}
                  type={selectedPlans.includes(plan._id) ? 'primary' : 'default'}
                  onClick={() => {
                    if (selectedPlans.includes(plan._id)) {
                      setSelectedPlans(selectedPlans.filter(id => id !== plan._id));
                    } else {
                      setSelectedPlans([...selectedPlans, plan._id]);
                    }
                  }}
                  style={selectedPlans.includes(plan._id) ? { backgroundColor: 'var(--accent-navyblue)' } : undefined}
                >
                  {plan.planName}
                </Button>
              ))}
            </div>
          </div>

          {selectedPlans.length >= 2 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-theme">
                    <th className="text-left p-3 font-semibold text-primary">Feature</th>
                    {selectedPlans.map(planId => {
                      const plan = plans.find(p => p._id === planId);
                      return plan ? (
                        <th key={planId} className="text-center p-3 font-semibold text-primary">
                          <div className="flex flex-col items-center gap-1">
                            <span>{plan.planName}</span>
                            <Tag color={plan.planType === 'lifetime' ? 'blue' : 'green'}>
                              {plan.planType === 'lifetime' ? 'Lifetime' : 'Monthly'}
                            </Tag>
                          </div>
                        </th>
                      ) : null;
                    })}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-theme">
                    <td className="p-3 font-medium text-primary">Plan Type</td>
                    {selectedPlans.map(planId => {
                      const plan = plans.find(p => p._id === planId);
                      return plan ? (
                        <td key={planId} className="text-center p-3">
                          <Tag color={plan.planType === 'lifetime' ? 'blue' : 'green'}>
                            {plan.planType === 'lifetime' ? 'Lifetime' : 'Monthly'}
                          </Tag>
                        </td>
                      ) : null;
                    })}
                  </tr>
                  <tr className="border-b border-theme">
                    <td className="p-3 font-medium text-primary">Status</td>
                    {selectedPlans.map(planId => {
                      const plan = plans.find(p => p._id === planId);
                      return plan ? (
                        <td key={planId} className="text-center p-3">
                          <Tag color={plan.status === 'active' ? 'success' : 'default'}>
                            {plan.status}
                          </Tag>
                        </td>
                      ) : null;
                    })}
                  </tr>
                  <tr className="border-b border-theme">
                    <td className="p-3 font-medium text-primary">Default Plan</td>
                    {selectedPlans.map(planId => {
                      const plan = plans.find(p => p._id === planId);
                      return plan ? (
                        <td key={planId} className="text-center p-3">
                          {plan.isDefault ? <CheckCircle className="w-5 h-5 text-green-500 mx-auto" /> : <XCircle className="w-5 h-5 text-gray-300 mx-auto" />}
                        </td>
                      ) : null;
                    })}
                  </tr>
                  <tr className="border-b border-theme">
                    <td className="p-3 font-medium text-primary">One-time Price</td>
                    {selectedPlans.map(planId => {
                      const plan = plans.find(p => p._id === planId);
                      return plan ? (
                        <td key={planId} className="text-center p-3 font-semibold text-primary">
                          {plan.planType === 'lifetime' && plan.lifetime
                            ? formatPrice(plan.lifetime.oneTime.price, plan.lifetime.oneTime.currency)
                            : 'N/A'}
                        </td>
                      ) : null;
                    })}
                  </tr>
                  <tr className="border-b border-theme">
                    <td className="p-3 font-medium text-primary">Monthly Price</td>
                    {selectedPlans.map(planId => {
                      const plan = plans.find(p => p._id === planId);
                      return plan ? (
                        <td key={planId} className="text-center p-3 font-semibold text-primary">
                          {plan.planType === 'monthly' && plan.monthly?.fullApp.enabled
                            ? formatPrice(plan.monthly.fullApp.price, plan.monthly.fullApp.currency) + '/mo'
                            : plan.planType === 'lifetime'
                              ? 'N/A'
                              : 'N/A'}
                        </td>
                      ) : null;
                    })}
                  </tr>
                  <tr className="border-b border-theme">
                    <td className="p-3 font-medium text-primary">Description</td>
                    {selectedPlans.map(planId => {
                      const plan = plans.find(p => p._id === planId);
                      return plan ? (
                        <td key={planId} className="text-center p-3 text-sm text-secondary">
                          {plan.description || 'No description'}
                        </td>
                      ) : null;
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {selectedPlans.length < 2 && (
            <div className="text-center py-8 text-secondary">
              Please select at least 2 plans to compare
            </div>
          )}
        </div>
        {/* Footer */}
        <div className="px-6 pb-5 pt-4 flex justify-end border-t" style={divider}>
          <button onClick={() => { setShowCompareModal(false); setSelectedPlans([]); }}
            className="px-4 py-2 rounded-lg text-sm font-medium text-secondary border border-theme hover:text-primary transition-colors">
            Close
          </button>
        </div>
      </Modal>

      {/* Delete Plan Confirmation Modal */}
      <Modal open={showDeleteModal}
        onCancel={() => { setShowDeleteModal(false); setDeletePlanId(null); setDeletePlanName(''); }}
        footer={null} width={460} title={null}
        styles={{ content: { background: 'var(--bg-card)', padding: 0, borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(244,63,94,0.25)' }, body: { background: 'var(--bg-card)', padding: 0 } }}>
        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-center gap-3 border-b" style={{ borderColor: 'rgba(244,63,94,0.2)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(244,63,94,0.1)' }}>
            <Trash2 className="w-4 h-4" style={{ color: 'var(--accent-red)' }} />
          </div>
          <div>
            <h3 className="font-semibold text-primary">Delete Plan</h3>
            <p className="text-xs text-secondary">This action is permanent and cannot be undone</p>
          </div>
        </div>
        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="rounded-xl p-4 border space-y-1" style={{ backgroundColor: 'rgba(17,131,224,0.04)', borderColor: 'rgba(17,131,224,0.12)' }}>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-secondary flex-shrink-0" />
              <span className="text-sm font-medium text-primary">"{deletePlanName}"</span>
            </div>
          </div>
          <div className="rounded-lg p-3 border flex items-start gap-2.5"
            style={{ backgroundColor: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.2)' }}>
            <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#F59E0B]" />
            <p className="text-xs text-[#F59E0B]">
              If this plan has active subscriptions, those customers will need to be migrated before deletion.
            </p>
          </div>
          <div className="rounded-lg p-3 border flex items-start gap-2.5"
            style={{ backgroundColor: 'rgba(244,63,94,0.08)', borderColor: 'rgba(244,63,94,0.25)' }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent-red)' }} />
            <p className="text-sm" style={{ color: 'var(--accent-red)' }}>
              Deleting this plan will permanently remove all associated pricing data.
            </p>
          </div>
        </div>
        {/* Footer */}
        <div className="px-6 pb-5 pt-4 flex justify-end gap-3 border-t" style={{ borderColor: 'rgba(244,63,94,0.15)' }}>
          <button onClick={() => { setShowDeleteModal(false); setDeletePlanId(null); setDeletePlanName(''); }}
            disabled={deleting}
            className="px-4 py-2 rounded-lg text-sm font-medium text-secondary border border-theme hover:text-primary transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={confirmDelete} disabled={deleting}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 transform"
            style={{ backgroundColor: 'var(--accent-red)' }}>
            {deleting ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deleting...</>
            ) : (
              <><Trash2 className="w-3.5 h-3.5" /> Delete Plan</>
            )}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Billing;
