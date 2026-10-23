import { useState } from 'react';
import type { FC } from "react";
import { X, Plus, Upload, ChevronDown, ChevronUp, User } from 'lucide-react';

interface NewDriverSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}
type Section = "userAccount" | "driverDetails" | "location" | "avatar";

const NewDriverSidebar: FC<NewDriverSidebarProps> = ({ isOpen, onClose }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPermissions, setSelectedPermissions] = useState([]);
    const [coordinatesType, setCoordinatesType] = useState('manual');
    const [collapsedSections, setCollapsedSections] = useState({
        userAccount: false,
        driverDetails: false,
        location: false,
        avatar: false
    });

    const [formData, setFormData] = useState({
        userAccount: '',
        internalId: '',
        driverLicense: '',
        vendor: '',
        vehicle: '',
        city: '',
        country: '',
        status: 'Active',
        latitude: '',
        longitude: '',
        avatar: '',
        // User fields (read-only when selected)
        selectedUserName: '',
        selectedUserEmail: '',
        selectedUserPhone: '',
        // User creation fields
        name: '',
        email: '',
        phone: '',
        userCountry: '',
        role: '',
        attachPolicies: ''
    });

    // Mock user data
    const users = [
        {
            id: 'user1',
            name: 'John Doe',
            email: 'john@example.com',
            phone: '+91 9876543210'
        },
        {
            id: 'user2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            phone: '+91 9876543211'
        },
        {
            id: 'user3',
            name: 'Mike Johnson',
            email: 'mike@example.com',
            phone: '+91 9876543212'
        }
    ];



    const toggleSection = (section: Section) => {
        setCollapsedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const handleUserAccountChange = (userId: string) => {
        const selectedUser = users.find(user => user.id === userId);
        if (selectedUser) {
            setFormData({
                ...formData,
                userAccount: userId,
                selectedUserName: selectedUser.name,
                selectedUserEmail: selectedUser.email,
                selectedUserPhone: selectedUser.phone
            });
        } else {
            setFormData({
                ...formData,
                userAccount: '',
                selectedUserName: '',
                selectedUserEmail: '',
                selectedUserPhone: ''
            });
        }
    };

    const handleCreateUser = () => {
        console.log('Creating user:', formData, 'Permissions:', selectedPermissions);
        setIsModalOpen(false);
        // Reset form
        setFormData({
            userAccount: '',
            internalId: '',
            driverLicense: '',
            vendor: '',
            vehicle: '',
            city: '',
            country: '',
            status: 'Active',
            latitude: '',
            longitude: '',
            avatar: '',
            selectedUserName: '',
            selectedUserEmail: '',
            selectedUserPhone: '',
            name: '',
            email: '',
            phone: '',
            userCountry: '',
            role: '',
            attachPolicies: ''
        });
        setSelectedPermissions([]);
    };

    const handleCreateDriver = () => {
        console.log('Creating driver:', formData);
        onClose();
        // Reset form
        setFormData({
            userAccount: '',
            internalId: '',
            driverLicense: '',
            vendor: '',
            vehicle: '',
            city: '',
            country: '',
            status: 'Active',
            latitude: '',
            longitude: '',
            avatar: '',
            selectedUserName: '',
            selectedUserEmail: '',
            selectedUserPhone: '',
            name: '',
            email: '',
            phone: '',
            userCountry: '',
            role: '',
            attachPolicies: ''
        });
    };



    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100]" onClick={onClose}></div>

            {/* Sidebar */}
            <div className="fixed right-0 top-0 h-full w-126 bg-card border-l border-theme shadow-lg z-[101] flex flex-col">
                <div className="p-4 border-b border-theme flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-primary">New Driver</h2>
                        <button onClick={onClose} className="text-secondary hover:text-secondary">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
                    {/* User Account Section */}
                    <div>
                        <div className="flex items-center justify-between mb-3 bg-card p-3 rounded-md">
                            <h3 className="text-sm font-medium text-primary">User Account</h3>
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="text-xs bg-blue-600 !text-white px-2 py-1 rounded hover:bg-blue-700 flex items-center space-x-1"
                                >
                                    <Plus className="w-3 h-3" />
                                    <span>New User</span>
                                </button>
                                <button onClick={() => toggleSection('userAccount')}>
                                    {collapsedSections.userAccount ?
                                        <ChevronUp className="w-4 h-4 text-secondary" /> :
                                        <ChevronDown className="w-4 h-4 text-secondary" />
                                    }
                                </button>
                            </div>
                        </div>

                        {!collapsedSections.userAccount && (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs text-secondary mb-1">User Account</label>
                                    <select
                                        className="w-full px-3 py-2 border border-theme rounded-md text-sm bg-card"
                                        value={formData.userAccount}
                                        onChange={(e) => handleUserAccountChange(e.target.value)}
                                    >
                                        <option value="">Select Account...</option>
                                        {users.map(user => (
                                            <option key={user.id} value={user.id}>
                                                {user.name} - {user.email} - {user.phone}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Auto-filled read-only fields */}
                                {formData.userAccount && (
                                    <div className="space-y-3 bg-card p-3 rounded-md">
                                        <div>
                                            <label className="block text-xs text-secondary mb-1">Name</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-theme rounded-md text-sm bg-card"
                                                value={formData.selectedUserName}
                                                readOnly
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-secondary mb-1">Email</label>
                                            <input
                                                type="email"
                                                className="w-full px-3 py-2 border border-theme rounded-md text-sm bg-card"
                                                value={formData.selectedUserEmail}
                                                readOnly
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-secondary mb-1">Phone</label>
                                            <input
                                                type="tel"
                                                className="w-full px-3 py-2 border border-theme rounded-md text-sm bg-card"
                                                value={formData.selectedUserPhone}
                                                readOnly
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Driver Details Section */}
                    <div>
                        <div className="flex items-center justify-between mb-3 bg-card p-3 rounded-md">
                            <h3 className="text-sm font-medium text-primary">Driver Details</h3>
                            <button onClick={() => toggleSection('driverDetails')}>
                                {collapsedSections.driverDetails ? (
                                    <ChevronUp className="w-4 h-4 text-secondary" />
                                ) : (
                                    <ChevronDown className="w-4 h-4 text-secondary" />
                                )}
                            </button>
                        </div>

                        {!collapsedSections.driverDetails && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-secondary mb-1">Internal ID</label>
                                        <input
                                            type="text"
                                            placeholder="Enter Internal ID"
                                            className="w-full px-3 py-2 border border-theme rounded-md text-sm"
                                            value={formData.internalId}
                                            onChange={(e) => setFormData({ ...formData, internalId: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-secondary mb-1">Driver License</label>
                                        <input
                                            type="text"
                                            placeholder="Enter License"
                                            className="w-full px-3 py-2 border border-theme rounded-md text-sm"
                                            value={formData.driverLicense}
                                            onChange={(e) => setFormData({ ...formData, driverLicense: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-secondary mb-1">Vendor</label>
                                        <select
                                            className="w-full px-3 py-2 border border-theme rounded-md text-sm bg-card"
                                            value={formData.vendor}
                                            onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                                        >
                                            <option value="">Select Vendor</option>
                                            <option value="vendor-a">Vendor A</option>
                                            <option value="vendor-b">Vendor B</option>
                                            <option value="vendor-c">Vendor C</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-secondary mb-1">Vehicle</label>
                                        <select
                                            className="w-full px-3 py-2 border border-theme rounded-md text-sm bg-card"
                                            value={formData.vehicle}
                                            onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
                                        >
                                            <option value="">Select Vehicle</option>
                                            <option value="truck-001">Truck-001</option>
                                            <option value="van-001">Van-001</option>
                                            <option value="truck-002">Truck-002</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-secondary mb-1">City</label>
                                        <input
                                            type="text"
                                            placeholder="Enter City"
                                            className="w-full px-3 py-2 border border-theme rounded-md text-sm"
                                            value={formData.city}
                                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-secondary mb-1">Country</label>
                                        <select
                                            className="w-full px-3 py-2 border border-theme rounded-md text-sm bg-card"
                                            value={formData.country}
                                            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                        >
                                            <option value="">Select Country</option>
                                            <option value="india">India</option>
                                            <option value="usa">United States</option>
                                            <option value="canada">Canada</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs text-secondary mb-1">Status</label>
                                    <select
                                        className="w-full px-3 py-2 border border-theme rounded-md text-sm bg-card"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Location/Coordinates Section */}
                    <div>
                        <div className="flex items-center justify-between mb-3 bg-card p-3 rounded-md">
                            <h3 className="text-sm font-medium text-primary">Location</h3>
                            <button onClick={() => toggleSection('location')}>
                                {collapsedSections.location ?
                                    <ChevronUp className="w-4 h-4 text-secondary" /> :
                                    <ChevronDown className="w-4 h-4 text-secondary" />
                                }
                            </button>
                        </div>

                        {!collapsedSections.location && (
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs text-secondary mb-1">Location Input Method</label>
                                    <div className="flex space-x-2">
                                        <button
                                            type="button"
                                            onClick={() => setCoordinatesType('manual')}
                                            className={`px-3 py-1 text-xs !mr-2 rounded ${coordinatesType === 'manual'
                                                ? 'bg-blue-600 !text-white'
                                                : 'bg-card text-primary'
                                                }`}
                                        >
                                            Manual
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCoordinatesType('auto')}
                                            className={`px-3 py-1 text-xs rounded ${coordinatesType === 'auto'
                                                ? 'bg-blue-600 !text-white'
                                                : 'bg-card text-primary'
                                                }`}
                                        >
                                            Auto-detect
                                        </button>
                                    </div>
                                </div>

                                {coordinatesType === 'manual' && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-secondary mb-1">Latitude</label>
                                            <input
                                                type="text"
                                                placeholder="Enter Latitude"
                                                className="w-full px-3 py-2 border border-theme rounded-md text-sm"
                                                value={formData.latitude}
                                                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-secondary mb-1">Longitude</label>
                                            <input
                                                type="text"
                                                placeholder="Enter Longitude"
                                                className="w-full px-3 py-2 border border-theme rounded-md text-sm"
                                                value={formData.longitude}
                                                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}

                                {coordinatesType === 'auto' && (
                                    <div>
                                        <button className="w-full px-3 py-2 border border-theme rounded-md text-sm bg-card hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                                            Get Current Location
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Avatar Section */}
                    <div>
                        <div className="flex items-center justify-between mb-3 bg-card p-3 rounded-md">
                            <h3 className="text-sm font-medium text-primary">Avatar</h3>
                            <button onClick={() => toggleSection('avatar')}>
                                {collapsedSections.avatar ?
                                    <ChevronUp className="w-4 h-4 text-secondary" /> :
                                    <ChevronDown className="w-4 h-4 text-secondary" />
                                }
                            </button>
                        </div>

                        {!collapsedSections.avatar && (
                            <div className="text-center py-4">
                                <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-3 flex items-center justify-center">
                                    <User className="w-8 h-8 text-secondary" />
                                </div>
                                <p className="text-xs text-secondary mb-2">Select an image</p>
                                <button className="text-xs text-[#00D1FF] hover:text-blue-800">
                                    Upload Image
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Fixed Footer - Higher z-index */}
                <div className="p-4 border-t border-theme flex-shrink-0 bg-card sticky bottom-0 z-[102] shadow-lg">
                    <button
                        onClick={handleCreateDriver}
                        className="w-full bg-blue-600 !text-white py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                        Create Driver
                    </button>
                </div>
            </div>

            {/* User Creation Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-[200]">
                    <div className="bg-card rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b border-theme">
                            <h3 className="text-lg font-semibold text-primary">Create a new user</h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-secondary hover:text-secondary"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                            <div className="grid grid-cols-2 gap-6 mb-6">
                                {/* Left Column - Avatar */}
                                <div className="space-y-4">
                                    <div className="text-center">
                                        <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-3 flex items-center justify-center">
                                            <User className="w-12 h-12 text-secondary" />
                                        </div>
                                        <button className="flex items-center space-x-2 px-3 py-1 text-sm text-[#00D1FF] border border-blue-600 rounded-md hover:bg-blue-50 mx-auto">
                                            <Upload className="w-4 h-4" />
                                            <span>Upload new</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Right Column - Form Fields */}
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-primary mb-1">Name</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-theme rounded-md text-sm"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-primary mb-1">Email</label>
                                            <input
                                                type="email"
                                                className="w-full px-3 py-2 border border-theme rounded-md text-sm"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-primary mb-1">Phone</label>
                                            <input
                                                type="tel"
                                                placeholder="+91 9999999999"
                                                className="w-full px-3 py-2 border border-theme rounded-md text-sm"
                                                value={formData.phone}
                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-primary mb-1">Country</label>
                                            <select
                                                className="w-full px-3 py-2 border border-theme rounded-md text-sm bg-card"
                                                value={formData.userCountry}
                                                onChange={(e) => setFormData({ ...formData, userCountry: e.target.value })}
                                            >
                                                <option value="">Select Country</option>
                                                <option value="india">India</option>
                                                <option value="usa">United States</option>
                                                <option value="canada">Canada</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-primary mb-1">Role</label>
                                        <input
                                            type="text"
                                            placeholder="Role"
                                            className="w-full px-3 py-2 border border-theme rounded-md text-sm"
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-primary mb-1">Attach Policies</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-theme rounded-md text-sm"
                                            value={formData.attachPolicies}
                                            onChange={(e) => setFormData({ ...formData, attachPolicies: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Permissions Section */}
                            {/* <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-primary">Select Permissions</h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={selectAllPermissions}
                      className="text-xs text-[#00D1FF] hover:text-blue-800"
                    >
                      Select All
                    </button>
                    <span className="text-xs text-secondary">|</span>
                    <button
                      onClick={deselectAllPermissions}
                      className="text-xs text-[#A855F7] hover:text-red-800"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="border border-theme rounded-md">
                  <div className="bg-card px-4 py-2 border-b border-theme">
                    <div className="grid grid-cols-4 gap-4 text-xs font-medium text-primary uppercase">
                      <span>Permission</span>
                      <span>Description</span>
                      <span>Grant Access</span>
                      <span></span>
                    </div>
                  </div>
                  
                  {permissions.map((permission, index) => (
                    <div 
                      key={permission.id} 
                      className={`px-4 py-3 grid grid-cols-4 gap-4 items-center text-sm ${
                        index % 2 === 0 ? 'bg-card' : 'bg-card'
                      }`}
                    >
                      <span className="font-medium text-primary">{permission.name}</span>
                      <span className="text-secondary text-xs">{permission.description}</span>
                      <div>
                        <input
                          type="checkbox"
                          id={permission.id}
                          checked={selectedPermissions.includes(permission.id)}
                          onChange={() => togglePermission(permission.id)}
                          className="w-4 h-4 text-[#00D1FF] border-theme rounded focus:ring-blue-500"
                        />
                      </div>
                      <span></span>
                    </div>
                  ))}
                </div>
              </div> */}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end space-x-3 px-6 py-4 border-t border-theme bg-card">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium !mr-2 text-primary bg-card border border-theme rounded-md hover:bg-[rgba(255,255,255,0.03)]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateUser}
                                className="px-4 py-2 text-sm font-medium !text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                            >
                                Create User
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default NewDriverSidebar;