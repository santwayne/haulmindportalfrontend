import { useState, useEffect } from 'react';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaTimes,
  FaCheckCircle,
  FaExclamationCircle,
  FaSearch,
  FaWarehouse
} from 'react-icons/fa';
import {
  getAllYards,
  createYard,
  updateYard,
  deleteYard,
  type Yard,
  type CreateYardData
} from '../../../../axios/api/fleet.yards';
import AddressSearch from '../../../../components/common/AddressSearch';
import ConfirmationModal from '../../../../components/common/ConfirmationModal';

type NotificationType = 'success' | 'error' | 'info';

interface Notification {
  id: number;
  type: NotificationType;
  message: string;
}

const YardManagement = () => {
  const [yards, setYards] = useState<Yard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingYard, setEditingYard] = useState<Yard | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [formData, setFormData] = useState<CreateYardData>({
    yardName: '',
    yardCode: '',
    yardType: 'parking',
    status: 'active',
    address: '',
    unit: '',
    city: '',
    stateProvince: '',
    country: '',
    zipPostalCode: ''
  });

  // Delete confirmation modal state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState<string>('');

  const yardTypes = ['parking', 'drop yard', 'terminal', 'maintenance', 'warehouse'];
  const statusOptions = ['active', 'inactive'];

  useEffect(() => {
    fetchYards();
  }, []);

  const fetchYards = async () => {
    try {
      setLoading(true);
      const response = await getAllYards();
      if (response.success) {
        setYards(response.data || []);
      } else {
        addNotification('error', 'Failed to fetch yards');
      }
    } catch (error: any) {
      addNotification('error', error.message || 'Failed to fetch yards');
    } finally {
      setLoading(false);
    }
  };

  const addNotification = (type: NotificationType, message: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const handleOpenModal = (yard?: Yard) => {
    if (yard) {
      setEditingYard(yard);
      setFormData({
        yardName: yard.yardName,
        yardCode: yard.yardCode,
        yardType: yard.yardType,
        status: yard.status,
        address: yard.address || '',
        unit: yard.unit || '',
        city: yard.city || '',
        stateProvince: yard.stateProvince || '',
        country: yard.country || '',
        zipPostalCode: yard.zipPostalCode || ''
      });
    } else {
      setEditingYard(null);
      setFormData({
        yardName: '',
        yardCode: '',
        yardType: 'parking',
        status: 'active',
        address: '',
        unit: '',
        city: '',
        stateProvince: '',
        country: '',
        zipPostalCode: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingYard(null);
    setFormData({
      yardName: '',
      yardCode: '',
      yardType: 'parking',
      status: 'active',
      address: '',
      unit: '',
      city: '',
      stateProvince: '',
      country: '',
      zipPostalCode: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.yardName.trim() || !formData.yardCode.trim()) {
      addNotification('error', 'Yard name and code are required');
      return;
    }

    // Validate address fields
    if (!formData.address.trim() || !formData.city.trim() || !formData.stateProvince.trim() ||
      !formData.country.trim() || !formData.zipPostalCode.trim()) {
      addNotification('error', 'All address fields are required');
      return;
    }

    try {
      let response;
      if (editingYard) {
        response = await updateYard(editingYard._id!, formData);
      } else {
        response = await createYard(formData);
      }

      if (response.success) {
        addNotification('success', response.message || `Yard ${editingYard ? 'updated' : 'created'} successfully`);
        handleCloseModal();
        fetchYards();
      } else {
        addNotification('error', response.message || `Failed to ${editingYard ? 'update' : 'create'} yard`);
      }
    } catch (error: any) {
      addNotification('error', error.message || `Failed to ${editingYard ? 'update' : 'create'} yard`);
    }
  };

  // Show delete confirmation modal
  const handleDeleteClick = (id: string, yardName: string) => {
    setDeleteTargetId(id);
    setDeleteTargetName(yardName);
    setShowDeleteConfirmation(true);
  };

  // Handle actual deletion after confirmation
  const handleDelete = async () => {
    if (!deleteTargetId) return;

    setShowDeleteConfirmation(false);

    try {
      const response = await deleteYard(deleteTargetId);
      if (response.success) {
        addNotification('success', response.message || 'Yard deleted successfully');
        fetchYards();
      } else {
        addNotification('error', response.message || 'Failed to delete yard');
      }
    } catch (error: any) {
      addNotification('error', error.message || 'Failed to delete yard');
    } finally {
      setDeleteTargetId(null);
      setDeleteTargetName('');
    }
  };

  const filteredYards = yards.filter(yard =>
    yard.yardName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    yard.yardCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    yard.yardType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-main p-6">
      <div className="w-full mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-headings flex items-center gap-3">
                <FaWarehouse className="text-[var(--accent-navyblue)]" />
                Yard Management
              </h1>
              <p className="text-secondary mt-2">Manage fleet yards and locations</p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="px-4 py-2 bg-[var(--accent-navyblue)] !text-white rounded-lg hover:bg-[#3598c7] transition-colors flex items-center gap-2"
            >
              <FaPlus /> Add Yard
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" />
            <input
              type="text"
              placeholder="Search by name, code, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
            />
          </div>
        </div>

        {/* Notifications */}
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] ${notification.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : notification.type === 'error'
                  ? 'bg-card border border-red-200 text-red-800'
                  : 'bg-card border border-blue-200 text-blue-800'
                }`}
            >
              {notification.type === 'success' ? (
                <FaCheckCircle />
              ) : notification.type === 'error' ? (
                <FaExclamationCircle />
              ) : (
                <FaExclamationCircle />
              )}
              <span>{notification.message}</span>
            </div>
          ))}
        </div>

        {/* Yards Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-blue)]"></div>
            <p className="mt-2 text-secondary">Loading yards...</p>
          </div>
        ) : filteredYards.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-lg border border-theme">
            <FaWarehouse className="mx-auto text-secondary text-4xl mb-4" />
            <p className="text-secondary">No yards found</p>
            {searchTerm && (
              <p className="text-sm text-secondary mt-2">Try adjusting your search</p>
            )}
          </div>
        ) : (
          <div className="bg-card rounded-lg shadow-sm border border-theme overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-card">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Yard ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Yard Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Yard Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Created At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Updated At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-theme">
                  {filteredYards.map((yard) => (
                    <tr key={yard._id} className="hover:bg-[rgba(255,255,255,0.03)]" onClick={() => handleOpenModal(yard)}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-headings">
                        {yard.yardId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-headings">
                        {yard.yardName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                        {yard.yardCode}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary capitalize">
                        {yard.yardType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${yard.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                            }`}
                        >
                          {yard.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                        {yard.createdAt
                          ? new Date(yard.createdAt).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                        {yard.updatedAt
                          ? new Date(yard.updatedAt).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleOpenModal(yard)}
                            className="text-[var(--accent-blue)] hover:text-[#3598c7]"
                            title="Edit"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(yard._id!, yard.yardName);
                            }}
                            className="text-[#A855F7] hover:text-red-800"
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-card/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-theme flex-shrink-0">
                <h2 className="text-xl font-bold text-headings">
                  {editingYard ? 'Edit Yard' : 'Add New Yard'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-secondary hover:text-secondary"
                >
                  <FaTimes />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">
                      Yard Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.yardName}
                      onChange={(e) => setFormData({ ...formData, yardName: e.target.value })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                      placeholder="Enter yard name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">
                      Yard Code / Short Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.yardCode}
                      onChange={(e) => setFormData({ ...formData, yardCode: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                      placeholder="Enter yard code"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">
                      Yard Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.yardType}
                      onChange={(e) => setFormData({ ...formData, yardType: e.target.value as any })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                    >
                      {yardTypes.map(type => (
                        <option className='form-option' key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-headings mb-1">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                    >
                      {statusOptions.map(status => (
                        <option className='form-option' key={status} value={status}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Address Section */}
                  <div className="pt-4 border-t border-theme">
                    <h3 className="text-sm font-semibold text-headings mb-4">Address Information</h3>

                    <div className="mb-4">
                      <AddressSearch
                        label="Search Address"
                        placeholder="Search For An Address..."
                        onAddressSelect={(addressData) => {
                          // Populate address fields
                          setFormData({
                            ...formData,
                            address: addressData.address || '',
                            city: addressData.city || '',
                            stateProvince: addressData.state || '',
                            country: addressData.country || '',
                            zipPostalCode: addressData.postalCode || ''
                          });
                        }}
                        className=""
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-headings mb-1">
                        Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                        placeholder="Enter street address"
                      />
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-headings mb-1">
                        Unit / Lot
                      </label>
                      <input
                        type="text"
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                        placeholder="Enter unit or lot number"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-headings mb-1">
                          City <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                          placeholder="Enter city"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-headings mb-1">
                          State / Province <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.stateProvince}
                          onChange={(e) => setFormData({ ...formData, stateProvince: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                          placeholder="Enter state/province"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-headings mb-1">
                          Country <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.country}
                          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                          placeholder="Enter country"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-headings mb-1">
                          ZIP / Postal Code <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.zipPostalCode}
                          onChange={(e) => setFormData({ ...formData, zipPostalCode: e.target.value })}
                          className="w-full px-3 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                          placeholder="Enter ZIP/postal code"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-theme flex-shrink-0">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 text-headings bg-card rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[var(--accent-navyblue)] !text-white rounded-lg hover:bg-[#3598c7] transition-colors"
                  >
                    {editingYard ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteConfirmation}
          onClose={() => {
            setShowDeleteConfirmation(false);
            setDeleteTargetId(null);
            setDeleteTargetName('');
          }}
          onConfirm={handleDelete}
          title="Confirm Yard Deletion"
          message={`Are you sure you want to delete "${deleteTargetName}"? This action cannot be undone and will permanently remove all yard data. Any trucks or trailers assigned to this yard will need to be reassigned.`}
          confirmText="Delete Yard"
          type="danger"
          isLoading={false}
        />
      </div>
    </div>
  );
};

export default YardManagement;

