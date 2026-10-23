import  { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Eye,
  EyeOff,
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  FileText,
  Lock,
  Clock
} from 'lucide-react';
import { message } from 'antd';
import { getSuperAdminSettings, updateSuperAdminSettings } from '../../../axios/api/superadmin';

const SystemSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [settings, setSettings] = useState({
    name: '',
    email: '',
    phone: '',
    country: '',
    state: '',
    city: '',
    address: '',
    policies: '',
    password: '',
    newPassword: '',
    defaultTrialDays: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await getSuperAdminSettings();
      
      if (response?.success && response?.data) {
        setSettings({
          name: response.data.name || '',
          email: response.data.email || '',
          phone: response.data.phone || '',
          country: response.data.country || '',
          state: response.data.state || '',
          city: response.data.city || '',
          address: response.data.address || '',
          policies: response.data.policies || '',
          password: '',
          newPassword: '',
          defaultTrialDays: response.data.defaultTrialDays != null ? String(response.data.defaultTrialDays) : ''
        });
      } else {
        message.error(response?.message || 'Failed to load settings');
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      message.error(error?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // Validate required fields
      if (!settings.name || !settings.email) {
        message.error('Name and email are required');
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(settings.email)) {
        message.error('Please enter a valid email address');
        return;
      }

      // If new password is provided, current password is required
      if (settings.newPassword && !settings.password) {
        message.error('Current password is required to change password');
        return;
      }

      // Validate new password length
      if (settings.newPassword && settings.newPassword.length < 6) {
        message.error('New password must be at least 6 characters');
        return;
      }

      // Validate default trial days
      if (settings.defaultTrialDays !== '' && (isNaN(Number(settings.defaultTrialDays)) || Number(settings.defaultTrialDays) < 1)) {
        message.error('Default trial length must be a positive number of days');
        return;
      }

      setSaving(true);
      
      const updateData: any = {
        name: settings.name,
        email: settings.email,
        phone: settings.phone || undefined,
        country: settings.country || undefined,
        state: settings.state || undefined,
        city: settings.city || undefined,
        address: settings.address || undefined,
        policies: settings.policies || undefined,
        defaultTrialDays: settings.defaultTrialDays === '' ? null : Number(settings.defaultTrialDays),
      };

      // Only include password fields if new password is provided
      if (settings.newPassword) {
        updateData.password = settings.password;
        updateData.newPassword = settings.newPassword;
      }

      const response = await updateSuperAdminSettings(updateData);
      
      if (response?.success) {
        message.success(response.message || 'Settings updated successfully');
        // Clear password fields after successful save
        setSettings(prev => ({
          ...prev,
          password: '',
          newPassword: ''
        }));
        // Refetch to get latest data
        await fetchSettings();
      } else {
        message.error(response?.message || 'Failed to update settings');
      }
    } catch (error: any) {
      console.error('Error updating settings:', error);
      message.error(error?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-secondary">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-card p-6">
      {/* Header */}
      <div className="bg-card rounded-xl shadow-sm border border-theme px-6 py-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary flex items-center">
              <Settings className="w-6 h-6 mr-3 text-purple-600" />
              System Settings
            </h1>
            <p className="text-secondary mt-1">Manage your super admin profile and preferences</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information */}
        <div className="bg-card rounded-xl shadow-sm border border-theme p-6">
          <div className="flex items-center mb-6">
            <div className="bg-purple-100 p-2 rounded-lg mr-3">
              <User className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-semibold text-primary">Profile Information</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={settings.name}
                onChange={(e) => updateSetting('name', e.target.value)}
                className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Enter your full name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary" />
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => updateSetting('email', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary" />
                <input
                  type="tel"
                  value={settings.phone}
                  onChange={(e) => updateSetting('phone', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter your phone number"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Location Information */}
        <div className="bg-card rounded-xl shadow-sm border border-theme p-6">
          <div className="flex items-center mb-6">
            <div className="bg-blue-100 p-2 rounded-lg mr-3">
              <MapPin className="w-5 h-5 text-[#00D1FF]" />
            </div>
            <h2 className="text-lg font-semibold text-primary">Location Information</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Country
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary" />
                <input
                  type="text"
                  value={settings.country}
                  onChange={(e) => updateSetting('country', e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter country"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  State/Province
                </label>
                <input
                  type="text"
                  value={settings.state}
                  onChange={(e) => updateSetting('state', e.target.value)}
                  className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter state"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={settings.city}
                  onChange={(e) => updateSetting('city', e.target.value)}
                  className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter city"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Address
              </label>
              <textarea
                value={settings.address}
                onChange={(e) => updateSetting('address', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Enter full address"
              />
            </div>
          </div>
        </div>

        {/* Policies */}
        <div className="bg-card rounded-xl shadow-sm border border-theme p-6">
          <div className="flex items-center mb-6">
            <div className="bg-green-100 p-2 rounded-lg mr-3">
              <FileText className="w-5 h-5 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-primary">Policies</h2>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Policies
            </label>
            <textarea
              value={settings.policies}
              onChange={(e) => updateSetting('policies', e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Enter policies or terms"
            />
          </div>
        </div>

        {/* Trial Settings */}
        <div className="bg-card rounded-xl shadow-sm border border-theme p-6">
          <div className="flex items-center mb-6">
            <div className="bg-blue-100 p-2 rounded-lg mr-3">
              <Clock className="w-5 h-5 text-[#00D1FF]" />
            </div>
            <h2 className="text-lg font-semibold text-primary">Trial Settings</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Default Trial Length (days)
            </label>
            <input
              type="number"
              min={1}
              value={settings.defaultTrialDays}
              onChange={(e) => updateSetting('defaultTrialDays', e.target.value)}
              className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="e.g. 30"
            />
            <p className="text-xs text-secondary mt-1">
              Applied to new customer signups by default. You can still set a different trial length for
              an individual customer when creating their account.
            </p>
          </div>
        </div>

        {/* Password Change */}
        <div className="bg-card rounded-xl shadow-sm border border-theme p-6">
          <div className="flex items-center mb-6">
            <div className="bg-orange-100 p-2 rounded-lg mr-3">
              <Lock className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <h2 className="text-lg font-semibold text-primary">Change Password</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={settings.password}
                  onChange={(e) => updateSetting('password', e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-theme rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-4 h-4 text-secondary" />
                  ) : (
                    <Eye className="w-4 h-4 text-secondary" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={settings.newPassword}
                  onChange={(e) => updateSetting('newPassword', e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-theme rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Enter new password (min 6 characters)"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-secondary" />
                  ) : (
                    <Eye className="w-4 h-4 text-secondary" />
                  )}
                </button>
              </div>
              <p className="text-xs text-secondary mt-1">
                Leave blank to keep current password
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
