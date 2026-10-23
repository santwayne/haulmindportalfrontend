import { useEffect, useState } from 'react';
import { Wrench, Info, Plus, Trash2, Edit, Save, X, AlertCircle, Check } from 'lucide-react';
import { getCompany, updateMaintenancePolicy } from '../../../../axios/api/admin';

interface CustomService {
  name: string;
  truck: { value: number; unit: 'days' | 'miles' | 'km' };
  trailer: { value: number; unit: 'days' | 'miles' | 'km' };
  excludeTypes?: string[];
}

interface MaintenancePolicy {
  customServices: CustomService[];
}

// Lets the Fleet Maintenance Manager configure preventive maintenance intervals
// (when a truck/trailer service is due) without needing admin/Company Settings access.
// Reads/writes the same CompanySettings.maintenancePolicies used by the Compliance dashboard.
const MaintenanceSettings = () => {
  const [fetchLoading, setFetchLoading] = useState(true);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [isEditingPolicy, setIsEditingPolicy] = useState(false);
  const [policyError, setPolicyError] = useState('');
  const [policySuccess, setPolicySuccess] = useState('');
  const [loadError, setLoadError] = useState('');

  const [maintenancePolicy, setMaintenancePolicy] = useState<MaintenancePolicy>({
    customServices: []
  });

  useEffect(() => {
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    setFetchLoading(true);
    setLoadError('');
    try {
      const response = await getCompany();
      if (response?.success && response?.data) {
        setMaintenancePolicy({
          customServices: response.data.maintenancePolicies?.customServices || []
        });
      } else {
        setLoadError(response?.message || 'Failed to load maintenance settings.');
      }
    } catch (error) {
      console.error('Error fetching maintenance policy:', error);
      setLoadError('Failed to load maintenance settings. Please try again.');
    } finally {
      setFetchLoading(false);
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
          truck: { ...newServices[index].truck, [subField]: value } as CustomService['truck']
        };
      } else if (field === 'trailer' && subField) {
        newServices[index] = {
          ...newServices[index],
          trailer: { ...newServices[index].trailer, [subField]: value } as CustomService['trailer']
        };
      } else if (field === 'excludeTypes') {
        newServices[index] = { ...newServices[index], excludeTypes: value as string[] };
      }
      return { ...prev, customServices: newServices };
    });
  };

  const addCustomService = () => {
    setMaintenancePolicy(prev => ({
      ...prev,
      customServices: [
        ...prev.customServices,
        { name: '', truck: { value: 0, unit: 'days' }, trailer: { value: 0, unit: 'days' }, excludeTypes: [] }
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

    const isComplete = (service: CustomService) =>
      service.name && service.name.trim() !== '' &&
      typeof service.truck?.value === 'number' && service.truck.value > 0 && service.truck.unit &&
      typeof service.trailer?.value === 'number' && service.trailer.value > 0 && service.trailer.unit;

    const validServices = maintenancePolicy.customServices.filter(isComplete);
    const incompleteCount = maintenancePolicy.customServices.length - validServices.length;

    if (incompleteCount > 0) {
      setPolicyError(`Please complete all service fields. ${incompleteCount} service(s) have missing or invalid data (name, value > 0, and unit are required).`);
      setPolicyLoading(false);
      return;
    }

    if (validServices.length === 0) {
      setPolicyError('Please add at least one service before saving.');
      setPolicyLoading(false);
      return;
    }

    try {
      const response = await updateMaintenancePolicy({
        maintenancePolicies: { customServices: validServices }
      });

      if (response?.success) {
        setPolicySuccess('Maintenance policy settings saved successfully!');
        setMaintenancePolicy(prev => ({ ...prev, customServices: validServices }));
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

  if (fetchLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-main">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[var(--accent-blue)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-main px-4 pt-4 pb-10">
      <div className="max-w-5xl mx-auto">
        <div className="mb-4">
          <h1 className="text-lg font-semibold text-primary flex items-center gap-2">
            <Wrench className="w-5 h-5" style={{ color: 'var(--accent-navyblue)' }} />
            Preventive Maintenance Settings
          </h1>
          <p className="text-xs text-secondary mt-1">Define when a truck or trailer service is due, based on maintenance intervals.</p>
        </div>

        {loadError && (
          <div className="mb-4 p-4 bg-card border border-red-200 rounded-lg flex items-center gap-2 text-sm" style={{ color: 'var(--accent-red)' }}>
            <AlertCircle size={18} /> {loadError}
          </div>
        )}
        {policyError && (
          <div className="mb-4 p-4 bg-card border border-red-200 rounded-lg flex items-center gap-2 text-sm" style={{ color: 'var(--accent-red)' }}>
            <AlertCircle size={18} /> {policyError}
          </div>
        )}
        {policySuccess && (
          <div className="mb-4 p-4 bg-card border border-green-200 rounded-lg flex items-center gap-2 text-sm text-green-600">
            <Check size={18} /> {policySuccess}
          </div>
        )}

        <div className="bg-card rounded-xl border border-theme overflow-hidden">
          <div className="p-6 border-b border-theme flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="text-purple-600" size={20} />
              <h3 className="text-lg font-semibold text-primary">Services</h3>
            </div>
            <div className="flex items-center gap-2">
              {isEditingPolicy ? (
                <>
                  <button
                    onClick={() => { setIsEditingPolicy(false); fetchPolicy(); }}
                    className="px-4 py-2 border border-theme text-secondary rounded-lg text-sm font-medium flex items-center gap-2"
                  >
                    <X size={16} /> Cancel
                  </button>
                  <button
                    onClick={addCustomService}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 !text-white rounded-lg transition-all font-medium flex items-center gap-2 text-sm"
                  >
                    <Plus size={16} /> Add Service
                  </button>
                  <button
                    onClick={handleSavePolicy}
                    disabled={policyLoading}
                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 !text-white rounded-lg transition-all font-medium flex items-center gap-2 disabled:opacity-60"
                  >
                    {policyLoading ? (
                      <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Saving...</>
                    ) : (
                      <><Save size={16} /> Save Policy</>
                    )}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditingPolicy(true)}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 !text-white rounded-lg transition-all font-medium flex items-center gap-2"
                >
                  <Edit size={16} /> Edit Policy
                </button>
              )}
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="p-4 bg-card border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="text-[#00D1FF] flex-shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Maintenance Policy Configuration</p>
                  <p>Add services with your own names (e.g., "Oil Change", "Full Inspection", "Preventive Maintenance"). Each service can be configured for trucks and trailers with intervals based on days, miles, or kilometers, and specific trailer types (reefer, dryvan, flatbed) can be excluded.</p>
                </div>
              </div>
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
                    <Plus size={16} /> Add First Service
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
                      <div className="border border-theme rounded-lg p-4 bg-card">
                        <label className="block text-sm font-semibold text-primary mb-3">Truck Configuration</label>
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

                      <div className="border border-theme rounded-lg p-4 bg-card">
                        <label className="block text-sm font-semibold text-primary mb-3">Trailer Configuration</label>
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

                    <div className="mt-4 border border-theme rounded-lg p-4 bg-card">
                      <label className="block text-sm font-semibold text-primary mb-2">Trailer Types Excluded (Optional)</label>
                      <p className="text-xs text-secondary mb-3">Select trailer types that do not require this service</p>
                      {isEditingPolicy ? (
                        <div className="space-y-2">
                          {['reefer', 'dryvan', 'flatbed'].map((type) => (
                            <label key={type} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={(service.excludeTypes || []).includes(type)}
                                onChange={(e) => {
                                  const currentTypes = service.excludeTypes || [];
                                  const newTypes = e.target.checked
                                    ? [...currentTypes, type]
                                    : currentTypes.filter(t => t !== type);
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
        </div>
      </div>
    </div>
  );
};

export default MaintenanceSettings;
