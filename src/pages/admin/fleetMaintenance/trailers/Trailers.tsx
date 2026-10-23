import React, { useState } from 'react';
import { Plus, Edit, Trash2, Search, Truck, AlertTriangle, CheckCircle, FileDown } from 'lucide-react';
import ExcelJS from 'exceljs';
import { FaExclamationCircle, FaTimes } from 'react-icons/fa';

type TrailerType = 'Reefer Trailer' | 'Tri-Axle Trailer' | 'Dry Van' | 'Flatbed' | 'Step Deck' | 'Lowboy' | 'Tank Trailer' | 'Dump Trailer';

interface Trailer {
  _id: string;
  internalId: string;
  trailer: string;
  plateNumber: string;
  vinNumber: string;
  make: string;
  model: string;
  year: number;
  trailerType: TrailerType;
  capacity: string;
  odometer?: number;
  status: string;
  operationStatus: string;
  // Safety compliance fields
  safetyExpiryDate?: string;
  safetyDecalNumber?: string;
  safetyPaperNumber?: string;
  lastInspectionShop?: string;
  lastInspectionInvoice?: string;
}

// Static data for trailers
const staticTrailers: Trailer[] = [
  {
    _id: '1',
    internalId: 'BRV001',
    trailer: 'Reefer Unit 001',
    plateNumber: 'TRL-001',
    vinNumber: '1UYVS2534M1234567',
    make: 'Utility',
    model: '4000R',
    year: 2023,
    trailerType: 'Reefer Trailer',
    capacity: '53 ft',
    odometer: 45000,
    status: 'available',
    operationStatus: 'available',
    safetyExpiryDate: '2024-10-05',
    safetyDecalNumber: 'SD-2024-BRV001',
    safetyPaperNumber: 'SP-2024-BRV001',
    lastInspectionShop: 'Trailer Inspection Center',
    lastInspectionInvoice: 'INV-SAF-2024-003'
  },
  {
    _id: '2',
    internalId: 'BRV002',
    trailer: 'Tri-Axle 002',
    plateNumber: 'TRL-002',
    vinNumber: '1GRDM2534M2345678',
    make: 'Great Dane',
    model: 'SD-53',
    year: 2022,
    trailerType: 'Tri-Axle Trailer',
    capacity: '53 ft',
    odometer: 32000,
    status: 'in-use',
    operationStatus: 'in-transit',
    safetyExpiryDate: '2024-08-15',
    safetyDecalNumber: 'SD-2024-BRV002',
    safetyPaperNumber: 'SP-2024-BRV002',
    lastInspectionShop: 'Trailer Inspection Center',
    lastInspectionInvoice: 'INV-SAF-2024-005'
  },
  {
    _id: '3',
    internalId: 'BRV003',
    trailer: 'Dry Van 003',
    plateNumber: 'TRL-003',
    vinNumber: '1WBN2534M3456789',
    make: 'Wabash National',
    model: 'DuraPlate',
    year: 2023,
    trailerType: 'Dry Van',
    capacity: '53 ft',
    odometer: 28000,
    status: 'available',
    operationStatus: 'available',
    safetyExpiryDate: '2024-07-20',
    safetyDecalNumber: 'SD-2024-BRV003',
    safetyPaperNumber: 'SP-2024-BRV003',
    lastInspectionShop: 'Trailer Inspection Center',
    lastInspectionInvoice: 'INV-SAF-2024-006'
  },
  {
    _id: '4',
    internalId: 'BRV004',
    trailer: 'Flatbed 004',
    plateNumber: 'TRL-004',
    vinNumber: '1FBP2534M4567890',
    make: 'East Manufacturing',
    model: 'Flatbed',
    year: 2022,
    trailerType: 'Flatbed',
    capacity: '48 ft',
    odometer: 55000,
    status: 'maintenance',
    operationStatus: 'maintenance',
    safetyExpiryDate: '2024-06-10',
    safetyDecalNumber: 'SD-2024-BRV004',
    safetyPaperNumber: 'SP-2024-BRV004',
    lastInspectionShop: 'Trailer Inspection Center',
    lastInspectionInvoice: 'INV-SAF-2024-007'
  },
  {
    _id: '5',
    internalId: 'BRV005',
    trailer: 'Reefer Unit 005',
    plateNumber: 'TRL-005',
    vinNumber: '1CRR2534M5678901',
    make: 'Carrier Transicold',
    model: 'Reefer',
    year: 2024,
    trailerType: 'Reefer Trailer',
    capacity: '53 ft',
    odometer: 12000,
    status: 'available',
    operationStatus: 'available',
    safetyExpiryDate: '2025-01-15',
    safetyDecalNumber: 'SD-2025-BRV005',
    safetyPaperNumber: 'SP-2025-BRV005',
    lastInspectionShop: 'Trailer Inspection Center',
    lastInspectionInvoice: 'INV-SAF-2025-001'
  }
];

