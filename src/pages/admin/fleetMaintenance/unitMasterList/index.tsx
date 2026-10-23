import React, { useState } from 'react';
import { Plus, Edit, Trash2, Search, Truck, CheckCircle, XCircle } from 'lucide-react';
import { FaCheckCircle, FaExclamationCircle, FaTimes } from 'react-icons/fa';

type UnitType = 'Truck' | 'Reefer Trailer' | 'Tri-Axle Trailer' | 'Dry Van' | 'Bus/Van';
type UnitStatus = 'Active' | 'Inactive';

interface Unit {
  _id: string;
  unitNo: string;
  unitType: UnitType;
  makeModel: string;
  vinNo: string;
  licensePlate: string;
  initialOdometer: number;
  currentOdometer?: number;
  status: UnitStatus;
  lastDate?: string;
  reason?: string;
  createdAt: string;
}

// Static data for units
const staticUnits: Unit[] = [
  {
    _id: '1',
    unitNo: '1001',
    unitType: 'Truck',
    makeModel: 'Kenworth T680',
    vinNo: '1XKDB0X5XKJ123456',
    licensePlate: 'BRV-1001',
    initialOdometer: 0,
    currentOdometer: 125000,
    status: 'Active',
    createdAt: '2023-01-15'
  },
  {
    _id: '2',
    unitNo: '1002',
    unitType: 'Truck',
    makeModel: 'Peterbilt 579',
    vinNo: '1NP5DB0X9NW234567',
    licensePlate: 'BRV-1002',
    initialOdometer: 0,
    currentOdometer: 98000,
    status: 'Active',
    createdAt: '2023-02-20'
  },
  {
    _id: '3',
    unitNo: 'BRV001',
    unitType: 'Reefer Trailer',
    makeModel: 'Utility 4000R',
    vinNo: '1UYVS2534M1234567',
    licensePlate: 'TRL-001',
    initialOdometer: 0,
    currentOdometer: 45000,
    status: 'Active',
    createdAt: '2023-03-10'
  },
  {
    _id: '4',
    unitNo: 'BRV002',
    unitType: 'Tri-Axle Trailer',
    makeModel: 'Great Dane',
    vinNo: '1GRDM2534M2345678',
    licensePlate: 'TRL-002',
    initialOdometer: 0,
    currentOdometer: 32000,
    status: 'Active',
    createdAt: '2023-04-05'
  },
  {
    _id: '5',
    unitNo: '1003',
    unitType: 'Truck',
    makeModel: 'Freightliner Cascadia',
    vinNo: '1FUJGHDV5DS345678',
    licensePlate: 'BRV-1003',
    initialOdometer: 0,
    currentOdometer: 156000,
    status: 'Active',
    createdAt: '2022-11-15'
  },
  {
    _id: '6',
    unitNo: 'BRV003',
    unitType: 'Dry Van',
    makeModel: 'Wabash National',
    vinNo: '1WBN2534M3456789',
    licensePlate: 'TRL-003',
    initialOdometer: 0,
    currentOdometer: 28000,
    status: 'Active',
    createdAt: '2023-05-20'
  },
  {
    _id: '7',
    unitNo: '1004',
    unitType: 'Truck',
    makeModel: 'Volvo VNL',
    vinNo: '4V4NC9EH5NN456789',
    licensePlate: 'BRV-1004',
    initialOdometer: 0,
    currentOdometer: 0,
    status: 'Inactive',
    lastDate: '2024-01-15',
    reason: 'SOLD - Replaced with newer unit',
    createdAt: '2021-06-10'
  },
  {
    _id: '8',
    unitNo: 'BRV004',
    unitType: 'Reefer Trailer',
    makeModel: 'Carrier Transicold',
    vinNo: '1CRR2534M4567890',
    licensePlate: 'TRL-004',
    initialOdometer: 0,
    currentOdometer: 0,
    status: 'Inactive',
    lastDate: '2023-12-20',
    reason: 'Rental returned',
    createdAt: '2022-08-15'
  }
];

