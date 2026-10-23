import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import type { FC } from "react";
import { FaCheckCircle, FaExclamationCircle, FaTimes } from 'react-icons/fa';
import { createtCustomer, updateCustomer } from '../../../../../axios/api/distapcher';

interface ToastNotification {
    id: number;
    type: 'success' | 'error';
    message: string;
}

const ToastNotification = ({ notification, onClose }: { notification: ToastNotification; onClose: (id: number) => void }) => {
    const icons = {
        success: <FaCheckCircle className="text-green-500" size={24} />,
        error: <FaExclamationCircle className="text-red-500" size={24} />,
    };

    const bgColors = {
        success: 'bg-green-50 border-green-200',
        error: 'bg-card border-red-200',
    };

    React.useEffect(() => {
        const timer = setTimeout(() => {
            onClose(notification.id);
        }, 5000);
        return () => clearTimeout(timer);
    }, [notification.id, onClose]);

    return (
        <div className={`flex items-start gap-3 p-4 rounded-lg border-2 shadow-lg ${bgColors[notification.type]} animate-slide-in`}>
            <div className="flex-shrink-0 mt-0.5">
                {icons[notification.type]}
            </div>
            <p className="flex-1 text-sm font-medium text-primary">{notification.message}</p>
            <button
                onClick={() => onClose(notification.id)}
                className="flex-shrink-0 text-secondary hover:text-secondary transition-colors"
            >
                <FaTimes size={16} />
            </button>
        </div>
    );
};

interface CustomerDetails {
    _id?: string;
    internalId?: string;
    name?: string;
    email?: string;
    phone?: string;
    country?: string;
    state?: string;
    city?: string;
    customerDetails?: {
        customerId?: string;
        emailPrimary?: string;
        emailSecondary?: string;
        trackingEmail?: string;
        taxId?: string;
        assignedSalesperson?: string;
        phonePrimary?: string;
        phoneSecondary?: string;
        contact?: string;
        address?: string;
        unit?: string;
        zipCode?: string;
        creditLimit?: string;
        creditTerm?: string;
        invoiceNet?: string;
        defaultQuickPayDiscount?: string;
        useFactoringCompany?: boolean;
        csaFastApproved?: boolean;
        softBlock?: boolean;
        hardBlock?: boolean;
    };
}

interface NewCustomerSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    mode?: 'create' | 'edit';
    customer?: CustomerDetails | null;
    onSaved?: () => void;
}

