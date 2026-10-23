import React, { useState, useCallback } from "react";
import { Plus, Trash2, Edit, X, ChevronDown, Search } from "lucide-react";
import { FaCheckCircle, FaExclamationCircle, FaTimes } from "react-icons/fa";

type NotificationType = 'success' | 'error' | 'warning';

interface ToastNotification {
    id: number;
    type: NotificationType;
    message: string;
}

const ToastNotification = ({ notification, onClose }: { notification: ToastNotification; onClose: (id: number) => void }) => {
    const icons = {
        success: <FaCheckCircle className="text-green-500" size={22} />,
        error: <FaExclamationCircle className="text-red-500" size={22} />,
        warning: <FaExclamationCircle className="text-yellow-500" size={22} />,
    };

    const bgColors = {
        success: 'bg-green-50 border-green-200',
        error: 'bg-card border-red-200',
        warning: 'bg-card border-yellow-200',
    };

    React.useEffect(() => {
        const timer = setTimeout(() => {
            onClose(notification.id);
        }, 5000);
        return () => clearTimeout(timer);
    }, [notification.id, onClose]);

    return (
        <div className={`fixed top-4 right-4 flex items-start gap-3 p-3.5 rounded-lg border-2 shadow-lg z-[10000] ${bgColors[notification.type]} animate-slide-in min-w-[280px] max-w-[480px]`}>
            <div className="flex-shrink-0 mt-0.5">
                {icons[notification.type]}
            </div>
            <p className="flex-1 text-[13px] font-medium text-primary">{notification.message}</p>
            <button
                onClick={() => onClose(notification.id)}
                className="flex-shrink-0 text-secondary hover:text-secondary transition-colors"
            >
                <FaTimes size={15} />
            </button>
        </div>
    );
};

interface BulkOrderItem {
    id: string;
    company: string;
    customerName: string;
    customerId?: string;
    customerData?: any;
    commodity: string;
    loadType: string;
    pickupLocation: string;
    pickupLocationData?: any;
    pickupDate: string;
    deliveryLocation: string;
    deliveryLocationData?: any;
    deliveryDate: string;
    pickupRefNo: string;
    deliveryRefNo: string;
    amount: string;
    currency: string;
    customerOrderNo: string;
    taxBasedOn: string;
    tax1: boolean;
    tax1Percent: string;
    tax1Amount: string;
    totalTax: string;
    grossTotalFreight: string;
}

interface Place {
    _id: string;
    name?: string;
    city?: string;
    state?: string;
    currentLocation?: {
        address?: string;
        latitude?: string | number;
        longitude?: string | number;
    };
}

interface Customer {
    _id: string;
    name: string;
    address?: string;
    email?: string;
    phone?: string;
}