const Trailers: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTrailer, setSelectedTrailer] = useState<Trailer | null>(null);
  const [trailers, setTrailers] = useState<Trailer[]>(staticTrailers);
  const [formData, setFormData] = useState({
    internalId: '',
    trailer: '',
    plateNumber: '',
    vinNumber: '',
    make: '',
    model: '',
    year: new Date().getFullYear().toString(),
    trailerType: 'Dry Van' as TrailerType,
    capacity: '',
    odometer: '',
    status: 'available',
    operationStatus: 'available'
  });
  const [safetyForm, setSafetyForm] = useState({
    safetyExpiryDate: '',
    safetyDecalNumber: '',
    safetyPaperNumber: '',
    lastInspectionShop: '',
    lastInspectionInvoice: ''
  });

  const filteredTrailers = trailers.filter(trailer => {
    return !searchTerm ||
      trailer.internalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trailer.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trailer.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trailer.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trailer.vinNumber.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const getComplianceStatus = (expiryDate?: string) => {
    if (!expiryDate) return { status: 'unknown', color: 'gray', text: 'Not Set' };

    const expiry = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);

    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { status: 'expired', color: 'red', text: 'Expired' };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'expiring-soon', color: 'yellow', text: `Expiring in ${daysUntilExpiry} days` };
    } else {
      return { status: 'valid', color: 'green', text: 'Valid' };
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const handleAddTrailer = () => {
    setFormData({
      internalId: '',
      trailer: '',
      plateNumber: '',
      vinNumber: '',
      make: '',
      model: '',
      year: new Date().getFullYear().toString(),
      trailerType: 'Dry Van',
      capacity: '',
      odometer: '',
      status: 'available',
      operationStatus: 'available'
    });
    setShowAddModal(true);
  };

  const handleEditTrailer = (trailer: Trailer) => {
    setSelectedTrailer(trailer);
    setFormData({
      internalId: trailer.internalId,
      trailer: trailer.trailer,
      plateNumber: trailer.plateNumber,
      vinNumber: trailer.vinNumber,
      make: trailer.make,
      model: trailer.model,
      year: trailer.year.toString(),
      trailerType: trailer.trailerType,
      capacity: trailer.capacity,
      odometer: trailer.odometer?.toString() || '',
      status: trailer.status,
      operationStatus: trailer.operationStatus
    });
    setShowEditModal(true);
  };

  const handleSafetyRecord = (trailer: Trailer) => {
    setSelectedTrailer(trailer);
    setSafetyForm({
      safetyExpiryDate: trailer.safetyExpiryDate ? new Date(trailer.safetyExpiryDate).toISOString().split('T')[0] : '',
      safetyDecalNumber: trailer.safetyDecalNumber || '',
      safetyPaperNumber: trailer.safetyPaperNumber || '',
      lastInspectionShop: trailer.lastInspectionShop || '',
      lastInspectionInvoice: trailer.lastInspectionInvoice || ''
    });
    setShowSafetyModal(true);
  };

  const handleDeleteTrailer = (trailer: Trailer) => {
    setSelectedTrailer(trailer);
    setShowDeleteModal(true);
  };

  const handleSaveTrailer = () => {
    if (!formData.internalId || !formData.plateNumber || !formData.vinNumber || !formData.make || !formData.model) {
      alert('Please fill in all required fields');
      return;
    }

    if (showAddModal) {
      const newTrailer: Trailer = {
        _id: Date.now().toString(),
        internalId: formData.internalId,
        trailer: formData.trailer,
        plateNumber: formData.plateNumber,
        vinNumber: formData.vinNumber,
        make: formData.make,
        model: formData.model,
        year: parseInt(formData.year),
        trailerType: formData.trailerType,
        capacity: formData.capacity,
        odometer: parseInt(formData.odometer) || undefined,
        status: formData.status,
        operationStatus: formData.operationStatus
      };
      setTrailers([...trailers, newTrailer]);
    } else if (showEditModal && selectedTrailer) {
      setTrailers(trailers.map(trailer =>
        trailer._id === selectedTrailer._id
          ? {
            ...trailer,
            internalId: formData.internalId,
            trailer: formData.trailer,
            plateNumber: formData.plateNumber,
            vinNumber: formData.vinNumber,
            make: formData.make,
            model: formData.model,
            year: parseInt(formData.year),
            trailerType: formData.trailerType,
            capacity: formData.capacity,
            odometer: parseInt(formData.odometer) || trailer.odometer,
            status: formData.status,
            operationStatus: formData.operationStatus
          }
          : trailer
      ));
    }

    setShowAddModal(false);
    setShowEditModal(false);
    setSelectedTrailer(null);
  };

  const handleSaveSafety = () => {
    if (!selectedTrailer || !safetyForm.safetyExpiryDate) {
      alert('Please fill in the safety expiry date');
      return;
    }

    setTrailers(trailers.map(trailer =>
      trailer._id === selectedTrailer._id
        ? {
          ...trailer,
          safetyExpiryDate: safetyForm.safetyExpiryDate,
          safetyDecalNumber: safetyForm.safetyDecalNumber,
          safetyPaperNumber: safetyForm.safetyPaperNumber,
          lastInspectionShop: safetyForm.lastInspectionShop,
          lastInspectionInvoice: safetyForm.lastInspectionInvoice
        }
        : trailer
    ));
    setShowSafetyModal(false);
    setSelectedTrailer(null);
  };

  const handleExportTrailers = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Logistiq Innovation';
    workbook.created = new Date();
    const sheet = workbook.addWorksheet('Trailers', { views: [{ state: 'frozen', ySplit: 1 }] });

    sheet.columns = [
      { header: 'Internal ID', key: 'internalId', width: 16 },
      { header: 'Trailer', key: 'trailer', width: 20 },
      { header: 'Plate Number', key: 'plateNumber', width: 16 },
      { header: 'VIN Number', key: 'vinNumber', width: 22 },
      { header: 'Trailer Type', key: 'trailerType', width: 18 },
      { header: 'Make', key: 'make', width: 14 },
      { header: 'Model', key: 'model', width: 14 },
      { header: 'Year', key: 'year', width: 10 },
      { header: 'Capacity', key: 'capacity', width: 14 },
      { header: 'Odometer', key: 'odometer', width: 14 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Operation Status', key: 'operationStatus', width: 18 },
      { header: 'Safety Expiry Date', key: 'safetyExpiryDate', width: 20 },
      { header: 'Safety Decal #', key: 'safetyDecalNumber', width: 18 },
      { header: 'Safety Paper #', key: 'safetyPaperNumber', width: 18 },
      { header: 'Last Inspection Shop', key: 'lastInspectionShop', width: 22 },
      { header: 'Last Inspection Inv.', key: 'lastInspectionInvoice', width: 22 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF42AEEC' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 22;

    filteredTrailers.forEach((t) => {
      const row = sheet.addRow({
        internalId: t.internalId || '',
        trailer: t.trailer || '',
        plateNumber: t.plateNumber || '',
        vinNumber: t.vinNumber || '',
        trailerType: t.trailerType || '',
        make: t.make || '',
        model: t.model || '',
        year: t.year || '',
        capacity: t.capacity || '',
        odometer: t.odometer ?? '',
        status: t.status || '',
        operationStatus: t.operationStatus || '',
        safetyExpiryDate: t.safetyExpiryDate || '',
        safetyDecalNumber: t.safetyDecalNumber || '',
        safetyPaperNumber: t.safetyPaperNumber || '',
        lastInspectionShop: t.lastInspectionShop || '',
        lastInspectionInvoice: t.lastInspectionInvoice || '',
      });
      row.alignment = { vertical: 'middle' };
    });

    sheet.eachRow((row, i) => {
      if (i > 1) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFF0F9FF' : 'FFFFFFFF' } };
      row.eachCell(cell => { cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } }; });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Trailers-${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleConfirmDelete = () => {
    if (selectedTrailer) {
      setTrailers(trailers.filter(trailer => trailer._id !== selectedTrailer._id));
      setShowDeleteModal(false);
      setSelectedTrailer(null);
    }
  };

  const trailerTypes: TrailerType[] = [
    'Reefer Trailer',
    'Tri-Axle Trailer',
    'Dry Van',
    'Flatbed',
    'Step Deck',
    'Lowboy',
    'Tank Trailer',
    'Dump Trailer'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-blue-50/30 p-6 border-green-700">
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
                  Trailers
                </h1>
                <p className="text-secondary mt-1 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Manage trailer fleet and safety compliance records
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportTrailers}
                title="Export to Excel"
                className="w-10 h-10 bg-green-600 !text-white rounded-lg flex items-center justify-center hover:bg-green-700 transition-colors shadow-md"
              >
                <FileDown className="w-5 h-5" />
              </button>
              <button
                onClick={handleAddTrailer}
                className="flex items-center gap-2 px-6 py-3 text-white rounded-lg shadow-lg transition-all duration-200 font-medium hover:opacity-90"
                style={{ background: 'linear-gradient(to right, #016ab2, #063f6f)' }}
              >
                <Plus className="w-5 h-5" />
                Add Trailer
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-card rounded-xl shadow-lg border border-theme p-6 mb-6">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" />
            <input
              type="text"
              placeholder="Search by unit number, plate, make, model, or VIN..."
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
        <div className="bg-card rounded-xl shadow-lg border border-theme overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="text-white" style={{ background: 'linear-gradient(to right, #016ab2, #063f6f)' }}>
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Unit No.</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Plate Number</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">VIN Number</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Make/Model</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Type</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Capacity</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Year</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold min-w-[180px]">Safety Expiry</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme divide-white/5">
                {filteredTrailers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-secondary">
                      No trailers found
                    </td>
                  </tr>
                ) : (
                  filteredTrailers.map((trailer) => {
                    const compliance = getComplianceStatus(trailer.safetyExpiryDate);
                    return (
                      <tr key={trailer._id} className={`hover:bg-[rgba(255,255,255,0.03)] transition-colors ${compliance.status === 'expired' ? 'bg-card' :
                        compliance.status === 'expiring-soon' ? 'bg-card' : ''
                        }`}>
                        <td className="px-6 py-4 font-medium text-primary">{trailer.internalId}</td>
                        <td className="px-6 py-4 text-primary">{trailer.plateNumber}</td>
                        <td className="px-6 py-4 text-secondary font-mono text-sm">{trailer.vinNumber}</td>
                        <td className="px-6 py-4 text-primary">{trailer.make} {trailer.model}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            {trailer.trailerType}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-primary">{trailer.capacity}</td>
                        <td className="px-6 py-4 text-primary">{trailer.year}</td>
                        <td className="px-6 py-4 min-w-[180px]">
                          {trailer.safetyExpiryDate ? (
                            <div className="flex flex-col gap-2">
                              <span className="text-sm font-semibold text-primary whitespace-nowrap">
                                {formatDate(trailer.safetyExpiryDate)}
                              </span>
                              <span className={`px-4 py-1.5 rounded-full text-xs font-semibold inline-block whitespace-nowrap ${compliance.status === 'expired'
                                ? "bg-red-100 text-red-700 border border-red-200"
                                : compliance.status === 'expiring-soon'
                                  ? "bg-yellow-100 text-yellow-700 border border-yellow-200"
                                  : "bg-green-100 text-green-700 border border-green-200"
                                }`}>
                                {compliance.text}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-secondary">Not Set</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${trailer.status === 'available' ? 'bg-green-100 text-green-800' :
                            trailer.status === 'in-use' ? 'bg-blue-100 text-blue-800' :
                              trailer.status === 'maintenance' ? 'bg-red-100 text-red-800' :
                                'bg-card text-primary'
                            }`}>
                            {trailer.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditTrailer(trailer)}
                              className="p-2 text-[#00D1FF] hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleSafetyRecord(trailer)}
                              className="p-2 rounded-lg transition-colors"
                              style={{ color: '#016ab2' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(1, 106, 178, 0.1)'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                              title="Safety Record"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTrailer(trailer)}
                              className="p-2 text-[#A855F7] hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
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
              setSelectedTrailer(null);
            }} />
            <div className="fixed top-0 right-0 h-full w-full sm:w-[90vw] lg:w-[80vw] xl:w-[70vw] bg-card shadow-2xl transform transition-transform duration-500 ease-out z-[101] border-l border-theme">
              <div className="h-full flex flex-col">
                <div className="flex-shrink-0 px-6 py-4 flex items-center justify-between text-white" style={{ background: 'linear-gradient(to right, #016ab2, #063f6f)' }}>
                  <h2 className="text-2xl font-bold">{showAddModal ? 'Add New Trailer' : 'Edit Trailer'}</h2>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                      setSelectedTrailer(null);
                    }}
                    className="p-2 hover:bg-card/20 rounded-lg transition-colors"
                  >
                    <FaTimes className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Unit No. (Internal ID) *</label>
                      <input
                        type="text"
                        value={formData.internalId}
                        onChange={(e) => setFormData({ ...formData, internalId: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                        placeholder="e.g., BRV001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Trailer Name *</label>
                      <input
                        type="text"
                        value={formData.trailer}
                        onChange={(e) => setFormData({ ...formData, trailer: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                        placeholder="e.g., Reefer Unit 001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Plate Number *</label>
                      <input
                        type="text"
                        value={formData.plateNumber}
                        onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                        placeholder="e.g., TRL-001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">VIN Number *</label>
                      <input
                        type="text"
                        value={formData.vinNumber}
                        onChange={(e) => setFormData({ ...formData, vinNumber: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent font-mono"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                        placeholder="17-character VIN"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Trailer Type *</label>
                      <select
                        value={formData.trailerType}
                        onChange={(e) => setFormData({ ...formData, trailerType: e.target.value as TrailerType })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                      >
                        {trailerTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Capacity</label>
                      <input
                        type="text"
                        value={formData.capacity}
                        onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                        placeholder="e.g., 53 ft"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Make *</label>
                      <input
                        type="text"
                        value={formData.make}
                        onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                        placeholder="e.g., Utility"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Model *</label>
                      <input
                        type="text"
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                        placeholder="e.g., 4000R"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Year *</label>
                      <input
                        type="number"
                        value={formData.year || ''}
                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                        min="1900"
                        max={new Date().getFullYear() + 1}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Odometer (km)</label>
                      <input
                        type="number"
                        value={formData.odometer}
                        onChange={(e) => setFormData({ ...formData, odometer: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                      >
                        <option value="available">Available</option>
                        <option value="in-use">In Use</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="idle">Idle</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Operation Status</label>
                      <select
                        value={formData.operationStatus}
                        onChange={(e) => setFormData({ ...formData, operationStatus: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                      >
                        <option value="available">Available</option>
                        <option value="in-transit">In Transit</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="idle">Idle</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 bg-card px-6 py-4 flex justify-end gap-3 border-t">
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                      setSelectedTrailer(null);
                    }}
                    className="px-6 py-2 border border-theme rounded-lg text-primary hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveTrailer}
                    className="px-6 py-2 text-white rounded-lg transition-colors hover:opacity-90"
                    style={{ background: 'linear-gradient(to right, #016ab2, #063f6f)' }}
                  >
                    {showAddModal ? 'Add Trailer' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Safety Record Sidebar */}
        {showSafetyModal && selectedTrailer && (
          <>
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] transition-all duration-500" onClick={() => {
              setShowSafetyModal(false);
              setSelectedTrailer(null);
            }} />
            <div className="fixed top-0 right-0 h-full w-full sm:w-[90vw] lg:w-[80vw] xl:w-[70vw] bg-card shadow-2xl transform transition-transform duration-500 ease-out z-[101] border-l border-theme">
              <div className="h-full flex flex-col">
                <div className="flex-shrink-0 px-6 py-4 flex items-center justify-between text-white" style={{ background: 'linear-gradient(to right, #016ab2, #063f6f)' }}>
                  <div>
                    <h2 className="text-2xl font-bold">Safety Compliance Record</h2>
                    <p className="text-sm mt-1 opacity-90">
                      {selectedTrailer.internalId} - {selectedTrailer.make} {selectedTrailer.model} ({selectedTrailer.trailerType})
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowSafetyModal(false);
                      setSelectedTrailer(null);
                    }}
                    className="p-2 hover:bg-card/20 rounded-lg transition-colors"
                  >
                    <FaTimes className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Safety Expiry Date *</label>
                      <input
                        type="date"
                        value={safetyForm.safetyExpiryDate}
                        onChange={(e) => setSafetyForm({ ...safetyForm, safetyExpiryDate: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Safety Decal Number</label>
                      <input
                        type="text"
                        value={safetyForm.safetyDecalNumber}
                        onChange={(e) => setSafetyForm({ ...safetyForm, safetyDecalNumber: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                        placeholder="SD-2024-BRV001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Safety Paper Number</label>
                      <input
                        type="text"
                        value={safetyForm.safetyPaperNumber}
                        onChange={(e) => setSafetyForm({ ...safetyForm, safetyPaperNumber: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                        placeholder="SP-2024-BRV001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Shop Name</label>
                      <input
                        type="text"
                        value={safetyForm.lastInspectionShop}
                        onChange={(e) => setSafetyForm({ ...safetyForm, lastInspectionShop: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                        placeholder="Name of inspection shop"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Invoice Number</label>
                      <input
                        type="text"
                        value={safetyForm.lastInspectionInvoice}
                        onChange={(e) => setSafetyForm({ ...safetyForm, lastInspectionInvoice: e.target.value })}
                        className="w-full px-4 py-2 border border-theme rounded-lg focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': '#016ab2' } as React.CSSProperties & { '--tw-ring-color': string }}
                        onFocus={(e) => { e.target.style.borderColor = '#016ab2'; e.target.style.boxShadow = '0 0 0 2px rgba(1, 106, 178, 0.2)'; }}
                        onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                        placeholder="INV-SAF-2024-001"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 bg-card px-6 py-4 flex justify-end gap-3 border-t">
                  <button
                    onClick={() => {
                      setShowSafetyModal(false);
                      setSelectedTrailer(null);
                    }}
                    className="px-6 py-2 border border-theme rounded-lg text-primary hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveSafety}
                    className="px-6 py-2 text-white rounded-lg transition-colors hover:opacity-90"
                    style={{ background: 'linear-gradient(to right, #016ab2, #063f6f)' }}
                  >
                    Save Safety Record
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedTrailer && (
          <>
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[9998]" onClick={() => setShowDeleteModal(false)} />
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-card rounded-xl shadow-2xl z-[9999] w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <FaExclamationCircle className="text-[#A855F7]" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-primary">Delete Trailer</h3>
                    <p className="text-sm text-secondary">This action cannot be undone</p>
                  </div>
                </div>
                <p className="text-primary mb-6">
                  Are you sure you want to delete trailer <strong>{selectedTrailer.internalId}</strong> ({selectedTrailer.make} {selectedTrailer.model})?
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

export default Trailers;