const NewCustomerSidebar: FC<NewCustomerSidebarProps> = ({
    isOpen,
    onClose,
    mode = 'create',
    customer,
    onSaved
}) => {
    const [customerData, setCustomerData] = useState({
        // Basic Information
        customerId: '',
        customer: '',
        emailPrimary: '',
        emailSecondary: '',
        trackingEmail: '',
        taxId: '',
        assignedSalesperson: '',
        phonePrimary: '',
        phoneSecondary: '',
        contact: '',

        // Address
        address: '',
        city: '',
        unit: '',
        stateProvince: '',
        country: '',
        zipCode: '',

        // Finance
        creditLimit: '',
        creditTerm: '',
        invoiceNet: '',
        defaultQuickPayDiscount: '',
        useFactoringCompany: false,

        // Additional Settings
        csaFastApproved: false,
        softBlock: false,
        hardBlock: false,

        // Legacy fields for API compatibility
        name: '',
        email: '',
        phone: '',
        internalId: ''
    });

    const [isLoading, setIsLoading] = useState(false);
    const [notifications, setNotifications] = useState<ToastNotification[]>([]);
    const notificationIdRef = useRef(0);

    const showToast = (type: 'success' | 'error', message: string) => {
        const id = notificationIdRef.current++;
        setNotifications((prev) => [...prev, { id, type, message }]);
    };

    const removeNotification = (id: number) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        setCustomerData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
            // Map to legacy fields for API compatibility
            name: name === 'customer' ? value : prev.name,
            email: name === 'emailPrimary' ? value : prev.email,
            phone: name === 'phonePrimary' ? value : prev.phone,
            internalId: name === 'customerId' ? value : prev.internalId
        }));
    };

    // Prefill form when editing an existing customer
    useEffect(() => {
        if (mode === 'edit' && customer) {
            const details = customer.customerDetails || {};

            setCustomerData(prev => ({
                ...prev,
                customerId: details.customerId || customer.internalId || '',
                customer: customer.name || '',
                emailPrimary: details.emailPrimary || customer.email || '',
                emailSecondary: details.emailSecondary || '',
                trackingEmail: details.trackingEmail || '',
                taxId: details.taxId || '',
                assignedSalesperson: details.assignedSalesperson || '',
                phonePrimary: details.phonePrimary || customer.phone || '',
                phoneSecondary: details.phoneSecondary || '',
                contact: details.contact || '',
                address: details.address || '',
                city: customer.city || '',
                unit: details.unit || '',
                stateProvince: customer.state || '',
                country: customer.country || '',
                zipCode: details.zipCode || '',
                creditLimit: details.creditLimit || '',
                creditTerm: details.creditTerm || '',
                invoiceNet: details.invoiceNet || '',
                defaultQuickPayDiscount: details.defaultQuickPayDiscount || '',
                useFactoringCompany: !!details.useFactoringCompany,
                csaFastApproved: !!details.csaFastApproved,
                softBlock: !!details.softBlock,
                hardBlock: !!details.hardBlock,
                name: customer.name || '',
                email: customer.email || '',
                phone: customer.phone || '',
                internalId: customer.internalId || ''
            }));
        } else if (mode === 'create' && !customer && !isOpen) {
            // When closing create sidebar, ensure form is reset
            resetForm();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, customer, isOpen]);

    const handleSubmit = async () => {
        try {
            // Validation
            if (!customerData.customer.trim()) {
                showToast('error', 'Please enter customer name');
                return;
            }

            setIsLoading(true);

            // Prepare data for API (using legacy field names for compatibility)
            const apiData: any = {
                name: customerData.customer || customerData.name,
                email: customerData.emailPrimary || customerData.email,
                phone: customerData.phonePrimary || customerData.phone,
                internalId: customerData.customerId || customerData.internalId,
                country: customerData.country,
                state: customerData.stateProvince,
                city: customerData.city,
                // Additional fields can be added to API payload if backend supports them
                emailSecondary: customerData.emailSecondary,
                trackingEmail: customerData.trackingEmail,
                taxId: customerData.taxId,
                assignedSalesperson: customerData.assignedSalesperson,
                phoneSecondary: customerData.phoneSecondary,
                contact: customerData.contact,
                address: customerData.address,
                unit: customerData.unit,
                zipCode: customerData.zipCode,
                creditLimit: customerData.creditLimit,
                creditTerm: customerData.creditTerm,
                invoiceNet: customerData.invoiceNet,
                defaultQuickPayDiscount: customerData.defaultQuickPayDiscount,
                useFactoringCompany: customerData.useFactoringCompany,
                csaFastApproved: customerData.csaFastApproved,
                softBlock: customerData.softBlock,
                hardBlock: customerData.hardBlock,
            };

            let customerResponse;
            if (mode === 'edit' && customer?._id) {
                // Update existing customer
                customerResponse = await updateCustomer(customer._id, apiData);
            } else {
                // Create new customer
                customerResponse = await createtCustomer(apiData);
            }

            if (!customerResponse?.success) {
                showToast('error', customerResponse?.message || 'Error creating customer. Please try again.');
                setIsLoading(false);
                return;
            }

            showToast('success', customerResponse.message || (mode === 'edit' ? 'Customer updated successfully!' : 'Customer created successfully!'));

            if (onSaved) {
                onSaved();
            }

            if (mode === 'create') {
                resetForm();
            }

            setTimeout(() => {
                onClose();
            }, 800);
        } catch (error: any) {
            console.error('Error creating customer:', error);
            showToast('error', error?.message || 'Error creating customer. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setCustomerData({
            customerId: '',
            customer: '',
            emailPrimary: '',
            emailSecondary: '',
            trackingEmail: '',
            taxId: '',
            assignedSalesperson: '',
            phonePrimary: '',
            phoneSecondary: '',
            contact: '',
            address: '',
            city: '',
            unit: '',
            stateProvince: '',
            country: '',
            zipCode: '',
            creditLimit: '',
            creditTerm: '',
            invoiceNet: '',
            defaultQuickPayDiscount: '',
            useFactoringCompany: false,
            csaFastApproved: false,
            softBlock: false,
            hardBlock: false,
            name: '',
            email: '',
            phone: '',
            internalId: ''
        });
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Toast Notifications */}
            <div className="fixed top-4 right-4 z-[10000] space-y-2">
                {notifications.map((notification) => (
                    <ToastNotification
                        key={notification.id}
                        notification={notification}
                        onClose={removeNotification}
                    />
                ))}
            </div>

            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100]"
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        handleClose();
                    }
                }}
            ></div>

            {/* Sidebar */}
            <div
                className="fixed right-0 top-0 h-full w-[600px] bg-card border-l border-theme shadow-xl z-[101] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-theme flex-shrink-0">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-primary">New Customer</h2>
                        <button onClick={handleClose} className="text-secondary hover:text-secondary transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-6">
                        {/* Basic Information Section */}
                        <div>
                            <h3 className="text-lg font-semibold text-primary mb-4 pb-2 border-b border-theme">Basic Information</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">Customer ID</label>
                                    <input
                                        type="text"
                                        name="customerId"
                                        value={customerData.customerId}
                                        onChange={handleInputChange}
                                        placeholder="e.g., CUST001, ABC123"
                                        className="w-full px-4 py-2.5 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">Customer *</label>
                                    <input
                                        type="text"
                                        name="customer"
                                        value={customerData.customer}
                                        onChange={handleInputChange}
                                        placeholder="Customer/Company Name"
                                        className="w-full px-4 py-2.5 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">Email Address (Primary)</label>
                                    <input
                                        type="email"
                                        name="emailPrimary"
                                        value={customerData.emailPrimary}
                                        onChange={handleInputChange}
                                        placeholder="primary@example.com"
                                        className="w-full px-4 py-2.5 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">Email Address (Secondary)</label>
                                    <input
                                        type="email"
                                        name="emailSecondary"
                                        value={customerData.emailSecondary}
                                        onChange={handleInputChange}
                                        placeholder="secondary@example.com"
                                        className="w-full px-4 py-2.5 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">Tracking Email</label>
                                    <input
                                        type="email"
                                        name="trackingEmail"
                                        value={customerData.trackingEmail}
                                        onChange={handleInputChange}
                                        placeholder="tracking@example.com"
                                        className="w-full px-4 py-2.5 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">Tax ID or Business No.</label>
                                    <input
                                        type="text"
                                        name="taxId"
                                        value={customerData.taxId}
                                        onChange={handleInputChange}
                                        placeholder="Tax Identification Number"
                                        className="w-full px-4 py-2.5 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">Assigned Salesperson</label>
                                    <input
                                        type="text"
                                        name="assignedSalesperson"
                                        value={customerData.assignedSalesperson}
                                        onChange={handleInputChange}
                                        placeholder="Salesperson Name"
                                        className="w-full px-4 py-2.5 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-primary mb-1">Primary Phone #</label>
                                        <input
                                            type="text"
                                            name="phonePrimary"
                                            value={customerData.phonePrimary}
                                            onChange={handleInputChange}
                                            placeholder="Primary Phone"
                                            className="w-full px-4 py-2.5 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-primary mb-1">Secondary Phone #</label>
                                        <input
                                            type="text"
                                            name="phoneSecondary"
                                            value={customerData.phoneSecondary}
                                            onChange={handleInputChange}
                                            placeholder="Secondary Phone"
                                            className="w-full px-4 py-2.5 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">Contact</label>
                                    <input
                                        type="text"
                                        name="contact"
                                        value={customerData.contact}
                                        onChange={handleInputChange}
                                        placeholder="Primary Contact Name"
                                        className="w-full px-4 py-2.5 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Address Section */}
                        <div>
                            <h3 className="text-lg font-semibold text-primary mb-4 pb-2 border-b border-theme">Address</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">Address</label>
                                    <input
                                        type="text"
                                        name="address"
                                        value={customerData.address}
                                        onChange={handleInputChange}
                                        placeholder="Street Address"
                                        className="w-full px-4 py-2.5 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-primary mb-1">City</label>
                                        <input
                                            type="text"
                                            name="city"
                                            value={customerData.city}
                                            onChange={handleInputChange}
                                            placeholder="City"
                                            className="w-full px-4 py-2.5 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-primary mb-1">Unit</label>
                                        <input
                                            type="text"
                                            name="unit"
                                            value={customerData.unit}
                                            onChange={handleInputChange}
                                            placeholder="Unit Number"
                                            className="w-full px-4 py-2.5 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-primary mb-1">State/Province</label>
                                        <input
                                            type="text"
                                            name="stateProvince"
                                            value={customerData.stateProvince}
                                            onChange={handleInputChange}
                                            placeholder="State/Province"
                                            className="w-full px-4 py-2.5 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-primary mb-1">Country</label>
                                        <input
                                            type="text"
                                            name="country"
                                            value={customerData.country}
                                            onChange={handleInputChange}
                                            placeholder="Country"
                                            className="w-full px-4 py-2.5 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">ZIP Code</label>
                                    <input
                                        type="text"
                                        name="zipCode"
                                        value={customerData.zipCode}
                                        onChange={handleInputChange}
                                        placeholder="ZIP/Postal Code"
                                        className="w-full px-4 py-2.5 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Finance Section */}
                        <div>
                            <h3 className="text-lg font-semibold text-primary mb-4 pb-2 border-b border-theme">Finance</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">Credit Limit</label>
                                    <input
                                        type="number"
                                        name="creditLimit"
                                        value={customerData.creditLimit}
                                        onChange={handleInputChange}
                                        placeholder="Maximum Credit Amount"
                                        className="w-full px-4 py-2.5 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">Credit Term</label>
                                    <input
                                        type="number"
                                        name="creditTerm"
                                        value={customerData.creditTerm}
                                        onChange={handleInputChange}
                                        placeholder="Days (e.g., 30)"
                                        className="w-full px-4 py-2.5 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">Invoice Net</label>
                                    <input
                                        type="number"
                                        name="invoiceNet"
                                        value={customerData.invoiceNet}
                                        onChange={handleInputChange}
                                        placeholder="Percentage (e.g., 30)"
                                        className="w-full px-4 py-2.5 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">Default Quick Pay Discount (%)</label>
                                    <input
                                        type="number"
                                        name="defaultQuickPayDiscount"
                                        value={customerData.defaultQuickPayDiscount}
                                        onChange={handleInputChange}
                                        placeholder="Discount Percentage"
                                        step="0.01"
                                        className="w-full px-4 py-2.5 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    />
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        name="useFactoringCompany"
                                        id="useFactoringCompany"
                                        checked={customerData.useFactoringCompany}
                                        onChange={handleInputChange}
                                        className="w-4 h-4 text-[#00D1FF] border-theme rounded focus:ring-blue-500"
                                    />
                                    <label htmlFor="useFactoringCompany" className="ml-2 text-sm font-medium text-primary">
                                        Use Factoring Company
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Additional Settings Section */}
                        <div>
                            <h3 className="text-lg font-semibold text-primary mb-4 pb-2 border-b border-theme">Additional Settings</h3>
                            <div className="space-y-3">
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        name="csaFastApproved"
                                        id="csaFastApproved"
                                        checked={customerData.csaFastApproved}
                                        onChange={handleInputChange}
                                        className="w-4 h-4 text-[#00D1FF] border-theme rounded focus:ring-blue-500"
                                    />
                                    <label htmlFor="csaFastApproved" className="ml-2 text-sm font-medium text-primary">
                                        CSA/FAST Approved
                                    </label>
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        name="softBlock"
                                        id="softBlock"
                                        checked={customerData.softBlock}
                                        onChange={handleInputChange}
                                        className="w-4 h-4 text-[#00D1FF] border-theme rounded focus:ring-blue-500"
                                    />
                                    <label htmlFor="softBlock" className="ml-2 text-sm font-medium text-primary">
                                        Soft Block
                                    </label>
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        name="hardBlock"
                                        id="hardBlock"
                                        checked={customerData.hardBlock}
                                        onChange={handleInputChange}
                                        className="w-4 h-4 text-[#00D1FF] border-theme rounded focus:ring-blue-500"
                                    />
                                    <label htmlFor="hardBlock" className="ml-2 text-sm font-medium text-primary">
                                        Hard Block
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-theme flex justify-between items-center bg-card sticky bottom-0 z-[102]">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-5 py-2.5 border border-theme rounded-lg text-primary hover:bg-[rgba(255,255,255,0.03)] transition-colors font-medium"
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="px-5 py-2.5 rounded-lg !text-white transition-all font-medium"
                        style={{
                            background: 'var(--accent-navyblue)',
                        }}
                        disabled={isLoading || !customerData.customer.trim()}
                    >
                        {isLoading ? 'Creating...' : 'Create Customer'}
                    </button>
                </div>
            </div>
        </>
    );
};

export default NewCustomerSidebar;
