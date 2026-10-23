import { useState, useEffect, useRef } from "react";
import { X, Plus, ChevronDown, ChevronUp, Search, Pencil } from "lucide-react";
import { listPlace } from "../../../axios/api/dispatcher.places";
import { listCustomer, createLoad } from "../../../axios/api/distapcher";

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
    _id?: string;
    id?: string | number;
    name?: string;
    address?: string;
}

interface NewLoadProps {
    onClose: () => void;
}

const NewLoad = ({ onClose }: NewLoadProps) => {
    const [loading, setLoading] = useState(false);
    
    // Form states
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerSearch, setCustomerSearch] = useState("");
    const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
    const [customerOrderNo, setCustomerOrderNo] = useState("");
    const [loadType, setLoadType] = useState("FTL");
    const [freightOn, setFreightOn] = useState("Order");
    const [selectedSalesman, setSelectedSalesman] = useState("");
    const [orderNotes, setOrderNotes] = useState("");
    const [commodity, setCommodity] = useState("");
    const [valueOfGoods, setValueOfGoods] = useState("");
    const [valueOfGoodsCurrency, setValueOfGoodsCurrency] = useState("");
    const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
    const [equipmentDropdownOpen, setEquipmentDropdownOpen] = useState(false);
    const [noOfPackages, setNoOfPackages] = useState("");
    const [noOfPackagesType, setNoOfPackagesType] = useState("");
    const [noOfPackagesSearch, setNoOfPackagesSearch] = useState("");
    const [noOfPackagesDropdownOpen, setNoOfPackagesDropdownOpen] = useState(false);
    const [weight, setWeight] = useState("");
    const [weightUnit, setWeightUnit] = useState("");
    const [temperature, setTemperature] = useState("");
    const [temperatureUnit, setTemperatureUnit] = useState("Celsius");
    const [dimensionL, setDimensionL] = useState("");
    const [dimensionB, setDimensionB] = useState("");
    const [dimensionH, setDimensionH] = useState("");
    const [dimensionUnit, setDimensionUnit] = useState("");
    // Pickup location states
    const [pickupPlaces, setPickupPlaces] = useState<Place[]>([]);
    const [selectedPickupPlace, setSelectedPickupPlace] = useState<Place | null>(null);
    const [pickupSearch, setPickupSearch] = useState("");
    const [pickupDropdownOpen, setPickupDropdownOpen] = useState(false);
    const [pickupRefNo, setPickupRefNo] = useState("");
    const [pickupDate, setPickupDate] = useState(new Date().toISOString().split('T')[0]);
    const [pickupTime, setPickupTime] = useState("12:00");
    const [pickupAppointment, setPickupAppointment] = useState("No");
    const [pickupNote, setPickupNote] = useState("");
    
    // Delivery location states
    const [deliveryPlaces, setDeliveryPlaces] = useState<Place[]>([]);
    const [selectedDeliveryPlace, setSelectedDeliveryPlace] = useState<Place | null>(null);
    const [deliverySearch, setDeliverySearch] = useState("");
    const [deliveryDropdownOpen, setDeliveryDropdownOpen] = useState(false);
    const [deliveryRefNo, setDeliveryRefNo] = useState("");
    const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
    const [deliveryTime, setDeliveryTime] = useState("12:00");
    const [deliveryAppointment, setDeliveryAppointment] = useState("No");
    const [deliveryNote, setDeliveryNote] = useState("");
    
    // Customers state
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [distance, setDistance] = useState("");
    const [additionalInfo, setAdditionalInfo] = useState({
        CSA: false,
        CTPAT: false,
        PIP: false,
        HAZMAT: false,
        TARP: false,
        OverDimension: false
    });

    // Fetch places and customers on component mount
    useEffect(() => {
        fetchPlaces();
        fetchCustomers();
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

    const packageTypes = ["Bag", "Bale", "Barrel", "Basket", "Bin", "Bing Chest", "Box", "Bucket", "Bundle", "Cage", "Carton", "Case", "Chest", "Container", "Crate", "Drum", "Envelope", "Package", "Pallet", "Parcel", "Piece", "Reel", "Roll", "Sack", "Skid", "Tank", "Tote", "Tray", "Tub", "Unit"];
    
    const equipmentTypes = ["Truck", "Van", "Trailer", "Container", "Flatbed", "Refrigerated"];
    const weightUnits = ["kg", "lbs", "tons"];
    const dimensionUnits = ["cm", "inch", "m", "ft"];
    const currencyOptions = [
        { value: "CAD", label: "CAD - Canadian Dollar" },
        { value: "INR", label: "INR - Indian Rupee" },
        { value: "USD", label: "USD - US Dollar" }
    ];

    const customerDropdownRef = useRef<HTMLDivElement>(null);
    const equipmentDropdownRef = useRef<HTMLDivElement>(null);
    const packagesDropdownRef = useRef<HTMLDivElement>(null);
    const pickupDropdownRef = useRef<HTMLDivElement>(null);
    const deliveryDropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node | null;
            if (customerDropdownRef.current && !customerDropdownRef.current.contains(target)) {
                setCustomerDropdownOpen(false);
            }
            if (equipmentDropdownRef.current && !equipmentDropdownRef.current.contains(target)) {
                setEquipmentDropdownOpen(false);
            }
            if (packagesDropdownRef.current && !packagesDropdownRef.current.contains(target)) {
                setNoOfPackagesDropdownOpen(false);
            }
            if (pickupDropdownRef.current && !pickupDropdownRef.current.contains(target)) {
                setPickupDropdownOpen(false);
            }
            if (deliveryDropdownRef.current && !deliveryDropdownRef.current.contains(target)) {
                setDeliveryDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredCustomers = customers.filter(customer =>
        (customer.name || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
        (customer.address || '').toLowerCase().includes(customerSearch.toLowerCase())
    );

    const filteredPackages = packageTypes.filter(pkg =>
        pkg.toLowerCase().includes(noOfPackagesSearch.toLowerCase())
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

    const handleEquipmentToggle = (equipment: string) => {
        setSelectedEquipment(prev =>
            prev.includes(equipment)
                ? prev.filter(e => e !== equipment)
                : [...prev, equipment]
        );
    };

    const handleAdditionalInfoToggle = (key: keyof typeof additionalInfo) => {
        setAdditionalInfo(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSaveLoad = async () => {
        // Validation
        if (!selectedCustomer) {
            alert("Please select a customer");
            return;
        }
        if (!selectedPickupPlace) {
            alert("Please select a pickup location");
            return;
        }
        if (!selectedDeliveryPlace) {
            alert("Please select a delivery location");
            return;
        }
        if (!customerOrderNo) {
            alert("Please enter customer order number");
            return;
        }
        if (!commodity) {
            alert("Please enter commodity");
            return;
        }

        setLoading(true);
        try {
            // Combine pickup date and time
            const pickupDateTime = pickupDate && pickupTime 
                ? new Date(`${pickupDate}T${pickupTime}`).toISOString()
                : null;
            
            // Combine delivery date and time
            const deliveryDateTime = deliveryDate && deliveryTime
                ? new Date(`${deliveryDate}T${deliveryTime}`).toISOString()
                : null;

            // Build route data
            const routeData = {
                multipleDropOffs: false,
                selectPickup: {
                    place: selectedPickupPlace.currentLocation?.address || `${selectedPickupPlace.name || ''}, ${selectedPickupPlace.city || ''}, ${selectedPickupPlace.state || ''}`,
                    latitude: selectedPickupPlace.currentLocation?.latitude?.toString() || '',
                    longitude: selectedPickupPlace.currentLocation?.longitude?.toString() || '',
                    placeId: selectedPickupPlace._id
                },
                selectDropOff: {
                    place: selectedDeliveryPlace.currentLocation?.address || `${selectedDeliveryPlace.name || ''}, ${selectedDeliveryPlace.city || ''}, ${selectedDeliveryPlace.state || ''}`,
                    latitude: selectedDeliveryPlace.currentLocation?.latitude?.toString() || '',
                    longitude: selectedDeliveryPlace.currentLocation?.longitude?.toString() || '',
                    placeId: selectedDeliveryPlace._id
                }
            };

            // Build payloads (at least one is required)
            const payloads = [{
                itemName: commodity || "General Freight",
                internalId: `ITEM_${Date.now()}`,
                description: orderNotes || '',
                measurementAndWeight: {
                    weight: weight ? parseFloat(weight) : 0,
                    length: dimensionL ? parseFloat(dimensionL) : 0,
                    width: dimensionB ? parseFloat(dimensionB) : 0,
                    height: dimensionH ? parseFloat(dimensionH) : 0
                },
                priceAndValues: {
                    price: valueOfGoods ? parseFloat(valueOfGoods) : 0
                }
            }];

            // Build load data
            const loadData = {
                details: {
                    orderType: loadType || "FTL",
                    internalId: customerOrderNo || `LOAD_${Date.now()}`,
                    customer: selectedCustomer._id || selectedCustomer.id,
                    amount: valueOfGoods ? parseFloat(valueOfGoods) : 0,
                    rate: valueOfGoods ? parseFloat(valueOfGoods) : 0
                },
                route: routeData,
                payloads: payloads,
                services: {
                    applyServiceRate: false
                },
                notes: orderNotes || '',
                status: 'planned',
                // Pickup and delivery scheduling
                pickupDate: pickupDateTime,
                pickupTime: pickupTime,
                pickupAppointment: pickupAppointment === "Yes",
                pickupRefNo: pickupRefNo || '',
                pickupNote: pickupNote || '',
                deliveryDate: deliveryDateTime,
                deliveryTime: deliveryTime,
                deliveryAppointment: deliveryAppointment === "Yes",
                deliveryRefNo: deliveryRefNo || '',
                deliveryNote: deliveryNote || ''
            };

            const response = await createLoad(loadData);
            
            if (response?.success) {
                alert("Load created successfully!");
                if (onClose) {
                    onClose();
                }
            } else {
                alert(response?.message || "Failed to create load");
            }
        } catch (error) {
            console.error("Error creating load:", error);
            alert("Failed to create load. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-card overflow-hidden">
            {/* Fixed Header */}
            <div className="flex items-center justify-between p-4 border-b border-theme bg-card flex-shrink-0">
                <h2 className="text-lg font-semibold text-primary">New Load</h2>
                <button
                    onClick={onClose}
                    className="p-2 hover:bg-[rgba(255,255,255,0.03)] rounded-full transition-colors"
                >
                    <X className="w-5 h-5 text-secondary" />
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
                {/* Details Section */}
                <div className="border-b border-theme">
                    <div className="p-4 bg-card border-b border-theme">
                        <h3 className="text-sm font-semibold text-primary">Details</h3>
                    </div>
                    <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-4">
                            {/* Customer Field */}
                            <div className="relative" ref={customerDropdownRef}>
                                <label className="block text-xs font-medium text-primary mb-1">Customer *</label>
                                <div className="relative">
                                    <div
                                        onClick={() => setCustomerDropdownOpen(!customerDropdownOpen)}
                                        className="flex items-center gap-1 p-2 border border-theme rounded bg-card cursor-pointer hover:border-blue-500 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
                                    >
                                        <ChevronDown className={`w-4 h-4 text-secondary transition-transform flex-shrink-0 ${customerDropdownOpen ? 'rotate-180' : ''}`} />
                                        <input
                                            type="text"
                                            value={selectedCustomer ? `${selectedCustomer.name} | ${selectedCustomer.address}` : customerSearch}
                                            onChange={(e) => {
                                                setCustomerSearch(e.target.value);
                                                setCustomerDropdownOpen(true);
                                            }}
                                            onFocus={() => setCustomerDropdownOpen(true)}
                                            placeholder="customer"
                                            className="flex-1 outline-none text-sm min-w-0"
                                            readOnly={!!selectedCustomer}
                                        />
                                        {selectedCustomer && (
                                            <>
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
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Edit functionality
                                                    }}
                                                    className="p-1 hover:bg-[rgba(255,255,255,0.03)] rounded flex-shrink-0"
                                                >
                                                    <Pencil className="w-4 h-4 text-secondary" />
                                                </button>
                                            </>
                                        )}
                                        <ChevronUp className={`w-4 h-4 text-secondary transition-transform flex-shrink-0 ${customerDropdownOpen ? '' : 'rotate-180 opacity-0'}`} />
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
                                                <div className="px-2 py-1 text-xs font-semibold text-secondary bg-card">United States</div>
                                                {filteredCustomers.length > 0 ? (
                                                    filteredCustomers.map((customer) => (
                                                        <div
                                                            key={customer.id}
                                                            onClick={() => {
                                                                setSelectedCustomer(customer);
                                                                setCustomerSearch("");
                                                                setCustomerDropdownOpen(false);
                                                            }}
                                                            className={`px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm ${
                                                                selectedCustomer?.id === customer.id ? 'bg-card' : ''
                                                            }`}
                                                        >
                                                            <div className="font-medium text-[#00D1FF]">{customer.name}</div>
                                                            <div className="text-xs text-secondary">{customer.address}</div>
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

                            {/* Customer Order # */}
                            <div>
                                <label className="block text-xs font-medium text-primary mb-1">Customer Order # *</label>
                                <input
                                    type="text"
                                    value={customerOrderNo}
                                    onChange={(e) => setCustomerOrderNo(e.target.value)}
                                    className="w-full p-2 border border-theme rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                                />
                            </div>

                            {/* Load Type Toggle */}
                            <div>
                                <label className="block text-xs font-medium text-primary mb-1">Load Type</label>
                                <div className="flex border border-theme rounded overflow-hidden">
                                    <button
                                        onClick={() => setLoadType("FTL")}
                                        className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                                            loadType === "FTL"
                                                ? "bg-blue-600 !text-white"
                                                : "bg-card text-primary hover:bg-[rgba(255,255,255,0.03)]"
                                        }`}
                                    >
                                        FTL
                                    </button>
                                    <button
                                        onClick={() => setLoadType("LTL")}
                                        className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                                            loadType === "LTL"
                                                ? "bg-blue-600 !text-white"
                                                : "bg-card text-primary hover:bg-[rgba(255,255,255,0.03)]"
                                        }`}
                                    >
                                        LTL
                                    </button>
                                </div>
                            </div>

                            {/* Freight on Toggle */}
                            <div>
                                <label className="block text-xs font-medium text-primary mb-1">Freight on</label>
                                <div className="flex border border-theme rounded overflow-hidden">
                                    <button
                                        onClick={() => setFreightOn("Order")}
                                        className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                                            freightOn === "Order"
                                                ? "bg-blue-600 !text-white"
                                                : "bg-card text-primary hover:bg-[rgba(255,255,255,0.03)]"
                                        }`}
                                    >
                                        Order
                                    </button>
                                    <button
                                        onClick={() => setFreightOn("Item")}
                                        className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                                            freightOn === "Item"
                                                ? "bg-blue-600 !text-white"
                                                : "bg-card text-primary hover:bg-[rgba(255,255,255,0.03)]"
                                        }`}
                                    >
                                        Item
                                    </button>
                                </div>
                            </div>

                            {/* Salesman */}
                            <div>
                                <label className="block text-xs font-medium text-primary mb-1">Salesman</label>
                                <div className="flex gap-1">
                                    <select
                                        value={selectedSalesman}
                                        onChange={(e) => setSelectedSalesman(e.target.value)}
                                        className="flex-1 p-2 border border-theme rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                                    >
                                        <option value="">Select</option>
                                        <option value="john">John Doe</option>
                                        <option value="jane">Jane Smith</option>
                                    </select>
                                    <button className="px-2 text-blue-500 hover:bg-blue-50 rounded text-xl leading-none flex-shrink-0">+</button>
                                </div>
                            </div>
                        </div>
                        
                        <div className="mb-3">
                            <label className="block text-xs font-medium text-primary mb-1">Order Notes</label>
                            <textarea
                                rows={2}
                                value={orderNotes}
                                onChange={(e) => setOrderNotes(e.target.value)}
                                className="w-full p-2 border border-theme rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                            />
                        </div>
                        
                        <button className="text-[#00D1FF] hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                            Additional Info<Plus className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                {/* Shipment Section */}
                <div className="border-b border-theme">
                    <div className="p-4 bg-card border-b border-theme flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-primary">Shipment</h3>
                        <button className="text-[#00D1FF] hover:text-blue-700 text-xl leading-none">+</button>
                    </div>
                    <div className="p-4">
                        {/* Top Fields */}
                        <div className="space-y-4">
                            {/* Commodity */}
                            <div className="flex items-center">
                                <label className="w-40 text-sm font-medium text-primary flex-shrink-0">
                                    Commodity <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={commodity}
                                    onChange={(e) => setCommodity(e.target.value)}
                                    className="flex-1 p-2 border border-theme rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    placeholder="Enter commodity"
                                />
                            </div>

                            {/* Value of goods - Input on left, Dropdown on right (like Weight) */}
                            <div className="flex items-center">
                                <label className="w-40 text-sm font-medium text-primary flex-shrink-0">
                                    Value of goods
                                </label>
                                <div className="flex-1 flex gap-2">
                                    <input
                                        type="text"
                                        value={valueOfGoods}
                                        onChange={(e) => setValueOfGoods(e.target.value)}
                                        placeholder="Enter value"
                                        className="flex-1 p-2 border border-theme rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                    <select
                                        value={valueOfGoodsCurrency}
                                        onChange={(e) => setValueOfGoodsCurrency(e.target.value)}
                                        className="w-48 p-2 border border-theme rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-card"
                                    >
                                        <option value="">Select</option>
                                        {currencyOptions.map(currency => (
                                            <option key={currency.value} value={currency.value}>{currency.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Equipment */}
                            <div className="flex items-start">
                                <label className="w-40 text-sm font-medium text-primary flex-shrink-0 pt-2">
                                    Equipment
                                </label>
                                <div className="flex-1 relative" ref={equipmentDropdownRef}>
                                    <div className="flex gap-2">
                                        <div
                                            onClick={() => setEquipmentDropdownOpen(!equipmentDropdownOpen)}
                                            className="flex-1 p-2 border border-theme rounded bg-card cursor-pointer hover:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500 flex items-center justify-between"
                                        >
                                            <span className="text-sm text-secondary">
                                                {selectedEquipment.length > 0 
                                                    ? `${selectedEquipment.length} selected`
                                                    : "Select equipment"
                                                }
                                            </span>
                                            <ChevronDown className={`w-4 h-4 text-secondary transition-transform ${equipmentDropdownOpen ? 'rotate-180' : ''}`} />
                                        </div>
                                        <button 
                                            className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm font-medium flex-shrink-0"
                                            onClick={() => alert('Add new equipment')}
                                        >
                                            + Add
                                        </button>
                                    </div>
                                    
                                    {equipmentDropdownOpen && (
                                        <div className="absolute z-50 w-full mt-1 bg-card border border-theme rounded-lg shadow-lg max-h-64 overflow-y-auto">
                                            {equipmentTypes.map((equipment) => (
                                                <label
                                                    key={equipment}
                                                    className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50 cursor-pointer"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedEquipment.includes(equipment)}
                                                        onChange={() => handleEquipmentToggle(equipment)}
                                                        className="w-4 h-4 text-[#00D1FF] rounded focus:ring-blue-500"
                                                    />
                                                    <span className="text-sm text-primary">{equipment}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* No of Packages - Input on left, Dropdown on right (like Weight) */}
                            <div className="flex items-center">
                                <label className="w-40 text-sm font-medium text-primary flex-shrink-0">
                                    No of Packages
                                </label>
                                <div className="flex-1 flex gap-2 relative" ref={packagesDropdownRef}>
                                    <input
                                        type="text"
                                        value={noOfPackages}
                                        onChange={(e) => setNoOfPackages(e.target.value)}
                                        placeholder="Enter number"
                                        className="flex-1 p-2 border border-theme rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                    <div className="relative w-48">
                                        <div
                                            onClick={() => setNoOfPackagesDropdownOpen(!noOfPackagesDropdownOpen)}
                                            className="flex items-center justify-between p-2 border border-theme rounded bg-card cursor-pointer hover:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500"
                                        >
                                            <span className="text-sm text-secondary truncate">
                                                {noOfPackagesType || "Select"}
                                            </span>
                                            {noOfPackagesType && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setNoOfPackagesType("");
                                                    }}
                                                    className="p-0.5 hover:bg-[rgba(255,255,255,0.03)] rounded mr-1 flex-shrink-0"
                                                >
                                                    <X className="w-3 h-3 text-secondary" />
                                                </button>
                                            )}
                                            <ChevronDown className={`w-4 h-4 text-secondary transition-transform flex-shrink-0 ${noOfPackagesDropdownOpen ? 'rotate-180' : ''}`} />
                                        </div>
                                        
                                        {noOfPackagesDropdownOpen && (
                                            <div className="absolute z-50 w-full mt-1 bg-card border border-theme rounded-lg shadow-lg max-h-64 overflow-hidden">
                                                <div className="p-2 border-b border-theme">
                                                    <div className="relative">
                                                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary" />
                                                        <input
                                                            type="text"
                                                            value={noOfPackagesSearch}
                                                            onChange={(e) => setNoOfPackagesSearch(e.target.value)}
                                                            placeholder="Searching..."
                                                            className="w-full pl-8 pr-2 py-1.5 border border-theme rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                            autoFocus
                                                        />
                                                    </div>
                                                </div>
                                                <div className="overflow-y-auto max-h-48">
                                                    {filteredPackages.map((pkg) => (
                                                        <div
                                                            key={pkg}
                                                            onClick={() => {
                                                                setNoOfPackagesType(pkg);
                                                                setNoOfPackagesSearch("");
                                                                setNoOfPackagesDropdownOpen(false);
                                                            }}
                                                            className="px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm"
                                                        >
                                                            {pkg}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Weight */}
                            <div className="flex items-center">
                                <label className="w-40 text-sm font-medium text-primary flex-shrink-0">
                                    Weight
                                </label>
                                <div className="flex-1 flex gap-2">
                                    <input
                                        type="text"
                                        value={weight}
                                        onChange={(e) => setWeight(e.target.value)}
                                        placeholder="Enter weight"
                                        className="flex-1 p-2 border border-theme rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                    <select
                                        value={weightUnit}
                                        onChange={(e) => setWeightUnit(e.target.value)}
                                        className="w-24 p-2 border border-theme rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-card"
                                    >
                                        <option value="">Unit</option>
                                        {weightUnits.map(unit => (
                                            <option key={unit} value={unit}>{unit}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Temperature */}
                            <div className="flex items-center">
                                <label className="w-40 text-sm font-medium text-primary flex-shrink-0">
                                    Temperature
                                </label>
                                <div className="flex-1 flex gap-2">
                                    <input
                                        type="text"
                                        value={temperature}
                                        onChange={(e) => setTemperature(e.target.value)}
                                        placeholder="Enter temperature"
                                        className="flex-1 p-2 border border-theme rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                    <select
                                        value={temperatureUnit}
                                        onChange={(e) => setTemperatureUnit(e.target.value)}
                                        className="w-32 p-2 border border-theme rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-card"
                                    >
                                        <option value="Celsius">Celsius</option>
                                        <option value="Fahrenheit">Fahrenheit</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        {/* Dimensions */}
                        <div className="mb-4 mt-4">
                            <label className="block text-xs font-medium text-primary mb-1">Dimension (LxBxH)</label>
                            <div className="flex gap-2 items-center flex-wrap">
                                <input
                                    type="text"
                                    value={dimensionL}
                                    onChange={(e) => setDimensionL(e.target.value)}
                                    placeholder="L"
                                    className="w-20 p-2 border border-theme rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                                />
                                <span className="text-secondary text-sm">×</span>
                                <input
                                    type="text"
                                    value={dimensionB}
                                    onChange={(e) => setDimensionB(e.target.value)}
                                    placeholder="B"
                                    className="w-20 p-2 border border-theme rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                                />
                                <span className="text-secondary text-sm">×</span>
                                <input
                                    type="text"
                                    value={dimensionH}
                                    onChange={(e) => setDimensionH(e.target.value)}
                                    placeholder="H"
                                    className="w-20 p-2 border border-theme rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                                />
                                <select
                                    value={dimensionUnit}
                                    onChange={(e) => setDimensionUnit(e.target.value)}
                                    className="p-2 border border-theme rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm min-w-[100px]"
                                >
                                    <option value="">Select</option>
                                    {dimensionUnits.map(unit => (
                                        <option key={unit} value={unit}>{unit}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* PICKUP and DELIVERY Side by Side */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                            {/* PICKUP Section */}
                            <div className="border border-theme rounded-lg p-4 bg-card">
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" id="pickup-checkbox" className="w-4 h-4" defaultChecked />
                                        <label htmlFor="pickup-checkbox" className="font-medium text-primary text-sm">PICKUP</label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" id="same-pickup" className="w-4 h-4" />
                                        <label htmlFor="same-pickup" className="text-xs text-secondary">Same pickup for next shipment</label>
                                    </div>
                                </div>
                                
                                <div className="space-y-3">
                                    <div className="relative" ref={pickupDropdownRef}>
                                        <label className="block text-xs font-medium text-primary mb-1">Location *</label>
                                        <div className="relative">
                                            <div
                                                onClick={() => setPickupDropdownOpen(!pickupDropdownOpen)}
                                                className="flex items-center gap-1 p-2 border border-theme rounded bg-card cursor-pointer hover:border-blue-500 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
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
                                                    <>
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
                                                    </>
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
                                                                    className={`px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm ${
                                                                        selectedPickupPlace?._id === place._id ? 'bg-card' : ''
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
                                        <label className="block text-xs font-medium text-primary mb-1">Reference No.</label>
                                        <input
                                            type="text"
                                            placeholder="Ref No"
                                            value={pickupRefNo}
                                            onChange={(e) => setPickupRefNo(e.target.value)}
                                            className="w-full p-2 border border-theme rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm bg-card"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-medium text-primary mb-1">Pickup Date *</label>
                                            <input
                                                type="date"
                                                value={pickupDate}
                                                onChange={(e) => setPickupDate(e.target.value)}
                                                className="w-full p-2 border border-theme rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm bg-card"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-primary mb-1">Time *</label>
                                            <input
                                                type="time"
                                                value={pickupTime}
                                                onChange={(e) => setPickupTime(e.target.value)}
                                                className="w-full p-2 border border-theme rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm bg-card"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-primary mb-1">Appointment</label>
                                        <div className="flex items-center gap-4 mb-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="pickup-appointment"
                                                    value="Yes"
                                                    checked={pickupAppointment === "Yes"}
                                                    onChange={(e) => setPickupAppointment(e.target.value)}
                                                    className="w-4 h-4"
                                                />
                                                <span className="text-sm">Yes</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="pickup-appointment"
                                                    value="No"
                                                    checked={pickupAppointment === "No"}
                                                    onChange={(e) => setPickupAppointment(e.target.value)}
                                                    className="w-4 h-4"
                                                />
                                                <span className="text-sm">No</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-primary mb-1">Note</label>
                                        <textarea
                                            rows={3}
                                            value={pickupNote}
                                            onChange={(e) => setPickupNote(e.target.value)}
                                            className="w-full p-2 border border-theme rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm bg-card"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* DELIVERY Section */}
                            <div className="border border-theme rounded-lg p-4 bg-card">
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" id="delivery-checkbox" className="w-4 h-4" defaultChecked />
                                        <label htmlFor="delivery-checkbox" className="font-medium text-primary text-sm">DELIVERY</label>
                                    </div>
                                </div>
                                
                                <div className="space-y-3">
                                    <div className="relative" ref={deliveryDropdownRef}>
                                        <label className="block text-xs font-medium text-primary mb-1">Location *</label>
                                        <div className="relative">
                                            <div
                                                onClick={() => setDeliveryDropdownOpen(!deliveryDropdownOpen)}
                                                className="flex items-center gap-1 p-2 border border-theme rounded bg-card cursor-pointer hover:border-blue-500 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
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
                                                    <>
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
                                                    </>
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
                                                                    className={`px-3 py-2 cursor-pointer hover:bg-blue-50 text-sm ${
                                                                        selectedDeliveryPlace?._id === place._id ? 'bg-card' : ''
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
                                        <label className="block text-xs font-medium text-primary mb-1">Reference No.</label>
                                        <input
                                            type="text"
                                            placeholder="Ref No"
                                            value={deliveryRefNo}
                                            onChange={(e) => setDeliveryRefNo(e.target.value)}
                                            className="w-full p-2 border border-theme rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm bg-card"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-xs font-medium text-primary mb-1">Delivery Date *</label>
                                            <input
                                                type="date"
                                                value={deliveryDate}
                                                onChange={(e) => setDeliveryDate(e.target.value)}
                                                className="w-full p-2 border border-theme rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm bg-card"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-primary mb-1">Time *</label>
                                            <input
                                                type="time"
                                                value={deliveryTime}
                                                onChange={(e) => setDeliveryTime(e.target.value)}
                                                className="w-full p-2 border border-theme rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm bg-card"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-primary mb-1">Appointment</label>
                                        <div className="flex items-center gap-4 mb-2">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="delivery-appointment"
                                                    value="Yes"
                                                    checked={deliveryAppointment === "Yes"}
                                                    onChange={(e) => setDeliveryAppointment(e.target.value)}
                                                    className="w-4 h-4"
                                                />
                                                <span className="text-sm">Yes</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="delivery-appointment"
                                                    value="No"
                                                    checked={deliveryAppointment === "No"}
                                                    onChange={(e) => setDeliveryAppointment(e.target.value)}
                                                    className="w-4 h-4"
                                                />
                                                <span className="text-sm">No</span>
                                            </label>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-primary mb-1">Note</label>
                                        <textarea
                                            rows={3}
                                            value={deliveryNote}
                                            onChange={(e) => setDeliveryNote(e.target.value)}
                                            className="w-full p-2 border border-theme rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm bg-card"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Distance and Additional Info */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-medium text-primary mb-1">Distance</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Distance"
                                        value={distance}
                                        onChange={(e) => setDistance(e.target.value)}
                                        className="flex-1 p-2 border border-theme rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                                    />
                                    <button className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 flex-shrink-0">
                                        Calculate
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-primary mb-1">Additional Info</label>
                                <div className="flex flex-wrap gap-3">
                                    {(Object.keys(additionalInfo) as Array<keyof typeof additionalInfo>).map((key) => (
                                        <label key={key} className="flex items-center gap-1 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={additionalInfo[key]}
                                                onChange={() => handleAdditionalInfoToggle(key)}
                                                className="w-4 h-4 text-[#00D1FF] rounded focus:ring-blue-500"
                                            />
                                            <span className="text-xs">{key === "OverDimension" ? "Over Dimension" : key}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Fixed Footer */}
            <div className="border-t border-theme p-4 bg-card flex-shrink-0">
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-primary font-medium rounded transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSaveLoad}
                        disabled={loading}
                        className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded transition-colors disabled:opacity-50"
                    >
                        {loading ? "Saving..." : "Save Load"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewLoad;