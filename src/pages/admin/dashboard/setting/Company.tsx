import React, { useState, useEffect, useCallback } from 'react';
import { Building, Mail, Phone, MapPin, Upload, Save, Edit, X, AlertCircle, Settings, Key, Check, Wrench, Info, Plus, Trash2 } from 'lucide-react';
import { getCompany, updateCompany, updateApiCredentials, updateMaintenancePolicy } from '../../../../axios/api/admin';
import AddressSearch from '../../../../components/common/AddressSearch';
import { useDispatch } from 'react-redux';
import { setUserCredentials } from '../../../../redux/slices/userSlice';

interface CompanyInfo {
  companyName: string;
  companyCode: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  logoUrl?: string;
}

interface SamsaraConfig {
  apiBaseUrl: string;
  apiToken: string;
}

interface ThermoKingConfig {
  apiBaseUrl: string;
  apiKey: string;
  apiSecret: string;
  apiVersion: string;
}

interface CustomService {
  name: string;
  truck: { value: number; unit: 'days' | 'miles' | 'km' };
  trailer: { value: number; unit: 'days' | 'miles' | 'km' };
  excludeTypes?: string[]; // Optional: Trailer types that don't need this service
}

interface MaintenancePolicy {
  customServices: CustomService[]; // Dynamic array of custom services (including Oil Change)
}