const UnitMasterList: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [units, setUnits] = useState<Unit[]>(staticUnits);
  const [formData, setFormData] = useState({
    unitNo: '',
    unitType: 'Truck' as UnitType,
    makeModel: '',
    vinNo: '',
    licensePlate: '',
    initialOdometer: '',
    lastDate: '',
    reason: ''
  });

  const filteredUnits = units.filter(unit => {
    const matchesStatus = activeTab === 'active' ? unit.status === 'Active' : unit.status === 'Inactive';
    const matchesSearch = !searchTerm ||
      unit.unitNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.makeModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.licensePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.vinNo.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleAddUnit = () => {
    setFormData({
      unitNo: '',
      unitType: 'Truck',
      makeModel: '',
      vinNo: '',
      licensePlate: '',
      initialOdometer: '',
      lastDate: '',
      reason: ''
    });
    setShowAddModal(true);
  };

  const handleEditUnit = (unit: Unit) => {
    setSelectedUnit(unit);
    setFormData({
      unitNo: unit.unitNo,
      unitType: unit.unitType,
      makeModel: unit.makeModel,
      vinNo: unit.vinNo,
      licensePlate: unit.licensePlate,
      initialOdometer: unit.initialOdometer.toString(),
      lastDate: unit.lastDate || '',
      reason: unit.reason || ''
    });
    setShowEditModal(true);
  };

  const handleDeleteUnit = (unit: Unit) => {
    setSelectedUnit(unit);
    setShowDeleteModal(true);
  };

  const handleSaveUnit = () => {
    if (!formData.unitNo || !formData.makeModel || !formData.vinNo || !formData.licensePlate || !formData.initialOdometer) {
      alert('Please fill in all required fields');
      return;
    }

    if (showAddModal) {
      const newUnit: Unit = {
        _id: Date.now().toString(),
        unitNo: formData.unitNo,
        unitType: formData.unitType,
        makeModel: formData.makeModel,
        vinNo: formData.vinNo,
        licensePlate: formData.licensePlate,
        initialOdometer: parseInt(formData.initialOdometer),
        status: 'Active',
        createdAt: new Date().toISOString()
      };
      setUnits([...units, newUnit]);
    } else if (showEditModal && selectedUnit) {
      setUnits(units.map(unit =>
        unit._id === selectedUnit._id
          ? {
            ...unit,
            unitNo: formData.unitNo,
            unitType: formData.unitType,
            makeModel: formData.makeModel,
            vinNo: formData.vinNo,
            licensePlate: formData.licensePlate,
            initialOdometer: parseInt(formData.initialOdometer),
            lastDate: formData.lastDate || undefined,
            reason: formData.reason || undefined
          }
          : unit
      ));
    }

    setShowAddModal(false);
    setShowEditModal(false);
    setSelectedUnit(null);
    setFormData({
      unitNo: '',
      unitType: 'Truck',
      makeModel: '',
      vinNo: '',
      licensePlate: '',
      initialOdometer: '',
      lastDate: '',
      reason: ''
    });
  };

  const handleConfirmDelete = () => {
    if (selectedUnit) {
      setUnits(units.filter(unit => unit._id !== selectedUnit._id));
      setShowDeleteModal(false);
      setSelectedUnit(null);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-blue-50/30 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl shadow-lg" style={{ background: 'linear-gradient(to bottom right, #016ab2, #063f6f)' }}>
                <Truck className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(to right, #016ab2, #063f6f)' }}>
                  Unit Master List
                </h1>
                <p className="text-secondary mt-1 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Create and manage truck & trailer assets
                </p>
              </div>
            </div>
            {activeTab === 'active' && (
              <button
                onClick={handleAddUnit}
                className="flex items-center gap-2 px-6 py-3 text-white rounded-lg shadow-lg transition-all duration-200 font-medium hover:opacity-90"
                style={{ background: 'linear-gradient(to right, #016ab2, #063f6f)' }}
              >
                <Plus className="w-5 h-5" />
                Add Unit
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-card rounded-xl shadow-lg border border-theme mb-6">
          <div className="flex border-b border-theme">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${activeTab === 'active'
                  ? 'text-white border-b-2'
                  : 'text-secondary hover:bg-[rgba(255,255,255,0.03)]'
                }`}
              style={activeTab === 'active' ? { background: 'linear-gradient(to right, #016ab2, #063f6f)', borderColor: '#016ab2' } : {}}
            >
              Active Units ({units.filter(u => u.status === 'Active').length})
            </button>
            <button
              onClick={() => setActiveTab('inactive')}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${activeTab === 'inactive'
                  ? 'text-white border-b-2'
                  : 'text-secondary hover:bg-[rgba(255,255,255,0.03)]'
                }`}
              style={activeTab === 'inactive' ? { background: 'linear-gradient(to right, #016ab2, #063f6f)', borderColor: '#016ab2' } : {}}
            >
              Inactive Units ({units.filter(u => u.status === 'Inactive').length})
            </button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-theme">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" />
              <input
                type="text"
                placeholder="Search by unit number, make/model, license plate, or VIN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="text-white" style={{ background: 'linear-gradient(to right, #016ab2, #063f6f)' }}>
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Unit No.</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Unit Type</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Make/Model</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">VIN No.</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">License Plate</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Odometer</th>
                  {activeTab === 'inactive' && (
                    <>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Last Date</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Reason</th>
                    </>
                  )}
                  <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme">
                {filteredUnits.length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === 'inactive' ? 9 : 7} className="px-6 py-12 text-center text-secondary">
                      No {activeTab} units found
                    </td>
                  </tr>
                ) : (
                  filteredUnits.map((unit) => (
                    <tr key={unit._id} className="hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                      <td className="px-6 py-4 font-medium text-primary">{unit.unitNo}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${unit.unitType === 'Truck' ? 'bg-blue-100 text-blue-800' :
                            unit.unitType === 'Reefer Trailer' ? 'bg-green-100 text-green-800' :
                              unit.unitType === 'Tri-Axle Trailer' ? 'bg-orange-100 text-orange-800' :
                                unit.unitType === 'Dry Van' ? 'bg-blue-100 text-blue-800' :
                                  'bg-card text-primary'
                          }`}>
                          {unit.unitType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-primary">{unit.makeModel}</td>
                      <td className="px-6 py-4 text-secondary font-mono text-sm">{unit.vinNo}</td>
                      <td className="px-6 py-4 text-primary font-medium">{unit.licensePlate}</td>
                      <td className="px-6 py-4 text-primary">
                        {unit.currentOdometer !== undefined ? unit.currentOdometer.toLocaleString() : unit.initialOdometer.toLocaleString()} km
                      </td>
                      {activeTab === 'inactive' && (
                        <>
                          <td className="px-6 py-4 text-secondary">
                            {unit.lastDate ? new Date(unit.lastDate).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-secondary">{unit.reason || 'N/A'}</td>
                        </>
                      )}
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${unit.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                          {unit.status === 'Active' ? (
                            <><FaCheckCircle className="mr-1" size={12} /> Active</>
                          ) : (
                            <><XCircle className="mr-1" size={12} /> Inactive</>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditUnit(unit)}
                            className="p-2 text-[#00D1FF] hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUnit(unit)}
                            className="p-2 text-[#A855F7] hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Sidebar */}
        {(showAddModal || showEditModal) && (
          <>
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] transition-all duration-500" onClick={() => {
              setShowAddModal(false);
              setShowEditModal(false);
              setSelectedUnit(null);
            }} />
            <div className="fixed top-0 right-0 h-full w-full sm:w-[90vw] lg:w-[80vw] xl:w-[70vw] bg-card shadow-2xl transform transition-transform duration-500 ease-out z-[101] border-l border-theme">
              <div className="h-full flex flex-col">
                <div className="flex-shrink-0 px-6 py-4 flex items-center justify-between text-white" style={{ background: 'linear-gradient(to right, #016ab2, #063f6f)' }}>
                  <h2 className="text-2xl font-bold">{showAddModal ? 'Add New Unit' : 'Edit Unit'}</h2>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                      setSelectedUnit(null);
                    }}
                    className="p-2 hover:bg-card/20 rounded-lg transition-colors"
                  >
                    <FaTimes className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Unit No. *</label>
                      <input
                        type="text"
                        value={formData.unitNo}
                        onChange={(e) => setFormData({ ...formData, unitNo: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                        placeholder="e.g., 1001, BRV001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Unit Type *</label>
                      <select
                        value={formData.unitType}
                        onChange={(e) => setFormData({ ...formData, unitType: e.target.value as UnitType })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                      >
                        <option value="Truck">Truck</option>
                        <option value="Reefer Trailer">Reefer Trailer</option>
                        <option value="Tri-Axle Trailer">Tri-Axle Trailer</option>
                        <option value="Dry Van">Dry Van</option>
                        <option value="Bus/Van">Bus/Van</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Make/Model *</label>
                      <input
                        type="text"
                        value={formData.makeModel}
                        onChange={(e) => setFormData({ ...formData, makeModel: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                        placeholder="e.g., Kenworth T680"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">VIN No. *</label>
                      <input
                        type="text"
                        value={formData.vinNo}
                        onChange={(e) => setFormData({ ...formData, vinNo: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent font-mono"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                        placeholder="17-character VIN"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">License Plate *</label>
                      <input
                        type="text"
                        value={formData.licensePlate}
                        onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                        placeholder="e.g., BRV-1001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Initial Odometer/Hour *</label>
                      <input
                        type="number"
                        value={formData.initialOdometer}
                        onChange={(e) => setFormData({ ...formData, initialOdometer: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                        placeholder="0"
                      />
                    </div>
                    {activeTab === 'inactive' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-2">Last Date *</label>
                          <input
                            type="date"
                            value={formData.lastDate}
                            onChange={(e) => setFormData({ ...formData, lastDate: e.target.value })}
                            className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                            style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                            onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                            onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-2">Reason/Comment *</label>
                          <input
                            type="text"
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                            style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                            onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                            onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                            placeholder="SOLD, Rental returned, Scrapped, etc."
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <div className="sticky bottom-0 bg-card px-6 py-4 flex justify-end gap-3 border-t mt-6">
                    <button
                      onClick={() => {
                        setShowAddModal(false);
                        setShowEditModal(false);
                        setSelectedUnit(null);
                      }}
                      className="px-6 py-2 border border-theme rounded-lg text-primary hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveUnit}
                      className="px-6 py-2 text-white rounded-lg transition-colors hover:opacity-90"
                      style={{ background: 'linear-gradient(to right, #016ab2, #063f6f)' }}
                    >
                      {showAddModal ? 'Add Unit' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedUnit && (
          <>
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[9998]" onClick={() => setShowDeleteModal(false)} />
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-card rounded-xl shadow-2xl z-[9999] w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <FaExclamationCircle className="text-[#A855F7]" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-primary">Delete Unit</h3>
                    <p className="text-sm text-secondary">This action cannot be undone</p>
                  </div>
                </div>
                <p className="text-primary mb-6">
                  Are you sure you want to delete unit <strong>{selectedUnit.unitNo}</strong> ({selectedUnit.makeModel})?
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="px-6 py-2 border border-theme rounded-lg text-primary hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UnitMasterList;

