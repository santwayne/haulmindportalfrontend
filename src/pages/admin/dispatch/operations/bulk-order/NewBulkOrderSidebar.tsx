import { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronDown, Search } from "lucide-react";
import { FaCheckCircle, FaExclamationCircle, FaTimes } from "react-icons/fa";
import { listPlace } from "../../../../../axios/api/dispatcher.places";
import { listCustomer } from "../../../../../axios/api/distapcher";

type NotificationType = 'success' | 'error' | 'warning';

interface ToastNotification {
    id: number;
    type: NotificationType;
    message: string;
}

const ToastNotification = ({ notification, onClose }: { notification: ToastNotification; onClose: (id: number) => void }) => {
    const icons = {
        success: <FaCheckCircle className="text-green-500" size={24} />,
        error: <FaExclamationCircle className="text-red-500" size={24} />,
        warning: <FaExclamationCircle className="text-yellow-500" size={24} />,
    };

    const bgColors = {
        success: 'bg-green-50 border-green-200',
        error: 'bg-card border-red-200',
        warning: 'bg-card border-yellow-200',
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(notification.id);
        }, 5000);
        return () => clearTimeout(timer);
    }, [notification.id, onClose]);

    return (
        <div className={`flex items-start gap-3 p-4 rounded-lg border-2 shadow-lg ${bgColors[notification.type]} animate-slide-in min-w-[300px] max-w-[500px]`}>
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

    // Customers and Places
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerSearch, setCustomerSearch] = useState("");
    const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);

    const [pickupPlaces, setPickupPlaces] = useState<Place[]>([]);
    const [selectedPickupPlace, setSelectedPickupPlace] = useState<Place | null>(null);
    const [pickupSearch, setPickupSearch] = useState("");
    const [pickupDropdownOpen, setPickupDropdownOpen] = useState(false);

    const [deliveryPlaces, setDeliveryPlaces] = useState<Place[]>([]);
    const [selectedDeliveryPlace, setSelectedDeliveryPlace] = useState<Place | null>(null);
    const [deliverySearch, setDeliverySearch] = useState("");
    const [deliveryDropdownOpen, setDeliveryDropdownOpen] = useState(false);

    const [commodity, setCommodity] = useState(order?.commodity || "");
    const [loadType, setLoadType] = useState(order?.loadType || "FTL");
    const [pickupDate, setPickupDate] = useState(order?.pickupDate?.split(" ")[0] || new Date().toISOString().split('T')[0]);
    const [pickupTime, setPickupTime] = useState(order?.pickupDate?.split(" ")[1] || "12:00");
    const [deliveryDate, setDeliveryDate] = useState(order?.deliveryDate?.split(" ")[0] || new Date().toISOString().split('T')[0]);
    const [deliveryTime, setDeliveryTime] = useState(order?.deliveryDate?.split(" ")[1] || "12:00");
    const [pickupRefNo, setPickupRefNo] = useState(order?.pickupRefNo || "");
    const [deliveryRefNo, setDeliveryRefNo] = useState(order?.deliveryRefNo || "");
    const [valueOfGoods, setValueOfGoods] = useState(order?.amount || "0.00");
    const [valueOfGoodsCurrency, setValueOfGoodsCurrency] = useState(order?.currency || "CAD");
    const [customerOrderNo, setCustomerOrderNo] = useState(order?.customerOrderNo || "");
    const [taxBasedOn, setTaxBasedOn] = useState(order?.taxBasedOn || "Delivery");
    const [tax1, setTax1] = useState(order?.tax1 || false);
    const [tax1Percent, setTax1Percent] = useState(order?.tax1Percent || "0.00");
    const [tax1Amount, setTax1Amount] = useState(order?.tax1Amount || "0.00");
    const [totalTax, setTotalTax] = useState(order?.totalTax || "0.00");
    const [grossTotalFreight, setGrossTotalFreight] = useState(order?.grossTotalFreight || "0.00");

    const addNotification = useCallback((type: NotificationType, message: string) => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, type, message }]);
    }, []);

    const removeNotification = useCallback((id: number) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const customerDropdownRef = useRef<HTMLDivElement>(null);
    const pickupDropdownRef = useRef<HTMLDivElement>(null);
    const deliveryDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchPlaces();
        fetchCustomers();
    }, []);

    // Populate form when editing an order
    useEffect(() => {
        if (!order) {
            // Don't reset here - let user manually reset if needed
            return;
        }

        // Wait for customers and places to load
        if (customers.length === 0 || pickupPlaces.length === 0) {
            return;
        }

        // Set customer - check stored customerData first
        if ((order as any).customerData) {
            setSelectedCustomer((order as any).customerData);
        } else if (order.customerId) {
            const foundCustomer = customers.find(c => c._id === order.customerId);
            if (foundCustomer) {
                setSelectedCustomer(foundCustomer);
            }
        } else if (order.customerName) {
            const foundCustomer = customers.find(c => c.name === order.customerName);
            if (foundCustomer) {
                setSelectedCustomer(foundCustomer);
            }
        }

        // Set pickup place - check stored pickupLocationData first
        if ((order as any).pickupLocationData?.placeId) {
            const foundPlace = pickupPlaces.find(p => p._id === (order as any).pickupLocationData.placeId);
            if (foundPlace) {
                setSelectedPickupPlace(foundPlace);
            }
        } else if (order.pickupLocation) {
            // Try to find by address/name
            const foundPlace = pickupPlaces.find(p =>
                p.currentLocation?.address === order.pickupLocation ||
                p.name === order.pickupLocation ||
                (order.pickupLocation && p.currentLocation?.address?.toLowerCase().includes(order.pickupLocation.toLowerCase()))
            );
            if (foundPlace) {
                setSelectedPickupPlace(foundPlace);
            } else {
                // If place not found, still set the search text to show the location
                setPickupSearch(order.pickupLocation);
            }
        }

        // Set delivery place - check stored deliveryLocationData first
        if ((order as any).deliveryLocationData?.placeId) {
            const foundPlace = deliveryPlaces.find(p => p._id === (order as any).deliveryLocationData.placeId);
            if (foundPlace) {
                setSelectedDeliveryPlace(foundPlace);
            }
        } else if (order.deliveryLocation) {
            // Try to find by address/name
            const foundPlace = deliveryPlaces.find(p =>
                p.currentLocation?.address === order.deliveryLocation ||
                p.name === order.deliveryLocation ||
                (order.deliveryLocation && p.currentLocation?.address?.toLowerCase().includes(order.deliveryLocation.toLowerCase()))
            );
            if (foundPlace) {
                setSelectedDeliveryPlace(foundPlace);
            } else {
                // If place not found, still set the search text to show the location
                setDeliverySearch(order.deliveryLocation);
            }
        }

        // Set dates properly
        if (order.pickupDate) {
            const [date, time] = order.pickupDate.split(" ");
            if (date) setPickupDate(date);
            if (time) setPickupTime(time);
        }
        if (order.deliveryDate) {
            const [date, time] = order.deliveryDate.split(" ");
            if (date) setDeliveryDate(date);
            if (time) setDeliveryTime(time);
        }

        // Set other fields (they're already set in useState, but ensure they're updated)
        if (order.commodity) setCommodity(order.commodity);
        if (order.loadType) setLoadType(order.loadType);
        if (order.pickupRefNo) setPickupRefNo(order.pickupRefNo);
        if (order.deliveryRefNo) setDeliveryRefNo(order.deliveryRefNo);
        if (order.amount) setValueOfGoods(order.amount);
        if (order.currency) setValueOfGoodsCurrency(order.currency);
        if (order.customerOrderNo) setCustomerOrderNo(order.customerOrderNo);
        if (order.taxBasedOn) setTaxBasedOn(order.taxBasedOn);
        if (order.tax1 !== undefined) setTax1(order.tax1);
        if (order.tax1Percent) setTax1Percent(order.tax1Percent);
        if (order.tax1Amount) setTax1Amount(order.tax1Amount);
        if (order.totalTax) setTotalTax(order.totalTax);
        if (order.grossTotalFreight) setGrossTotalFreight(order.grossTotalFreight);
    }, [order, customers, pickupPlaces, deliveryPlaces]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node | null;
            if (customerDropdownRef.current && target && !customerDropdownRef.current.contains(target)) {
                setCustomerDropdownOpen(false);
            }
            if (pickupDropdownRef.current && target && !pickupDropdownRef.current.contains(target)) {
                setPickupDropdownOpen(false);
            }
            if (deliveryDropdownRef.current && target && !deliveryDropdownRef.current.contains(target)) {
                setDeliveryDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchPlaces = async () => {
        try {
            const response = await listPlace();
            if (response?.success && response?.data) {
                setPickupPlaces(response.data);
                setDeliveryPlaces(response.data);
            }
        } catch (error) {
            console.error("Error fetching places:", error);
        }
    };

    const fetchCustomers = async () => {
        try {
            const response = await listCustomer();
            if (response?.success && response?.data) {
                setCustomers(response.data || []);
            }
        } catch (error) {
            console.error("Error fetching customers:", error);
        }
    };

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

    const filteredDeliveryPlaces = deliveryPlaces.filter(place =>
        !deliverySearch ||
        (place.name || '').toLowerCase().includes(deliverySearch.toLowerCase()) ||
        (place.currentLocation?.address || '').toLowerCase().includes(deliverySearch.toLowerCase()) ||
        (place.city || '').toLowerCase().includes(deliverySearch.toLowerCase())
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
        <div className="h-full flex flex-col bg-card">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-theme">
                <h2 className="text-lg font-semibold text-primary">
                    {order ? "Edit Order" : "New Order"}
                </h2>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-[rgba(255,255,255,0.03)] rounded-lg transition-colors"
                >
                    <X className="w-5 h-5 text-secondary" />
                </button>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Row 1: Customer, Commodity, Load Type */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1 relative" ref={customerDropdownRef}>
                            <label className="block text-sm font-medium text-primary mb-1.5">
                                Customer Name <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div
                                    onClick={() => setCustomerDropdownOpen(!customerDropdownOpen)}
                                    className="flex items-center gap-1 p-2 border border-theme rounded-lg bg-card cursor-pointer hover:border-blue-500 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
                                >
                                    <ChevronDown className={`w-4 h-4 text-secondary transition-transform flex-shrink-0 ${customerDropdownOpen ? 'rotate-180' : ''}`} />
                                    <input
                                        type="text"
                                        value={selectedCustomer ? `${selectedCustomer.name || ''} | ${selectedCustomer.address || selectedCustomer.email || ''}` : customerSearch}
                                        onChange={(e) => {
                                            setCustomerSearch(e.target.value);
                                            setCustomerDropdownOpen(true);
                                        }}
                                        onFocus={() => setCustomerDropdownOpen(true)}
                                        placeholder="Select customer"
                                        className="flex-1 outline-none text-sm min-w-0"
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
                                            <X className="w-4 h-4 text-secondary" />
                                        </button>
                                    )}
                                </div>
                                {customerDropdownOpen && (
                                    <div className="absolute z-50 w-full mt-1 bg-card border border-theme rounded-lg shadow-lg max-h-64 overflow-hidden">
                                        <div className="p-2 border-b border-theme">
                                            <div className="relative">
                                                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary" />
                                                <input
                                                    type="text"
                                                    value={customerSearch}
                                                    onChange={(e) => setCustomerSearch(e.target.value)}
                                                    placeholder="Search..."
                                                    className="w-full pl-8 pr-2 py-1.5 border border-theme rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        <div className="overflow-y-auto max-h-48">
                                            {filteredCustomers.length > 0 ? (
                                                filteredCustomers.map((customer) => (
                                                    <div
                                                        key={customer._id}
                                                        onClick={() => {
                                                            setSelectedCustomer(customer);
                                                            setCustomerSearch("");
                                                            setCustomerDropdownOpen(false);
                                                        }}
                                                        className={`px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm ${selectedCustomer?._id === customer._id ? 'bg-card' : ''
                                                            }`}
                                                    >
                                                        <div className="font-medium text-[#00D1FF]">{customer.name || 'Unnamed Customer'}</div>
                                                        <div className="text-xs text-secondary">{customer.address || customer.email || customer.phone || ''}</div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="px-3 py-2 text-sm text-secondary">No customers found</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-primary mb-1.5">
                                Commodity <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={commodity}
                                onChange={(e) => setCommodity(e.target.value)}
                                placeholder="Enter commodity"
                                className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-card"
                            />
                        </div>

                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-primary mb-1.5">
                                Load Type
                            </label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setLoadType("FTL")}
                                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${loadType === "FTL"
                                            ? "bg-blue-600 !text-white"
                                            : "bg-card text-primary hover:bg-gray-200"
                                        }`}
                                >
                                    FTL
                                </button>
                                <button
                                    onClick={() => setLoadType("LTL")}
                                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${loadType === "LTL"
                                            ? "bg-blue-600 !text-white"
                                            : "bg-card text-primary hover:bg-gray-200"
                                        }`}
                                >
                                    LTL
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Pickup Location & Date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative" ref={pickupDropdownRef}>
                            <label className="block text-sm font-medium text-primary mb-1.5">
                                Pickup Location <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div
                                    onClick={() => setPickupDropdownOpen(!pickupDropdownOpen)}
                                    className="flex items-center gap-1 p-2 border border-theme rounded-lg bg-card cursor-pointer hover:border-blue-500 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
                                >
                                    <ChevronDown className={`w-4 h-4 text-secondary transition-transform flex-shrink-0 ${pickupDropdownOpen ? 'rotate-180' : ''}`} />
                                    <input
                                        type="text"
                                        value={selectedPickupPlace ? `${selectedPickupPlace.name || ''} | ${selectedPickupPlace.currentLocation?.address || ''}` : pickupSearch}
                                        onChange={(e) => {
                                            setPickupSearch(e.target.value);
                                            setPickupDropdownOpen(true);
                                        }}
                                        onFocus={() => setPickupDropdownOpen(true)}
                                        placeholder="Search pickup location..."
                                        className="flex-1 outline-none text-sm min-w-0"
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
                                            <X className="w-4 h-4 text-secondary" />
                                        </button>
                                    )}
                                </div>
                                {pickupDropdownOpen && (
                                    <div className="absolute z-50 w-full mt-1 bg-card border border-theme rounded-lg shadow-lg max-h-64 overflow-hidden">
                                        <div className="p-2 border-b border-theme">
                                            <div className="relative">
                                                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary" />
                                                <input
                                                    type="text"
                                                    value={pickupSearch}
                                                    onChange={(e) => setPickupSearch(e.target.value)}
                                                    placeholder="Search places..."
                                                    className="w-full pl-8 pr-2 py-1.5 border border-theme rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        <div className="overflow-y-auto max-h-48">
                                            {filteredPickupPlaces.length > 0 ? (
                                                filteredPickupPlaces.map((place) => (
                                                    <div
                                                        key={place._id}
                                                        onClick={() => {
                                                            setSelectedPickupPlace(place);
                                                            setPickupSearch("");
                                                            setPickupDropdownOpen(false);
                                                        }}
                                                        className={`px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm ${selectedPickupPlace?._id === place._id ? 'bg-card' : ''
                                                            }`}
                                                    >
                                                        <div className="font-medium text-[#00D1FF]">{place.name || 'Unnamed Place'}</div>
                                                        <div className="text-xs text-secondary">{place.currentLocation?.address || `${place.city || ''}, ${place.state || ''}`}</div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="px-3 py-2 text-sm text-secondary">No places found</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-primary mb-1.5">
                                Pickup Date <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="date"
                                        value={pickupDate}
                                        onChange={(e) => setPickupDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-card"
                                    />
                                </div>
                                <div className="relative flex-1">
                                    <input
                                        type="time"
                                        value={pickupTime}
                                        onChange={(e) => setPickupTime(e.target.value)}
                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-card"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Row 3: Delivery Location & Date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative" ref={deliveryDropdownRef}>
                            <label className="block text-sm font-medium text-primary mb-1.5">
                                Delivery Location <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <div
                                    onClick={() => setDeliveryDropdownOpen(!deliveryDropdownOpen)}
                                    className="flex items-center gap-1 p-2 border border-theme rounded-lg bg-card cursor-pointer hover:border-blue-500 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
                                >
                                    <ChevronDown className={`w-4 h-4 text-secondary transition-transform flex-shrink-0 ${deliveryDropdownOpen ? 'rotate-180' : ''}`} />
                                    <input
                                        type="text"
                                        value={selectedDeliveryPlace ? `${selectedDeliveryPlace.name || ''} | ${selectedDeliveryPlace.currentLocation?.address || ''}` : deliverySearch}
                                        onChange={(e) => {
                                            setDeliverySearch(e.target.value);
                                            setDeliveryDropdownOpen(true);
                                        }}
                                        onFocus={() => setDeliveryDropdownOpen(true)}
                                        placeholder="Search delivery location..."
                                        className="flex-1 outline-none text-sm min-w-0"
                                        readOnly={!!selectedDeliveryPlace}
                                    />
                                    {selectedDeliveryPlace && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedDeliveryPlace(null);
                                                setDeliverySearch("");
                                            }}
                                            className="p-1 hover:bg-[rgba(255,255,255,0.03)] rounded flex-shrink-0"
                                        >
                                            <X className="w-4 h-4 text-secondary" />
                                        </button>
                                    )}
                                </div>
                                {deliveryDropdownOpen && (
                                    <div className="absolute z-50 w-full mt-1 bg-card border border-theme rounded-lg shadow-lg max-h-64 overflow-hidden">
                                        <div className="p-2 border-b border-theme">
                                            <div className="relative">
                                                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary" />
                                                <input
                                                    type="text"
                                                    value={deliverySearch}
                                                    onChange={(e) => setDeliverySearch(e.target.value)}
                                                    placeholder="Search places..."
                                                    className="w-full pl-8 pr-2 py-1.5 border border-theme rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        <div className="overflow-y-auto max-h-48">
                                            {filteredDeliveryPlaces.length > 0 ? (
                                                filteredDeliveryPlaces.map((place) => (
                                                    <div
                                                        key={place._id}
                                                        onClick={() => {
                                                            setSelectedDeliveryPlace(place);
                                                            setDeliverySearch("");
                                                            setDeliveryDropdownOpen(false);
                                                        }}
                                                        className={`px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm ${selectedDeliveryPlace?._id === place._id ? 'bg-card' : ''
                                                            }`}
                                                    >
                                                        <div className="font-medium text-[#00D1FF]">{place.name || 'Unnamed Place'}</div>
                                                        <div className="text-xs text-secondary">{place.currentLocation?.address || `${place.city || ''}, ${place.state || ''}`}</div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="px-3 py-2 text-sm text-secondary">No places found</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-primary mb-1.5">
                                Delivery Date <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type="date"
                                        value={deliveryDate}
                                        onChange={(e) => setDeliveryDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-card"
                                    />
                                </div>
                                <div className="relative flex-1">
                                    <input
                                        type="time"
                                        value={deliveryTime}
                                        onChange={(e) => setDeliveryTime(e.target.value)}
                                        className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-card"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Row 4: Reference Numbers & Amount */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-primary mb-1.5">
                                Pickup Ref#
                            </label>
                            <input
                                type="text"
                                value={pickupRefNo}
                                onChange={(e) => setPickupRefNo(e.target.value)}
                                placeholder="Enter reference"
                                className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-card"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-primary mb-1.5">
                                Delivery Ref#
                            </label>
                            <input
                                type="text"
                                value={deliveryRefNo}
                                onChange={(e) => setDeliveryRefNo(e.target.value)}
                                placeholder="Enter reference"
                                className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-card"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-primary mb-1.5">
                                Amount
                            </label>
                            <div className="flex gap-2">
                                <select
                                    value={valueOfGoodsCurrency}
                                    onChange={(e) => setValueOfGoodsCurrency(e.target.value)}
                                    className="w-20 px-2 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-card"
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
                                        // Recalculate tax and gross total if tax is enabled
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
                                    className="flex-1 px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-card"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-primary mb-1.5">
                                Customer Order # <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={customerOrderNo}
                                onChange={(e) => setCustomerOrderNo(e.target.value)}
                                placeholder="Order number"
                                className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-card"
                            />
                        </div>
                    </div>

                    {/* Row 5: Tax Information */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-primary mb-1.5">
                                Tax Based On
                            </label>
                            <select
                                value={taxBasedOn}
                                onChange={(e) => setTaxBasedOn(e.target.value)}
                                className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-card"
                            >
                                <option>Delivery</option>
                                <option>Pickup</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-primary mb-1.5">
                                Tax 1
                            </label>
                            <div className="flex items-center gap-2">
                                <label className="flex items-center gap-2 px-3 py-2 border border-theme rounded-lg cursor-pointer hover:bg-[rgba(255,255,255,0.03)] bg-card min-w-fit">
                                    <input
                                        type="checkbox"
                                        checked={tax1}
                                        onChange={(e) => setTax1(e.target.checked)}
                                        className="w-4 h-4 text-[#00D1FF] rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm whitespace-nowrap">Tax 1</span>
                                </label>
                                <div className="flex items-center gap-1 flex-1">
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={tax1Percent}
                                        onChange={(e) => {
                                            setTax1Percent(e.target.value);
                                            // Auto-calculate tax amount if value of goods is available
                                            if (e.target.value && valueOfGoods) {
                                                const percent = parseFloat(e.target.value) || 0;
                                                const amount = parseFloat(valueOfGoods) || 0;
                                                const calculated = (amount * percent) / 100;
                                                setTax1Amount(calculated.toFixed(2));
                                                setTotalTax(calculated.toFixed(2));
                                                // Calculate gross total
                                                const gross = amount + calculated;
                                                setGrossTotalFreight(gross.toFixed(2));
                                            }
                                        }}
                                        placeholder="0.00"
                                        className="flex-1 px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-card"
                                    />
                                    <span className="text-sm text-secondary flex-shrink-0">%</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-primary mb-1.5">
                                Total Tax
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={totalTax}
                                onChange={(e) => setTotalTax(e.target.value)}
                                placeholder="0.00"
                                className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-card"
                                readOnly
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-primary mb-1.5">
                                Gross Total Freight
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={grossTotalFreight}
                                onChange={(e) => setGrossTotalFreight(e.target.value)}
                                placeholder="0.00"
                                className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-card"
                                readOnly
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-theme bg-card">
                <button
                    onClick={handleReset}
                    className="px-6 py-2 text-sm font-medium text-primary bg-card border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                >
                    Reset
                </button>
                <button
                    onClick={handleSubmit}
                    className="px-6 py-2 text-sm font-medium !text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
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

export default NewBulkOrderSidebar;