const Company = () => {
  const dispatch = useDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [apiError, setApiError] = useState('');
  const [apiSuccess, setApiSuccess] = useState('');

  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    companyName: '',
    companyCode: '',
    address: '',
    contactEmail: '',
    contactPhone: '',
    logoUrl: ''
  });

  const [samsaraConfig, setSamsaraConfig] = useState<SamsaraConfig>({
    apiBaseUrl: '',
    apiToken: ''
  });

  const [thermokingConfig, setThermokingConfig] = useState<ThermoKingConfig>({
    apiBaseUrl: '',
    apiKey: '',
    apiSecret: '',
    apiVersion: 'v1'
  });

  const [maintenancePolicy, setMaintenancePolicy] = useState<MaintenancePolicy>({
    customServices: [] // Start with empty array - users can add services (including Oil Change)
  });

  const [isEditingPolicy, setIsEditingPolicy] = useState(false);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policyError, setPolicyError] = useState('');
  const [policySuccess, setPolicySuccess] = useState('');

  const [editForm, setEditForm] = useState<CompanyInfo>(companyInfo);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'company' | 'maintenance'>('company');

  const updateStoredUserCompany = useCallback(
    (company: { _id: string; companyName?: string } | null) => {
      try {
        const stored = localStorage.getItem('userInfo');
        if (!stored) {
          return;
        }

        const parsed = JSON.parse(stored);
        if (!parsed?.userData) {
          return;
        }

        const updated = {
          ...parsed,
          userData: {
            ...parsed.userData,
            company: company || undefined
          },
          role: parsed.userData?.role || parsed.role,
          company: company || undefined,
        };

        localStorage.setItem('userInfo', JSON.stringify(updated));
        dispatch(setUserCredentials(updated));
      } catch (err) {
        console.error('Error updating stored userInfo with company details:', err);
      }
    },
    [dispatch]);

  // Fetch company data on component mount
  useEffect(() => {
    fetchCompanyData();
  }, []);

  const fetchCompanyData = async () => {
    setFetchLoading(true);
    setError('');

    try {
      const response = await getCompany();

      if (response?.success && response?.data) {
        const data = response.data;

        const companyData: CompanyInfo = {
          companyName: data.companyName || '',
          companyCode: data.companyCode || '',
          address: data.address || '',
          contactEmail: data.contactEmail || '',
          contactPhone: data.contactPhone || '',
          logoUrl: data.logoUrl || ''
        };

        setCompanyInfo(companyData);
        setEditForm(companyData);
        if (data._id) {
          updateStoredUserCompany({ _id: data._id, companyName: data.companyName || '' });
        }

        // Handle API configurations
        if (data.samsaraConfig) {
          setSamsaraConfig({
            apiBaseUrl: data.samsaraConfig.apiBaseUrl || '',
            apiToken: data.samsaraConfig.apiToken || ''
          });
        }

        if (data.thermokingConfig) {
          setThermokingConfig({
            apiBaseUrl: data.thermokingConfig.apiBaseUrl || '',
            apiKey: data.thermokingConfig.apiKey || '',
            apiSecret: data.thermokingConfig.apiSecret || '',
            apiVersion: data.thermokingConfig.apiVersion || 'v1'
          });
        }

        // Handle Maintenance Policy (use defaults if not set)
        setMaintenancePolicy({
          customServices: data.maintenancePolicies?.customServices || [] // Load custom services or empty array
        });

        // Set preview URL for logo
        if (data.logoUrl) {
          setPreviewUrl(data.logoUrl);
        }
      } else {
        updateStoredUserCompany(null);
        console.log('No company data found or response failed');
      }
    } catch (error) {
      console.error('Error fetching company data:', error);
      setError('Failed to load company data. Please try again.');
      updateStoredUserCompany(null);
    } finally {
      setFetchLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSamsaraChange = (field: keyof SamsaraConfig, value: string) => {
    setSamsaraConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleThermokingChange = (field: keyof ThermoKingConfig, value: string) => {
    setThermokingConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Create FormData for file upload
      const formData = new FormData();

      // Add company info fields only (no API configs)
      (Object.keys(editForm) as Array<keyof CompanyInfo>).forEach((key) => {
        const value = editForm[key];
        if (value && key !== 'logoUrl') {
          formData.append(key, value);
        }
      });

      // Add logo file if selected
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const response = await updateCompany(formData);

      if (response?.success) {
        setSuccess('Company settings updated successfully!');
        setCompanyInfo(editForm);
        setIsEditing(false);
        setSelectedFile(null);
        if (response.data?._id) {
          updateStoredUserCompany({ _id: response.data._id, companyName: response.data.companyName || '' });
        } else {
          updateStoredUserCompany(null);
        }

        // Update logo URL if returned in response
        if (response.data?.logoUrl) {
          setCompanyInfo(prev => ({
            ...prev,
            logoUrl: response.data.logoUrl
          }));
          setPreviewUrl(response.data.logoUrl);
        }

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response?.message || 'Failed to update company settings. Please try again.');
      }
    } catch (error) {
      console.error('Error saving company info:', error);
      setError('Failed to update company settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditForm(companyInfo);
    setSelectedFile(null);
    setPreviewUrl(companyInfo.logoUrl || '');
    setIsEditing(false);
    setError('');
  };

  const handleSaveApiCredentials = async () => {
    setApiLoading(true);
    setApiError('');
    setApiSuccess('');

    try {
      const response = await updateApiCredentials({
        samsaraConfig,
        thermokingConfig
      });

      if (response?.success) {
        setApiSuccess('API credentials updated successfully!');
        // Clear success message after 3 seconds
        setTimeout(() => setApiSuccess(''), 3000);
      } else {
        setApiError(response?.message || 'Failed to update API credentials. Please try again.');
      }
    } catch (error) {
      console.error('Error saving API credentials:', error);
      setApiError('Failed to update API credentials. Please try again.');
    } finally {
      setApiLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file.');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size should be less than 5MB.');
        return;
      }

      setSelectedFile(file);
      setError('');

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setPreviewUrl(result);
      };
      reader.readAsDataURL(file);
    }
  };


  const handleCustomServiceChange = (
    index: number,
    field: 'name' | 'truck' | 'trailer' | 'excludeTypes',
    subField?: 'value' | 'unit',
    value?: string | number | string[]
  ) => {
    setMaintenancePolicy(prev => {
      const newServices = [...prev.customServices];
      if (field === 'name') {
        newServices[index] = { ...newServices[index], name: value as string };
      } else if (field === 'truck' && subField) {
        newServices[index] = {
          ...newServices[index],
          truck: { ...newServices[index].truck, [subField]: value }
        };
      } else if (field === 'trailer' && subField) {
        newServices[index] = {
          ...newServices[index],
          trailer: { ...newServices[index].trailer, [subField]: value }
        };
      } else if (field === 'excludeTypes') {
        newServices[index] = {
          ...newServices[index],
          excludeTypes: value as string[]
        };
      }
      return { ...prev, customServices: newServices };
    });
  };

  const addCustomService = () => {
    setMaintenancePolicy(prev => ({
      ...prev,
      customServices: [
        ...prev.customServices,
        {
          name: '',
          truck: { value: 0, unit: 'days' },
          trailer: { value: 0, unit: 'days' },
          excludeTypes: []
        }
      ]
    }));
  };

  const removeCustomService = (index: number) => {
    setMaintenancePolicy(prev => ({
      ...prev,
      customServices: prev.customServices.filter((_, i) => i !== index)
    }));
  };


  const handleSavePolicy = async () => {
    setPolicyLoading(true);
    setPolicyError('');
    setPolicySuccess('');

    try {
      // Filter out incomplete services before sending
      const validServices = maintenancePolicy.customServices.filter(service => {
        return (
          service.name &&
          service.name.trim() !== '' &&
          typeof service.truck?.value === 'number' &&
          service.truck.value > 0 &&
          service.truck.unit &&
          typeof service.trailer?.value === 'number' &&
          service.trailer.value > 0 &&
          service.trailer.unit
        );
      });

      // Check if there are any incomplete services
      const incompleteServices = maintenancePolicy.customServices.filter(service => {
        return !(
          service.name &&
          service.name.trim() !== '' &&
          typeof service.truck?.value === 'number' &&
          service.truck.value > 0 &&
          service.truck.unit &&
          typeof service.trailer?.value === 'number' &&
          service.trailer.value > 0 &&
          service.trailer.unit
        );
      });

      if (incompleteServices.length > 0) {
        setPolicyError(`Please complete all service fields. ${incompleteServices.length} service(s) have missing or invalid data (name, value > 0, and unit are required).`);
        setPolicyLoading(false);
        return;
      }

      if (validServices.length === 0) {
        setPolicyError('Please add at least one service before saving.');
        setPolicyLoading(false);
        return;
      }

      const response = await updateMaintenancePolicy({
        maintenancePolicies: {
          customServices: validServices
        }
      });

      if (response?.success) {
        setPolicySuccess('Maintenance policy settings saved successfully!');
        // Update local state with validated services
        setMaintenancePolicy(prev => ({
          ...prev,
          customServices: validServices
        }));
        setIsEditingPolicy(false);
        setTimeout(() => setPolicySuccess(''), 3000);
      } else {
        setPolicyError(response?.message || 'Failed to save maintenance policy. Please try again.');
      }
    } catch (error) {
      console.error('Error saving maintenance policy:', error);
      setPolicyError('Failed to save maintenance policy. Please try again.');
    } finally {
      setPolicyLoading(false);
    }
  };

  const handleCancelPolicy = () => {
    // Reset to original values from fetch
    fetchCompanyData();
    setIsEditingPolicy(false);
    setPolicyError('');
  };

  if (fetchLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-secondary">Loading company settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-main px-6">
      <div className="py-8">
        {/* Success/Error Messages */}
        {success && (
          <div className="fixed top-6 right-6 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in z-50 max-w-md">
            <Check className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{success}</span>
          </div>
        )}

        {error && (
          <div className="fixed top-6 right-6 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in z-50 max-w-md">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {apiSuccess && (
          <div className="fixed top-6 right-6 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in z-50 max-w-md">
            <Check className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{apiSuccess}</span>
          </div>
        )}

        {apiError && (
          <div className="fixed top-6 right-6 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in z-50 max-w-md">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{apiError}</span>
          </div>
        )}

        {policySuccess && (
          <div className="fixed top-6 right-6 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in z-50 max-w-md">
            <Check className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{policySuccess}</span>
          </div>
        )}

        {policyError && (
          <div className="fixed top-6 right-6 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in z-50 max-w-md">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{policyError}</span>
          </div>
        )}

        {/* Header */}
        <div className="bg-card rounded-xl shadow-sm border border-theme p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-primary mb-2">Company Settings</h1>
              <p className="text-secondary">Manage your company information and preferences</p>
            </div>
            <div className="flex gap-3">
              {activeTab === 'company' && (
                isEditing ? (
                  <>
                    <button
                      onClick={handleCancel}
                      disabled={loading}
                      className="px-4 py-2 text-primary bg-card hover:bg-gray-200 rounded-lg transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
                    >
                      <X size={16} />
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={loading}
                      className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 !text-white rounded-lg transition-all font-medium flex items-center gap-2 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          Save Changes
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                   
                    className="px-4 py-2 bg-[var(--accent-navyblue)]   !text-white rounded-lg transition-all font-medium flex items-center gap-2"
                  >
                    <Edit size={16} />
                    Edit Settings
                  </button>
                )
              )}
            </div>
          </div>
          {/* Tabs */}
          <div className="flex border-b border-theme mt-6 -mb-px">
            <button
              type="button"
              onClick={() => setActiveTab('company')}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'company'
                ? 'border-blue-600 text-[#00D1FF]'
                : 'border-transparent text-secondary hover:text-primary hover:border-theme'
                }`}
            >
              Company & API
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('maintenance')}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'maintenance'
                ? 'border-blue-600 text-[#00D1FF]'
                : 'border-transparent text-secondary hover:text-primary hover:border-theme'
                }`}
            >
              Maintenance Policy Settings
            </button>
          </div>
        </div>

        {activeTab === 'company' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Company Information */}
            <div className="bg-card rounded-xl shadow-sm border border-theme">
              <div className="p-6 border-b border-theme">
                <div className="flex items-center gap-3">
                  <Building className="text-[#00D1FF]" size={24} />
                  <h2 className="text-xl font-bold text-primary">Company Information</h2>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Company Logo */}
                <div className="flex flex-col items-center">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-theme bg-card">
                      <img
                        src={previewUrl || companyInfo.logoUrl || 'https://via.placeholder.com/200x200/3B82F6/FFFFFF?text=LOGO'}
                        alt="Company Logo"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://via.placeholder.com/200x200/3B82F6/FFFFFF?text=LOGO';
                        }}
                      />
                    </div>
                    {isEditing && (
                      <label className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <Upload size={20} className="text-white" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                  <p className="text-sm text-secondary mt-2">Company Logo</p>
                  {selectedFile && (
                    <p className="text-xs text-green-600 mt-1">New logo selected: {selectedFile.name}</p>
                  )}
                </div>

                {/* Company Details */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">Company Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="companyName"
                        value={editForm.companyName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Enter company name"
                      />
                    ) : (
                      <div className="px-4 py-3 bg-card rounded-lg">
                        <p className="text-primary font-medium">{companyInfo.companyName || 'Not set'}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">Company Code</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="companyCode"
                        value={editForm.companyCode}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Enter company code"
                      />
                    ) : (
                      <div className="px-4 py-3 bg-card rounded-lg">
                        <p className="text-primary font-medium">{companyInfo.companyCode || 'Not set'}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">
                      <MapPin size={16} className="inline mr-1" />
                      Address
                    </label>
                    {isEditing ? (
                      <AddressSearch
                        value={editForm.address}
                        label=""
                        placeholder="Search for company address..."
                        onAddressSelect={(selected) => {
                          setEditForm(prev => ({ ...prev, address: selected.fullAddress }));
                        }}
                        onChange={(value) => {
                          setEditForm(prev => ({ ...prev, address: value }));
                        }}
                      />
                    ) : (
                      <div className="px-4 py-3 bg-card rounded-lg">
                        <p className="text-primary">{companyInfo.address || 'Not set'}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">
                      <Mail size={16} className="inline mr-1" />
                      Contact Email
                    </label>
                    {isEditing ? (
                      <input
                        type="email"
                        name="contactEmail"
                        value={editForm.contactEmail}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Enter contact email"
                      />
                    ) : (
                      <div className="px-4 py-3 bg-card rounded-lg">
                        <p className="text-primary">{companyInfo.contactEmail || 'Not set'}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-primary mb-2">
                      <Phone size={16} className="inline mr-1" />
                      Contact Phone
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        name="contactPhone"
                        value={editForm.contactPhone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Enter contact phone"
                      />
                    ) : (
                      <div className="px-4 py-3 bg-card rounded-lg">
                        <p className="text-primary">{companyInfo.contactPhone || 'Not set'}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* API Configuration */}
            <div className="bg-card rounded-xl shadow-sm border border-theme">
              <div className="p-6 border-b border-theme">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Settings className="text-[#00D1FF]" size={24} />
                    <h2 className="text-xl font-bold text-primary">API Configuration</h2>
                  </div>
                  <button
                    onClick={handleSaveApiCredentials}
                    disabled={apiLoading}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 !text-white rounded-lg transition-all font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    {apiLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Save API Credentials
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-8">
                {/* Samsara Configuration */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Key className="text-[#00D1FF]" size={20} />
                    <h3 className="text-lg font-semibold text-primary">Samsara API</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-primary mb-2">API Base URL</label>
                      <input
                        type="text"
                        value={samsaraConfig.apiBaseUrl}
                        onChange={(e) => handleSamsaraChange('apiBaseUrl', e.target.value)}
                        className="w-full px-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="https://api.samsara.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-primary mb-2">API Token</label>
                      <input
                        type="password"
                        value={samsaraConfig.apiToken}
                        onChange={(e) => handleSamsaraChange('apiToken', e.target.value)}
                        className="w-full px-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Enter Samsara API token"
                      />
                    </div>
                  </div>
                </div>

                {/* ThermoKing Configuration */}
                <div className="border-t border-theme pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Key className="text-[#F59E0B]" size={20} />
                    <h3 className="text-lg font-semibold text-primary">ThermoKing API</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-primary mb-2">API Base URL</label>
                      <input
                        type="text"
                        value={thermokingConfig.apiBaseUrl}
                        onChange={(e) => handleThermokingChange('apiBaseUrl', e.target.value)}
                        className="w-full px-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        placeholder="https://api.thermoking.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-primary mb-2">API Key</label>
                      <input
                        type="password"
                        value={thermokingConfig.apiKey}
                        onChange={(e) => handleThermokingChange('apiKey', e.target.value)}
                        className="w-full px-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        placeholder="Enter ThermoKing API key"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-primary mb-2">API Secret</label>
                      <input
                        type="password"
                        value={thermokingConfig.apiSecret}
                        onChange={(e) => handleThermokingChange('apiSecret', e.target.value)}
                        className="w-full px-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        placeholder="Enter ThermoKing API secret"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-primary mb-2">API Version</label>
                      <input
                        type="text"
                        value={thermokingConfig.apiVersion}
                        onChange={(e) => handleThermokingChange('apiVersion', e.target.value)}
                        className="w-full px-4 py-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        placeholder="v1"
                      />
                    </div>
                  </div>
                </div>

                {/* Info Note */}
                <div className="mt-6 p-4 bg-card border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> API configurations are stored securely and linked to your company.
                    These settings are required for integrating with Samsara and ThermoKing services.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="bg-card rounded-xl shadow-sm border border-theme">
            <div className="p-6 border-b border-theme">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Wrench className="text-green-600" size={24} />
                  <h2 className="text-xl font-bold text-primary">Maintenance Policy Settings</h2>
                </div>
                <div className="flex gap-3">
                  {isEditingPolicy ? (
                    <>
                      <button
                        onClick={handleCancelPolicy}
                        disabled={policyLoading}
                        className="px-4 py-2 text-primary bg-card hover:bg-gray-200 rounded-lg transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
                      >
                        <X size={16} />
                        Cancel
                      </button>
                      <button
                        onClick={handleSavePolicy}
                        disabled={policyLoading}
                        className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 !text-white rounded-lg transition-all font-medium flex items-center gap-2 disabled:opacity-50"
                      >
                        {policyLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save size={16} />
                            Save Policy
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditingPolicy(true)}
                      className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 !text-white rounded-lg transition-all font-medium flex items-center gap-2"
                    >
                      <Edit size={16} />
                      Edit Policy
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 space-y-8">
              {/* Info Banner */}
              <div className="p-4 bg-card border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="text-[#00D1FF] flex-shrink-0 mt-0.5" size={20} />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">Maintenance Policy Configuration</p>
                    <p>Configure maintenance intervals for trucks and trailers. Add services with your own names (e.g., "Oil Change", "Full Inspection", "Service A", "Preventive Maintenance"). Each service can be configured for trucks and trailers with intervals based on days, miles, or kilometers. You can also exclude specific trailer types (reefer, dryvan, flatbed) from certain services.</p>
                  </div>
                </div>
              </div>

              {/* Services - All Dynamic */}
              <div className="border-t border-theme pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Wrench className="text-purple-600" size={20} />
                    <h3 className="text-lg font-semibold text-primary">Services</h3>
                  </div>
                  {isEditingPolicy && (
                    <button
                      onClick={addCustomService}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 !text-white rounded-lg transition-all font-medium flex items-center gap-2 text-sm"
                    >
                      <Plus size={16} />
                      Add Service
                    </button>
                  )}
                </div>

                {maintenancePolicy.customServices.length === 0 ? (
                  <div className="border-2 border-dashed border-theme rounded-lg p-8 text-center">
                    <Wrench className="text-secondary mx-auto mb-3" size={48} />
                    <p className="text-secondary font-medium mb-2">No services configured</p>
                    <p className="text-sm text-secondary mb-4">Add your first service to get started (e.g., Oil Change, Full Inspection, etc.)</p>
                    {isEditingPolicy && (
                      <button
                        onClick={addCustomService}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 !text-white rounded-lg transition-all font-medium flex items-center gap-2 mx-auto"
                      >
                        <Plus size={16} />
                        Add First Service
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {maintenancePolicy.customServices.map((service, index) => (
                      <div key={index} className="border border-theme rounded-lg p-6 bg-card">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex-1">
                            {isEditingPolicy ? (
                              <input
                                type="text"
                                value={service.name}
                                onChange={(e) => handleCustomServiceChange(index, 'name', undefined, e.target.value)}
                                className="px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold text-lg w-full max-w-md"
                                placeholder="Service Name (e.g., Full Inspection, Service A)"
                              />
                            ) : (
                              <h4 className="text-lg font-semibold text-primary">{service.name || 'Unnamed Service'}</h4>
                            )}
                          </div>
                          {isEditingPolicy && (
                            <button
                              onClick={() => removeCustomService(index)}
                              className="ml-4 p-2 text-[#A855F7] hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove Service"
                            >
                              <Trash2 size={20} />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Truck Configuration */}
                          <div className="border border-theme rounded-lg p-4 bg-card">
                            <label className="block text-sm font-semibold text-primary mb-3">
                              Truck Configuration
                            </label>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs text-secondary mb-1">Interval Value</label>
                                {isEditingPolicy ? (
                                  <input
                                    type="number"
                                    value={service.truck.value}
                                    onChange={(e) => handleCustomServiceChange(index, 'truck', 'value', parseInt(e.target.value) || 0)}
                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="30"
                                    min="0"
                                  />
                                ) : (
                                  <div className="px-3 py-2 bg-card rounded-lg">
                                    <p className="text-primary font-medium">{service.truck.value.toLocaleString()}</p>
                                  </div>
                                )}
                              </div>
                              <div>
                                <label className="block text-xs text-secondary mb-1">Unit</label>
                                {isEditingPolicy ? (
                                  <select
                                    value={service.truck.unit}
                                    onChange={(e) => handleCustomServiceChange(index, 'truck', 'unit', e.target.value)}
                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  >
                                    <option value="days">Days</option>
                                    <option value="miles">Miles</option>
                                    <option value="km">Kilometers</option>
                                  </select>
                                ) : (
                                  <div className="px-3 py-2 bg-card rounded-lg">
                                    <p className="text-primary font-medium uppercase">{service.truck.unit}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Trailer Configuration */}
                          <div className="border border-theme rounded-lg p-4 bg-card">
                            <label className="block text-sm font-semibold text-primary mb-3">
                              Trailer Configuration
                            </label>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs text-secondary mb-1">Interval Value</label>
                                {isEditingPolicy ? (
                                  <input
                                    type="number"
                                    value={service.trailer.value}
                                    onChange={(e) => handleCustomServiceChange(index, 'trailer', 'value', parseInt(e.target.value) || 0)}
                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="30"
                                    min="0"
                                  />
                                ) : (
                                  <div className="px-3 py-2 bg-card rounded-lg">
                                    <p className="text-primary font-medium">{service.trailer.value.toLocaleString()}</p>
                                  </div>
                                )}
                              </div>
                              <div>
                                <label className="block text-xs text-secondary mb-1">Unit</label>
                                {isEditingPolicy ? (
                                  <select
                                    value={service.trailer.unit}
                                    onChange={(e) => handleCustomServiceChange(index, 'trailer', 'unit', e.target.value)}
                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  >
                                    <option value="days">Days</option>
                                    <option value="miles">Miles</option>
                                    <option value="km">Kilometers</option>
                                  </select>
                                ) : (
                                  <div className="px-3 py-2 bg-card rounded-lg">
                                    <p className="text-primary font-medium uppercase">{service.trailer.unit}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Excluded Trailer Types */}
                        <div className="mt-4 border border-theme rounded-lg p-4 bg-card">
                          <label className="block text-sm font-semibold text-primary mb-2">
                            Trailer Types Excluded (Optional)
                          </label>
                          <p className="text-xs text-secondary mb-3">
                            Select trailer types that do not require this service
                          </p>
                          {isEditingPolicy ? (
                            <div className="space-y-2">
                              {['reefer', 'dryvan', 'flatbed'].map((type) => (
                                <label key={type} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={(service.excludeTypes || []).includes(type)}
                                    onChange={(e) => {
                                      const currentTypes = service.excludeTypes || [];
                                      let newTypes;
                                      if (e.target.checked) {
                                        newTypes = [...currentTypes, type];
                                      } else {
                                        newTypes = currentTypes.filter(t => t !== type);
                                      }
                                      handleCustomServiceChange(index, 'excludeTypes', undefined, newTypes);
                                    }}
                                    className="w-4 h-4 text-purple-600 border-theme rounded focus:ring-purple-500"
                                  />
                                  <span className="text-sm text-primary capitalize">{type}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <div className="px-3 py-2 bg-card rounded-lg border border-theme">
                              <p className="text-primary font-medium">
                                {(service.excludeTypes || []).length > 0
                                  ? (service.excludeTypes || []).map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')
                                  : 'None'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="border-t border-theme pt-6">
                <h3 className="text-lg font-semibold text-primary mb-4">Policy Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-card rounded-lg p-4">
                    <h4 className="font-semibold text-primary mb-2">Truck Maintenance</h4>
                    <ul className="text-sm text-secondary space-y-1">
                      {maintenancePolicy.customServices.map((service, index) => (
                        <li key={index}>
                          • {service.name || 'Unnamed Service'}: Every {service.truck.value.toLocaleString()} {service.truck.unit}
                        </li>
                      ))}
                      {maintenancePolicy.customServices.length === 0 && (
                        <li className="text-secondary italic">• No services configured</li>
                      )}
                    </ul>
                  </div>
                  <div className="bg-card rounded-lg p-4">
                    <h4 className="font-semibold text-primary mb-2">Trailer Maintenance</h4>
                    <ul className="text-sm text-secondary space-y-1">
                      {maintenancePolicy.customServices.map((service, index) => (
                        <li key={index}>
                          • {service.name || 'Unnamed Service'}: Every {service.trailer.value.toLocaleString()} {service.trailer.unit}
                          {(service.excludeTypes || []).length > 0 && (
                            <span className="text-[#F59E0B] ml-1">(Excluded: {(service.excludeTypes || []).map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ')})</span>
                          )}
                        </li>
                      ))}
                      {maintenancePolicy.customServices.length === 0 && (
                        <li className="text-secondary italic">• No services configured</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Company;