const NewBulkOrderSidebar = ({ order, onClose, onSave }: any) => {
    const [notifications, setNotifications] = useState<ToastNotification[]>([]);

    const [customers] = useState<Customer[]>([
        { _id: '1', name: 'ABC Corp', address: '123 Main St, Toronto', email: 'abc@corp.com', phone: '555-0100' },
        { _id: '2', name: 'XYZ Ltd', address: '456 King St, Vancouver', email: 'xyz@ltd.com', phone: '555-0200' }
    ]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerSearch, setCustomerSearch] = useState("");
    const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);

    const [pickupPlaces] = useState<Place[]>([
        { _id: '1', name: 'Warehouse A', city: 'Toronto', state: 'ON', currentLocation: { address: '100 Industrial Rd, Toronto, ON' } },
        { _id: '2', name: 'Distribution Center', city: 'Vancouver', state: 'BC', currentLocation: { address: '200 Marine Dr, Vancouver, BC' } }
    ]);
    const [selectedPickupPlace, setSelectedPickupPlace] = useState<Place | null>(null);
    const [pickupSearch, setPickupSearch] = useState("");
    const [pickupDropdownOpen, setPickupDropdownOpen] = useState(false);

    const [] = useState<Place[]>([
        { _id: '1', name: 'Warehouse A', city: 'Toronto', state: 'ON', currentLocation: { address: '100 Industrial Rd, Toronto, ON' } },
        { _id: '2', name: 'Distribution Center', city: 'Vancouver', state: 'BC', currentLocation: { address: '200 Marine Dr, Vancouver, BC' } }
    ]);
    const [selectedDeliveryPlace, setSelectedDeliveryPlace] = useState<Place | null>(null);
    const [, setDeliverySearch] = useState("");

    const [commodity, setCommodity] = useState("");
    const [loadType, setLoadType] = useState("FTL");
    const [pickupDate, setPickupDate] = useState(new Date().toISOString().split('T')[0]);
    const [pickupTime, setPickupTime] = useState("12:00");
    const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
    const [deliveryTime, setDeliveryTime] = useState("12:00");
    const [pickupRefNo, setPickupRefNo] = useState("");
    const [deliveryRefNo, setDeliveryRefNo] = useState("");
    const [valueOfGoods, setValueOfGoods] = useState("0.00");
    const [valueOfGoodsCurrency, setValueOfGoodsCurrency] = useState("CAD");
    const [customerOrderNo, setCustomerOrderNo] = useState("");
    const [taxBasedOn, setTaxBasedOn] = useState("Delivery");
    const [tax1, setTax1] = useState(false);
    const [tax1Percent, setTax1Percent] = useState("0.00");
    const [tax1Amount, setTax1Amount] = useState("0.00");
    const [totalTax, setTotalTax] = useState("0.00");
    const [grossTotalFreight, setGrossTotalFreight] = useState("0.00");

    const addNotification = useCallback((type: NotificationType, message: string) => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, type, message }]);
    }, []);

    const removeNotification = useCallback((id: number) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const filteredCustomers = customers.filter(customer =>
        (customer.name || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
        (customer.address || '').toLowerCase().includes(customerSearch.toLowerCase())
    );

    const filteredPickupPlaces = pickupPlaces.filter(place =>
        !pickupSearch ||
        (place.name || '').toLowerCase().includes(pickupSearch.toLowerCase()) ||
        (place.currentLocation?.address || '').toLowerCase().includes(pickupSearch.toLowerCase()) ||
        (place.city || '').toLowerCase().includes(pickupSearch.toLowerCase())
    );


    const handleSubmit = () => {
        if (!selectedCustomer) {
            addNotification('error', "Please select a customer");
            return;
        }
        if (!selectedPickupPlace) {
            addNotification('error', "Please select a pickup location");
            return;
        }
        if (!selectedDeliveryPlace) {
            addNotification('error', "Please select a delivery location");
            return;
        }
        if (!customerOrderNo) {
            addNotification('error', "Please enter customer order number");
            return;
        }
        if (!commodity) {
            addNotification('error', "Please enter commodity");
            return;
        }

        const orderData = {
            selectedCustomer,
            customerId: selectedCustomer._id,
            customerOrderNo,
            commodity,
            loadType,
            pickupLocation: {
                placeId: selectedPickupPlace._id,
                place: selectedPickupPlace.currentLocation?.address || selectedPickupPlace.name || "",
            },
            pickupDate,
            pickupTime,
            pickupRefNo,
            deliveryLocation: {
                placeId: selectedDeliveryPlace._id,
                place: selectedDeliveryPlace.currentLocation?.address || selectedDeliveryPlace.name || "",
            },
            deliveryDate,
            deliveryTime,
            deliveryRefNo,
            valueOfGoods,
            amount: valueOfGoods,
            valueOfGoodsCurrency,
            currency: valueOfGoodsCurrency,
            taxBasedOn,
            tax1,
            tax1Percent,
            tax1Amount,
            totalTax,
            grossTotalFreight,
        };
        onSave(orderData);
    };

    const handleReset = () => {
        setSelectedCustomer(null);
        setCustomerSearch("");
        setCommodity("");
        setLoadType("FTL");
        setSelectedPickupPlace(null);
        setPickupSearch("");
        setPickupDate(new Date().toISOString().split('T')[0]);
        setPickupTime("12:00");
        setSelectedDeliveryPlace(null);
        setDeliverySearch("");
        setDeliveryDate(new Date().toISOString().split('T')[0]);
        setDeliveryTime("12:00");
        setPickupRefNo("");
        setDeliveryRefNo("");
        setValueOfGoods("0.00");
        setValueOfGoodsCurrency("CAD");
        setCustomerOrderNo("");
        setTaxBasedOn("Delivery");
        setTax1(false);
        setTax1Percent("0.00");
        setTax1Amount("0.00");
        setTotalTax("0.00");
        setGrossTotalFreight("0.00");
    };

    return (
        <div className="min-h-screen flex flex-col bg-card">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-theme" style={{
                background: 'var(--accent-navyblue)'
            }}>
                <h2 className="text-base font-semibold text-white">
                    {order ? "Edit Order" : "New Order"}
                </h2>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-card/20 rounded-lg transition-colors"
                >
                    <X className="w-5 h-5 text-white" />
                </button>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="max-w-4xl mx-auto space-y-5">
                    {/* Row 1: Customer, Commodity, Load Type */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        <div className="md:col-span-1 relative">
                            <label className="block text-[13px] font-medium text-primary mb-1.5">
                                Customer Name <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div
                                    onClick={() => setCustomerDropdownOpen(!customerDropdownOpen)}
                                    className="flex items-center gap-1 p-2 border border-theme rounded-lg bg-card cursor-pointer hover:border-[var(--accent-blue)] focus-within:border-[var(--accent-blue)] focus-within:ring-1 focus-within:ring-[var(--accent-blue)]/30"
                                >
                                    <ChevronDown className={`w-3.5 h-3.5 text-secondary transition-transform flex-shrink-0 ${customerDropdownOpen ? 'rotate-180' : ''}`} />
                                    <input
                                        type="text"
                                        value={selectedCustomer ? `${selectedCustomer.name || ''} | ${selectedCustomer.address || selectedCustomer.email || ''}` : customerSearch}
                                        onChange={(e) => {
                                            setCustomerSearch(e.target.value);
                                            setCustomerDropdownOpen(true);
                                        }}
                                        onFocus={() => setCustomerDropdownOpen(true)}
                                        placeholder="Select customer"
                                        className="flex-1 outline-none text-[13px] min-w-0"
                                        readOnly={!!selectedCustomer}
                                    />
                                    {selectedCustomer && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedCustomer(null);
                                                setCustomerSearch("");
                                            }}
                                            className="p-1 hover:bg-[rgba(255,255,255,0.03)] rounded flex-shrink-0"
                                        >
                                            <X className="w-3.5 h-3.5 text-secondary" />
                                        </button>
                                    )}
                                </div>
                                {customerDropdownOpen && (
                                    <div className="absolute z-50 w-full mt-1 bg-card border border-theme rounded-lg shadow-lg max-h-60 overflow-hidden">
                                        <div className="p-2 border-b border-theme">
                                            <div className="relative">
                                                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-secondary" />
                                                <input
                                                    type="text"
                                                    value={customerSearch}
                                                    onChange={(e) => setCustomerSearch(e.target.value)}
                                                    placeholder="Search..."
                                                    className="w-full pl-7 pr-2 py-1.5 border border-theme rounded text-[13px] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]/30 focus:border-[var(--accent-blue)]"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        <div className="overflow-y-auto max-h-44">
                                            {filteredCustomers.length > 0 ? (
                                                filteredCustomers.map((customer) => (
                                                    <div
                                                        key={customer._id}
                                                        onClick={() => {
                                                            setSelectedCustomer(customer);
                                                            setCustomerSearch("");
                                                            setCustomerDropdownOpen(false);
                                                        }}
                                                        className={`px-3 py-2 cursor-pointer hover:bg-[var(--accent-blue)]/10 text-[13px] ${selectedCustomer?._id === customer._id ? 'bg-[var(--accent-blue)]/10' : ''
                                                            }`}
                                                    >
                                                        <div className="font-medium text-[#016ab2]">{customer.name || 'Unnamed Customer'}</div>
                                                        <div className="text-xs text-secondary">{customer.address || customer.email || customer.phone || ''}</div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="px-3 py-2 text-[13px] text-secondary">No customers found</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="md:col-span-1">
                            <label className="block text-[13px] font-medium text-primary mb-1.5">
                                Commodity <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={commodity}
                                onChange={(e) => setCommodity(e.target.value)}
                                placeholder="Enter commodity"
                                className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-1 focus:ring-[var(--accent-blue)]/30 focus:border-[var(--accent-blue)] text-[13px] bg-card"
                            />
                        </div>

                        <div className="md:col-span-1">
                            <label className="block text-[13px] font-medium text-primary mb-1.5">
                                Load Type
                            </label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setLoadType("FTL")}
                                    className={`flex-1 px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${loadType === "FTL"
                                        ? "!text-white shadow-md"
                                        : "bg-card text-primary hover:bg-gray-200"
                                        }`}
                                    style={loadType === "FTL" ? {
                                        background: 'var(--accent-navyblue)'
                                    } : {}}
                                >
                                    FTL
                                </button>
                                <button
                                    onClick={() => setLoadType("LTL")}
                                    className={`flex-1 px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${loadType === "LTL"
                                        ? "!text-white shadow-md"
                                        : "bg-card text-primary hover:bg-gray-200"
                                        }`}
                                    style={loadType === "LTL" ? {
                                        background: 'var(--accent-navyblue)'
                                    } : {}}
                                >
                                    LTL
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Pickup Location & Date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div className="relative">
                            <label className="block text-[13px] font-medium text-primary mb-1.5">
                                Pickup Location <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div
                                    onClick={() => setPickupDropdownOpen(!pickupDropdownOpen)}
                                    className="flex items-center gap-1 p-2 border border-theme rounded-lg bg-card cursor-pointer hover:border-[var(--accent-blue)] focus-within:border-[var(--accent-blue)] focus-within:ring-1 focus-within:ring-[var(--accent-blue)]/30"
                                >
                                    <ChevronDown className={`w-3.5 h-3.5 text-secondary transition-transform flex-shrink-0 ${pickupDropdownOpen ? 'rotate-180' : ''}`} />
                                    <input
                                        type="text"
                                        value={selectedPickupPlace ? `${selectedPickupPlace.name || ''} | ${selectedPickupPlace.currentLocation?.address || ''}` : pickupSearch}
                                        onChange={(e) => {
                                            setPickupSearch(e.target.value);
                                            setPickupDropdownOpen(true);
                                        }}
                                        onFocus={() => setPickupDropdownOpen(true)}
                                        placeholder="Search pickup location..."
                                        className="flex-1 outline-none text-[13px] min-w-0"
                                        readOnly={!!selectedPickupPlace}
                                    />
                                    {selectedPickupPlace && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedPickupPlace(null);
                                                setPickupSearch("");
                                            }}
                                            className="p-1 hover:bg-[rgba(255,255,255,0.03)] rounded flex-shrink-0"
                                        >
                                            <X className="w-3.5 h-3.5 text-secondary" />
                                        </button>
                                    )}
                                </div>
                                {pickupDropdownOpen && (
                                    <div className="absolute z-50 w-full mt-1 bg-card border border-theme rounded-lg shadow-lg max-h-60 overflow-hidden">
                                        <div className="p-2 border-b border-theme">
                                            <div className="relative">
                                                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-secondary" />
                                                <input
                                                    type="text"
                                                    value={pickupSearch}
                                                    onChange={(e) => setPickupSearch(e.target.value)}
                                                    placeholder="Search places..."
                                                    className="w-full pl-7 pr-2 py-1.5 border border-theme rounded text-[13px] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]/30 focus:border-[var(--accent-blue)]"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        <div className="overflow-y-auto max-h-44">
                                            {filteredPickupPlaces.length > 0 ? (
                                                filteredPickupPlaces.map((place) => (
                                                    <div
                                                        key={place._id}
                                                        onClick={() => {
                                                            setSelectedPickupPlace(place);
                                                            setPickupSearch("");
                                                            setPickupDropdownOpen(false);
                                                        }}
                                                        className={`px-3 py-2 cursor-pointer hover:bg-[var(--accent-blue)]/10 text-[13px] ${selectedPickupPlace?._id === place._id ? 'bg-[var(--accent-blue)]/10' : ''
                                                            }`}
                                                    >
                                                        <div className="font-medium text-[#016ab2]">{place.name || 'Unnamed Place'}</div>
                                                        <div className="text-xs text-secondary">{place.currentLocation?.address || `${place.city || ''}, ${place.state || ''}`}</div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="px-3 py-2 text-[13px] text-secondary">No places found</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[13px] font-medium text-primary mb-1.5">
                                Pickup Date <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="date"
                                    value={pickupDate}
                                    onChange={(e) => setPickupDate(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-theme rounded-lg focus:ring-1 focus:ring-[var(--accent-blue)]/30 focus:border-[var(--accent-blue)] text-[13px] bg-card"
                                />
                                <input
                                    type="time"
                                    value={deliveryTime}
                                    onChange={(e) => setDeliveryTime(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-theme rounded-lg focus:ring-1 focus:ring-[var(--accent-blue)]/30 focus:border-[var(--accent-blue)] text-[13px] bg-card"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Row 4: Reference Numbers & Amount */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
                        <div>
                            <label className="block text-[13px] font-medium text-primary mb-1.5">
                                Pickup Ref#
                            </label>
                            <input
                                type="text"
                                value={pickupRefNo}
                                onChange={(e) => setPickupRefNo(e.target.value)}
                                placeholder="Enter reference"
                                className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-1 focus:ring-[var(--accent-blue)]/30 focus:border-[var(--accent-blue)] text-[13px] bg-card"
                            />
                        </div>

                        <div>
                            <label className="block text-[13px] font-medium text-primary mb-1.5">
                                Delivery Ref#
                            </label>
                            <input
                                type="text"
                                value={deliveryRefNo}
                                onChange={(e) => setDeliveryRefNo(e.target.value)}
                                placeholder="Enter reference"
                                className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-1 focus:ring-[var(--accent-blue)]/30 focus:border-[var(--accent-blue)] text-[13px] bg-card"
                            />
                        </div>

                        <div>
                            <label className="block text-[13px] font-medium text-primary mb-1.5">
                                Amount
                            </label>
                            <div className="flex gap-2">
                                <select
                                    value={valueOfGoodsCurrency}
                                    onChange={(e) => setValueOfGoodsCurrency(e.target.value)}
                                    className="w-20 px-2 py-2 border border-theme rounded-lg focus:ring-1 focus:ring-[var(--accent-blue)]/30 focus:border-[var(--accent-blue)] text-[13px] bg-card"
                                >
                                    <option>CAD</option>
                                    <option>USD</option>
                                    <option>INR</option>
                                </select>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={valueOfGoods}
                                    onChange={(e) => {
                                        setValueOfGoods(e.target.value);
                                        if (tax1 && tax1Percent) {
                                            const amount = parseFloat(e.target.value) || 0;
                                            const percent = parseFloat(tax1Percent) || 0;
                                            const calculatedTax = (amount * percent) / 100;
                                            setTax1Amount(calculatedTax.toFixed(2));
                                            setTotalTax(calculatedTax.toFixed(2));
                                            const gross = amount + calculatedTax;
                                            setGrossTotalFreight(gross.toFixed(2));
                                        } else {
                                            const amount = parseFloat(e.target.value) || 0;
                                            setGrossTotalFreight(amount.toFixed(2));
                                        }
                                    }}
                                    placeholder="0.00"
                                    className="flex-1 px-3 py-2 border border-theme rounded-lg focus:ring-1 focus:ring-[var(--accent-blue)]/30 focus:border-[var(--accent-blue)] text-[13px] bg-card"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[13px] font-medium text-primary mb-1.5">
                                Customer Order # <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={customerOrderNo}
                                onChange={(e) => setCustomerOrderNo(e.target.value)}
                                placeholder="Order number"
                                className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-1 focus:ring-[var(--accent-blue)]/30 focus:border-[var(--accent-blue)] text-[13px] bg-card"
                            />
                        </div>
                    </div>

                    {/* Row 5: Tax Information */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
                        <div>
                            <label className="block text-[13px] font-medium text-primary mb-1.5">
                                Tax Based On
                            </label>
                            <select
                                value={taxBasedOn}
                                onChange={(e) => setTaxBasedOn(e.target.value)}
                                className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-1 focus:ring-[var(--accent-blue)]/30 focus:border-[var(--accent-blue)] text-[13px] bg-card"
                            >
                                <option>Delivery</option>
                                <option>Pickup</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[13px] font-medium text-primary mb-1.5">
                                Tax 1
                            </label>
                            <div className="flex items-center gap-2">
                                <label className="flex items-center gap-2 px-3 py-2 border border-theme rounded-lg cursor-pointer hover:bg-[rgba(255,255,255,0.03)] bg-card min-w-fit">
                                    <input
                                        type="checkbox"
                                        checked={tax1}
                                        onChange={(e) => setTax1(e.target.checked)}
                                        className="w-3.5 h-3.5 text-[#016ab2] rounded focus:ring-[var(--accent-blue)]/30"
                                    />
                                    <span className="text-[13px] whitespace-nowrap">Tax 1</span>
                                </label>
                                <div className="flex items-center gap-1 flex-1">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={tax1Percent}
                                        onChange={(e) => {
                                            setTax1Percent(e.target.value);
                                            if (e.target.value && valueOfGoods) {
                                                const percent = parseFloat(e.target.value) || 0;
                                                const amount = parseFloat(valueOfGoods) || 0;
                                                const calculated = (amount * percent) / 100;
                                                setTax1Amount(calculated.toFixed(2));
                                                setTotalTax(calculated.toFixed(2));
                                                const gross = amount + calculated;
                                                setGrossTotalFreight(gross.toFixed(2));
                                            }
                                        }}
                                        placeholder="0.00"
                                        className="flex-1 px-3 py-2 border border-theme rounded-lg focus:ring-1 focus:ring-[var(--accent-blue)]/30 focus:border-[var(--accent-blue)] text-[13px] bg-card"
                                    />
                                    <span className="text-[13px] text-secondary flex-shrink-0">%</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[13px] font-medium text-primary mb-1.5">
                                Total Tax
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={totalTax}
                                onChange={(e) => setTotalTax(e.target.value)}
                                placeholder="0.00"
                                className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-1 focus:ring-[var(--accent-blue)]/30 focus:border-[var(--accent-blue)] text-[13px] bg-card"
                                readOnly
                            />
                        </div>

                        <div>
                            <label className="block text-[13px] font-medium text-primary mb-1.5">
                                Gross Total Freight
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={grossTotalFreight}
                                onChange={(e) => setGrossTotalFreight(e.target.value)}
                                placeholder="0.00"
                                className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-1 focus:ring-[var(--accent-blue)]/30 focus:border-[var(--accent-blue)] text-[13px] bg-card"
                                readOnly
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-5 py-3.5 border-t border-theme bg-card">
                <button
                    onClick={handleReset}
                    className="px-5 py-2 text-[13px] font-medium text-primary bg-card border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                >
                    Reset
                </button>
                <button
                    onClick={handleSubmit}
                    className="px-5 py-2 text-[13px] font-medium !text-white rounded-lg transition-all shadow-md hover:shadow-lg"
                    style={{
                        background: 'var(--accent-navyblue)'
                    }}
                >
                    {order ? "Update" : "Add"}
                </button>
            </div>

            {/* Toast Notifications */}
            <div className="fixed top-4 right-4 z-[10001] flex flex-col gap-2">
                {notifications.map((notification) => (
                    <ToastNotification
                        key={notification.id}
                        notification={notification}
                        onClose={removeNotification}
                    />
                ))}
            </div>
        </div>
    );
};

const BulkOrder = () => {
    const [orders, setOrders] = useState<BulkOrderItem[]>([]);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<BulkOrderItem | null>(null);
    const [notifications, setNotifications] = useState<ToastNotification[]>([]);
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; orderId: string | null }>({ show: false, orderId: null });

    const addNotification = useCallback((type: NotificationType, message: string) => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, type, message }]);
    }, []);

    const removeNotification = useCallback((id: number) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const handleAddOrder = () => {
        setEditingOrder(null);
        setSidebarOpen(true);
    };

    const handleSaveOrder = (orderData: any) => {
        if (editingOrder) {
            const updatedOrder: BulkOrderItem = {
                id: editingOrder.id,
                company: "Black River Logistics Ltd",
                customerName: orderData.selectedCustomer?.name || editingOrder.customerName,
                customerId: orderData.customerId || orderData.selectedCustomer?._id || editingOrder.customerId,
                customerData: orderData.selectedCustomer || editingOrder.customerData,
                commodity: orderData.commodity || "",
                loadType: orderData.loadType || "FTL",
                pickupLocation: typeof orderData.pickupLocation === 'string' ? orderData.pickupLocation : (orderData.pickupLocation?.place || ""),
                pickupLocationData: orderData.pickupLocation || editingOrder.pickupLocationData,
                pickupDate: `${orderData.pickupDate} ${orderData.pickupTime}`,
                deliveryLocation: typeof orderData.deliveryLocation === 'string' ? orderData.deliveryLocation : (orderData.deliveryLocation?.place || ""),
                deliveryLocationData: orderData.deliveryLocation || editingOrder.deliveryLocationData,
                deliveryDate: `${orderData.deliveryDate} ${orderData.deliveryTime}`,
                pickupRefNo: orderData.pickupRefNo || "",
                deliveryRefNo: orderData.deliveryRefNo || "",
                amount: orderData.valueOfGoods || orderData.amount || "",
                currency: orderData.valueOfGoodsCurrency || orderData.currency || "CAD",
                customerOrderNo: orderData.customerOrderNo || "",
                taxBasedOn: orderData.taxBasedOn || "Delivery",
                tax1: orderData.tax1 || false,
                tax1Percent: orderData.tax1Percent || "",
                tax1Amount: orderData.tax1Amount || "",
                totalTax: orderData.totalTax || "",
                grossTotalFreight: orderData.grossTotalFreight || "",
            };
            setOrders(orders.map((o) => (o.id === editingOrder.id ? updatedOrder : o)));
            addNotification('success', 'Order updated successfully');
        } else {
            const newOrder: BulkOrderItem = {
                id: Date.now().toString(),
                company: "Black River Logistics Ltd",
                customerName: orderData.selectedCustomer?.name || "",
                customerId: orderData.customerId || orderData.selectedCustomer?._id,
                customerData: orderData.selectedCustomer,
                commodity: orderData.commodity || "",
                loadType: orderData.loadType || "FTL",
                pickupLocation: typeof orderData.pickupLocation === 'string' ? orderData.pickupLocation : (orderData.pickupLocation?.place || ""),
                pickupLocationData: orderData.pickupLocation,
                pickupDate: `${orderData.pickupDate} ${orderData.pickupTime}`,
                deliveryLocation: typeof orderData.deliveryLocation === 'string' ? orderData.deliveryLocation : (orderData.deliveryLocation?.place || ""),
                deliveryLocationData: orderData.deliveryLocation,
                deliveryDate: `${orderData.deliveryDate} ${orderData.deliveryTime}`,
                pickupRefNo: orderData.pickupRefNo || "",
                deliveryRefNo: orderData.deliveryRefNo || "",
                amount: orderData.valueOfGoods || orderData.amount || "",
                currency: orderData.valueOfGoodsCurrency || orderData.currency || "CAD",
                customerOrderNo: orderData.customerOrderNo || "",
                taxBasedOn: orderData.taxBasedOn || "Delivery",
                tax1: orderData.tax1 || false,
                tax1Percent: orderData.tax1Percent || "",
                tax1Amount: orderData.tax1Amount || "",
                totalTax: orderData.totalTax || "",
                grossTotalFreight: orderData.grossTotalFreight || "",
            };
            setOrders([...orders, newOrder]);
            addNotification('success', 'Order added successfully');
        }
        setSidebarOpen(false);
        setEditingOrder(null);
    };

    const handleEditOrder = (order: BulkOrderItem) => {
        setEditingOrder(order);
        setSidebarOpen(true);
    };

    const handleDeleteOrder = (id: string) => {
        setDeleteConfirm({ show: true, orderId: id });
    };

    const confirmDeleteOrder = () => {
        if (!deleteConfirm.orderId) return;
        setOrders(orders.filter((o) => o.id !== deleteConfirm.orderId));
        addNotification('success', 'Order deleted successfully');
        setDeleteConfirm({ show: false, orderId: null });
    };

    const handleSaveAllOrders = async () => {
        if (orders.length === 0) {
            addNotification('error', 'No orders to save');
            return;
        }

        const invalidOrders = orders.filter(order => !order.customerId || !order.customerOrderNo || !order.pickupLocation || !order.deliveryLocation);
        if (invalidOrders.length > 0) {
            addNotification('error', `${invalidOrders.length} order(s) are missing required fields`);
            return;
        }

        setSaving(true);
        setTimeout(() => {
            addNotification('success', `${orders.length} order(s) saved successfully!`);
            setOrders([]);
            setSaving(false);
        }, 1000);
    };

    return (
        <div className="p-4 bg-main  min-h-screen">
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-base font-bold text-primary">Bulk Order</h1>
                <div className="flex items-center gap-2">
                    {orders.length > 0 && (
                        <button
                            onClick={handleSaveAllOrders}
                            disabled={saving}
                            className="flex items-center gap-2 px-3 py-1.5 text-white rounded text-[13px] transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                background: saving ? '#9ca3af' : 'linear-gradient(to right, #016ab2, #063f6f)'
                            }}
                        >
                            {saving ? "Saving..." : `Save All Orders (${orders.length})`}
                        </button>
                    )}
                    <button
                        onClick={handleAddOrder}
                        className="flex items-center gap-2 px-3 py-1.5 !text-white rounded text-[13px] transition-all shadow-md hover:shadow-lg"
                        style={{
                            background: 'var(--accent-navyblue)'
                        }}
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Add Order
                    </button>
                </div>
            </div>

            {orders.length > 0 ? (
                <div className="bg-card rounded-lg shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-gradient-to-r from-[#016ab2] to-[#063f6f] border-b border-theme">
                                <tr>
                                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-white uppercase">Company</th>
                                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-white uppercase">Customer Name</th>
                                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-white uppercase">Commodity</th>
                                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-white uppercase">Load Type</th>
                                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-white uppercase">Pickup Location</th>
                                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-white uppercase">Pickup Date</th>
                                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-white uppercase">Delivery Location</th>
                                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-white uppercase">Delivery Date</th>
                                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-white uppercase">Amount</th>
                                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-white uppercase">Customer Order #</th>
                                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-white uppercase">Gross Total</th>
                                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-white uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-card divide-y divide-theme">
                                {orders.map((order) => (
                                    <tr key={order.id} className="hover:bg-[var(--accent-blue)]/5">
                                        <td className="px-3 py-2 whitespace-nowrap text-[11px] text-primary">{order.company}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-[11px] text-primary">{order.customerName || "-"}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-[11px] text-primary">{order.commodity || "-"}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-[11px] text-primary">{order.loadType || "-"}</td>
                                        <td className="px-3 py-2 text-[11px] text-primary max-w-xs truncate" title={order.pickupLocation || ""}>{order.pickupLocation || "-"}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-[11px] text-primary">{order.pickupDate || "-"}</td>
                                        <td className="px-3 py-2 text-[11px] text-primary max-w-xs truncate" title={order.deliveryLocation || ""}>{order.deliveryLocation || "-"}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-[11px] text-primary">{order.deliveryDate || "-"}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-[11px] text-primary">
                                            {order.currency} {order.amount || "0.00"}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-[11px] text-primary">{order.customerOrderNo || "-"}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-[11px] font-medium text-primary">
                                            {order.grossTotalFreight || "0.00"}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleEditOrder(order)}
                                                    className="p-1 text-[#016ab2] hover:bg-[var(--accent-blue)]/10 rounded"
                                                    title="Edit"
                                                >
                                                    <Edit className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteOrder(order.id)}
                                                    className="p-1 text-[#A855F7] hover:bg-red-50 rounded"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-card rounded-lg shadow-md p-8 text-center">
                    <p className="text-[13px] text-secondary">No orders added yet. Click "Add Order" to create your first order.</p>
                </div>
            )}

            {sidebarOpen && (
                <div className="fixed inset-0 z-[9998] bg-gray-900/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            )}
            <div
                className={`fixed top-0 right-0 h-full max-w-4xl w-full bg-card shadow-2xl transform transition-transform duration-500 ease-out z-[9999] border-l border-theme ${sidebarOpen ? "translate-x-0" : "translate-x-full"
                    }`}
            >
                <NewBulkOrderSidebar
                    order={editingOrder}
                    onClose={() => {
                        setSidebarOpen(false);
                        setEditingOrder(null);
                    }}
                    onSave={handleSaveOrder}
                />
            </div>

            <div className="fixed top-4 right-4 z-[10000] flex flex-col gap-2">
                {notifications.map((notification) => (
                    <ToastNotification
                        key={notification.id}
                        notification={notification}
                        onClose={removeNotification}
                    />
                ))}
            </div>

            {deleteConfirm.show && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50">
                    <div className="bg-card rounded-lg shadow-xl p-5 max-w-md w-full mx-4">
                        <h3 className="text-base font-semibold text-primary mb-3">Delete Order</h3>
                        <p className="text-[13px] text-secondary mb-5">Are you sure you want to delete this order? This action cannot be undone.</p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setDeleteConfirm({ show: false, orderId: null })}
                                className="px-4 py-2 text-[13px] font-medium text-primary bg-card border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteOrder}
                                className="px-4 py-2 text-[13px] font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BulkOrder;