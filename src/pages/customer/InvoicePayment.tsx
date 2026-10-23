import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CreditCard, CheckCircle, XCircle, Clock, Calendar, User, Mail, Building, Loader2 } from 'lucide-react';
import { getPublicInvoice, createPaymentSession } from '../../axios/api/account.invoices';

interface Trip {
    _id: string;
    tripNumber?: string;
    status?: string;
    driver?: {
        _id: string;
        name: string;
        email?: string;
        phone?: string;
    };
    truck?: {
        _id: string;
        unitNo?: string;
        licensePlate?: string;
        plateNumber?: string;
        makeModel?: string;
        internalId?: string;
        unitType?: string;
    };
    trailer?: {
        _id: string;
        unitNo?: string;
        licensePlate?: string;
        plateNumber?: string;
        makeModel?: string;
        unitType?: string;
        type?: string;
        capacity?: string;
    };
    startLocation?: {
        place?: string;
    };
    endLocation?: {
        place?: string;
    };
    route?: {
        totalDistance?: number;
    };
    plannedStartDate?: string;
    plannedEndDate?: string;
    actualStartDate?: string;
    actualEndDate?: string;
    orders?: Array<{
        _id: string;
        orderNumber: string;
        customerOrderNo?: string;
        commodity?: string;
        weight?: number;
        weightUnit?: string;
        orderType?: string;
        equipment?: string[];
        noOfPackages?: number;
        noOfPackagesType?: string;
        temperature?: number;
        additionalInfo?: {
            HAZMAT?: boolean;
            TARP?: boolean;
            OverDimension?: boolean;
            CSA?: boolean;
        };
        customer?: {
            name: string;
            email?: string;
        };
        pickupLocation?: {
            place?: string;
        };
        deliveryLocation?: {
            place?: string;
        };
    }>;
    notes?: string;
}

interface CompanyInfo {
    _id?: string;
    companyName?: string;
    address?: string;
    contactEmail?: string;
    contactPhone?: string;
    taxNumber?: string;
    logoUrl?: string;
}

interface ServiceBreakdownItem {
    description: string;
    quantity?: number;
    unitPrice: number;
    amount: number;
    taxRate?: number;
    taxAmount?: number;
}

interface Invoice {
    _id: string;
    clientName: string;
    clientEmail: string;
    clientCompany?: string;
    clientAddress?: string;
    clientPhone?: string;
    loadId?: string;
    tripId?: string | Trip;
    amount: string;
    currency: string;
    status: 'paid' | 'pending';
    invoiceDate: string;
    dueDate: string;
    paymentDate: string | null;
    paymentTerms?: string;
    invoiceUrl: string;
    notes: string;
    serviceBreakdown?: ServiceBreakdownItem[];
    subtotal?: number;
    taxAmount?: number;
    taxNumber?: string;
    company?: CompanyInfo | string;
    createdAt: string;
    updatedAt: string;
}

const InvoicePayment: React.FC = () => {
    const { invoiceId } = useParams<{ invoiceId: string }>();
    const [searchParams] = useSearchParams();
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(true);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'cancel' | null>(null);

    useEffect(() => {
        const status = searchParams.get('status');
        if (status) {
            setPaymentStatus(status as 'success' | 'cancel');
        }
    }, [searchParams]);

    useEffect(() => {
        if (invoiceId) {
            fetchInvoice();
        }
    }, [invoiceId]);

    const fetchInvoice = async () => {
        console.log('🔍 InvoicePayment: fetchInvoice called');
        console.log('🔍 Invoice ID:', invoiceId);
        
        try {
            setLoading(true);
            console.log('📡 Making API call to get public invoice...');
            const response = await getPublicInvoice(invoiceId!);
            console.log('📡 API Response:', response);
            
            if (response && response.success) {
                console.log('✅ Invoice fetched successfully:', response.data);
                setInvoice(response.data);
            } else {
                console.log('❌ API returned error:', response?.message);
                setError(response?.message || 'Failed to fetch invoice');
            }
        } catch (error) {
            console.error('❌ Error fetching invoice:', error);
            setError('Failed to fetch invoice');
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async () => {
        if (!invoice) return;

        try {
            setPaymentLoading(true);
            const response = await createPaymentSession(invoice._id);
            
            if (response && response.success && response.url) {
                // Redirect to Stripe checkout
                window.location.href = response.url;
            } else {
                setError(response?.message || 'Failed to create payment session');
            }
        } catch (error) {
            console.error('Payment error:', error);
            setError('Failed to process payment');
        } finally {
            setPaymentLoading(false);
        }
    };

    const formatCurrency = (amount: string, currency: string) => {
        const numAmount = parseFloat(amount);
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.toUpperCase(),
        }).format(numAmount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-card flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#00D1FF]" />
                    <p className="text-secondary">Loading invoice...</p>
                </div>
            </div>
        );
    }

    if (error || !invoice) {
        return (
            <div className="min-h-screen bg-card flex items-center justify-center">
                <div className="text-center">
                    <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-primary mb-2">Invoice Not Found</h1>
                    <p className="text-secondary">{error || 'The invoice you are looking for does not exist.'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-card py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="bg-card rounded-lg shadow-sm border border-theme p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-primary">Invoice Payment</h1>
                            <p className="text-secondary mt-1">Invoice #{invoice._id.slice(-8)}</p>
                        </div>
                        <div className="text-right">
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                invoice.status === 'paid' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                            }`}>
                                {invoice.status === 'paid' ? (
                                    <>
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Paid
                                    </>
                                ) : (
                                    <>
                                        <Clock className="h-4 w-4 mr-1" />
                                        Pending
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payment Status Messages */}
                {paymentStatus === 'success' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center">
                            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                            <p className="text-green-800 font-medium">Payment Successful!</p>
                        </div>
                        <p className="text-green-700 mt-1">Your payment has been processed successfully.</p>
                    </div>
                )}

                {paymentStatus === 'cancel' && (
                    <div className="bg-card border border-yellow-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center">
                            <XCircle className="h-5 w-5 text-yellow-500 mr-2" />
                            <p className="text-yellow-800 font-medium">Payment Cancelled</p>
                        </div>
                        <p className="text-yellow-700 mt-1">You can try again when you're ready.</p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Invoice Details */}
                    <div className="lg:col-span-2">
                        <div className="bg-card rounded-lg shadow-sm border border-theme p-6">
                            <h2 className="text-xl font-semibold text-primary mb-4">Invoice Details</h2>
                            
                            {/* Company Information */}
                            {invoice.company && typeof invoice.company === 'object' && (
                                <div className="mb-6 pb-6 border-b border-theme">
                                    <h3 className="text-sm font-medium text-secondary uppercase tracking-wide mb-3">From</h3>
                                    <div className="space-y-2">
                                        <div className="font-semibold text-primary">{invoice.company.companyName}</div>
                                        {invoice.company.address && (
                                            <div className="text-secondary text-sm">{invoice.company.address}</div>
                                        )}
                                        <div className="flex flex-wrap gap-4 text-sm text-secondary">
                                            {invoice.company.contactPhone && <span>Phone: {invoice.company.contactPhone}</span>}
                                            {invoice.company.contactEmail && <span>Email: {invoice.company.contactEmail}</span>}
                                            {invoice.company.taxNumber && <span>Tax #: {invoice.company.taxNumber}</span>}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Client Information */}
                                <div>
                                    <h3 className="text-sm font-medium text-secondary uppercase tracking-wide mb-3">Bill To</h3>
                                    <div className="space-y-2">
                                        <div className="flex items-center">
                                            <User className="h-4 w-4 text-secondary mr-2" />
                                            <span className="text-primary font-medium">{invoice.clientName}</span>
                                        </div>
                                        {invoice.clientCompany && (
                                            <div className="flex items-center">
                                                <Building className="h-4 w-4 text-secondary mr-2" />
                                                <span className="text-secondary">{invoice.clientCompany}</span>
                                            </div>
                                        )}
                                        {invoice.clientAddress && (
                                            <div className="text-secondary text-sm ml-6">{invoice.clientAddress}</div>
                                        )}
                                        {invoice.clientEmail && (
                                            <div className="flex items-center">
                                                <Mail className="h-4 w-4 text-secondary mr-2" />
                                                <span className="text-secondary">{invoice.clientEmail}</span>
                                            </div>
                                        )}
                                        {invoice.clientPhone && (
                                            <div className="flex items-center">
                                                <Mail className="h-4 w-4 text-secondary mr-2" />
                                                <span className="text-secondary">Phone: {invoice.clientPhone}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Invoice Information */}
                                <div>
                                    <h3 className="text-sm font-medium text-secondary uppercase tracking-wide mb-3">Invoice Info</h3>
                                    <div className="space-y-2">
                                        <div className="flex items-center">
                                            <Calendar className="h-4 w-4 text-secondary mr-2" />
                                            <span className="text-secondary">Issued: {formatDate(invoice.invoiceDate)}</span>
                                        </div>
                                        <div className="flex items-center">
                                            <Calendar className="h-4 w-4 text-secondary mr-2" />
                                            <span className="text-secondary">Due: {formatDate(invoice.dueDate)}</span>
                                        </div>
                                        {invoice.paymentDate && (
                                            <div className="flex items-center">
                                                <CheckCircle className="h-4 w-4 text-secondary mr-2" />
                                                <span className="text-secondary">Paid: {formatDate(invoice.paymentDate)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Service Breakdown */}
                            {invoice.serviceBreakdown && invoice.serviceBreakdown.length > 0 && (
                                <div className="mt-6 pt-6 border-t border-theme">
                                    <h3 className="text-sm font-medium text-secondary uppercase tracking-wide mb-4">Service Breakdown</h3>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-theme">
                                            <thead className="bg-card">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Description</th>
                                                    <th className="px-4 py-3 text-center text-xs font-medium text-secondary uppercase tracking-wider">Qty</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">Unit Price</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">Amount</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">Tax</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-card divide-y divide-theme">
                                                {invoice.serviceBreakdown.map((item, index) => {
                                                    const itemAmount = item.amount || (item.unitPrice * (item.quantity || 1));
                                                    const itemTax = item.taxAmount || (itemAmount * ((item.taxRate || 0) / 100));
                                                    return (
                                                        <tr key={index}>
                                                            <td className="px-4 py-3 text-sm text-primary">{item.description}</td>
                                                            <td className="px-4 py-3 text-sm text-secondary text-center">{item.quantity || 1}</td>
                                                            <td className="px-4 py-3 text-sm text-secondary text-right">{formatCurrency(item.unitPrice.toString(), invoice.currency)}</td>
                                                            <td className="px-4 py-3 text-sm text-primary text-right font-medium">{formatCurrency(itemAmount.toString(), invoice.currency)}</td>
                                                            <td className="px-4 py-3 text-sm text-secondary text-right">{formatCurrency(itemTax.toString(), invoice.currency)}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot className="bg-card">
                                                <tr>
                                                    <td colSpan={3} className="px-4 py-3 text-sm font-medium text-primary text-right">Subtotal:</td>
                                                    <td className="px-4 py-3 text-sm font-medium text-primary text-right">
                                                        {formatCurrency((invoice.subtotal || parseFloat(invoice.amount)).toString(), invoice.currency)}
                                                    </td>
                                                    <td></td>
                                                </tr>
                                                {invoice.taxAmount && invoice.taxAmount > 0 && (
                                                    <tr>
                                                        <td colSpan={3} className="px-4 py-3 text-sm font-medium text-primary text-right">
                                                            Tax {invoice.taxNumber ? `(${invoice.taxNumber})` : '(GST/HST)'}:
                                                        </td>
                                                        <td className="px-4 py-3 text-sm font-medium text-primary text-right">
                                                            {formatCurrency(invoice.taxAmount.toString(), invoice.currency)}
                                                        </td>
                                                        <td></td>
                                                    </tr>
                                                )}
                                                <tr>
                                                    <td colSpan={3} className="px-4 py-3 text-sm font-bold text-primary text-right">Total:</td>
                                                    <td className="px-4 py-3 text-sm font-bold text-primary text-right">
                                                        {formatCurrency(invoice.amount, invoice.currency)}
                                                    </td>
                                                    <td></td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Trip & Load Information */}
                            {invoice.tripId && typeof invoice.tripId === 'object' && (
                                <div className="mt-6 pt-6 border-t border-theme">
                                    <h3 className="text-sm font-medium text-secondary uppercase tracking-wide mb-4">Trip & Load Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {invoice.tripId.tripNumber && (
                                            <div>
                                                <span className="text-xs font-medium text-secondary">Trip Number</span>
                                                <p className="text-primary font-medium">{invoice.tripId.tripNumber}</p>
                                            </div>
                                        )}
                                        {invoice.tripId.truck && (
                                            <div>
                                                <span className="text-xs font-medium text-secondary">Truck</span>
                                                <p className="text-primary font-medium">
                                                    {[
                                                        invoice.tripId.truck.licensePlate || invoice.tripId.truck.plateNumber,
                                                        invoice.tripId.truck.makeModel,
                                                        invoice.tripId.truck.unitType ? `(${invoice.tripId.truck.unitType})` : ''
                                                    ].filter(Boolean).join(' ') || 'N/A'}
                                                </p>
                                            </div>
                                        )}
                                        {invoice.tripId.trailer && (
                                            <div>
                                                <span className="text-xs font-medium text-secondary">Trailer</span>
                                                <p className="text-primary font-medium">
                                                    {(() => {
                                                        const trailerTypeMap: { [key: string]: string } = {
                                                            'dry_van': 'Dry Van',
                                                            'refrigerated': 'Reefer',
                                                            'flatbed': 'Flatbed',
                                                            'tanker': 'Tanker',
                                                            'container': 'Container'
                                                        };
                                                        const trailerType = invoice.tripId.trailer?.type 
                                                            ? (trailerTypeMap[invoice.tripId.trailer.type] || invoice.tripId.trailer.type)
                                                            : '';
                                                        return [
                                                            invoice.tripId.trailer.licensePlate || invoice.tripId.trailer.plateNumber,
                                                            trailerType,
                                                            invoice.tripId.trailer.capacity ? `(${invoice.tripId.trailer.capacity})` : ''
                                                        ].filter(Boolean).join(' ') || 'N/A';
                                                    })()}
                                                </p>
                                            </div>
                                        )}
                                        {invoice.tripId.startLocation?.place && (
                                            <div>
                                                <span className="text-xs font-medium text-secondary">Origin</span>
                                                <p className="text-primary font-medium">{invoice.tripId.startLocation.place}</p>
                                            </div>
                                        )}
                                        {invoice.tripId.endLocation?.place && (
                                            <div>
                                                <span className="text-xs font-medium text-secondary">Destination</span>
                                                <p className="text-primary font-medium">{invoice.tripId.endLocation.place}</p>
                                            </div>
                                        )}
                                        {invoice.tripId.route?.totalDistance && (
                                            <div>
                                                <span className="text-xs font-medium text-secondary">Miles Covered</span>
                                                <p className="text-primary font-medium">
                                                    {((invoice.tripId.route.totalDistance || 0) * 0.621371).toFixed(2)} miles ({invoice.tripId.route.totalDistance.toFixed(2)} km)
                                                </p>
                                            </div>
                                        )}
                                        {invoice.tripId.actualStartDate && (
                                            <div>
                                                <span className="text-xs font-medium text-secondary">Start Date</span>
                                                <p className="text-primary font-medium">{formatDate(invoice.tripId.actualStartDate)}</p>
                                            </div>
                                        )}
                                        {invoice.tripId.actualEndDate && (
                                            <div>
                                                <span className="text-xs font-medium text-secondary">End Date</span>
                                                <p className="text-primary font-medium">{formatDate(invoice.tripId.actualEndDate)}</p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Load Details */}
                                    {invoice.tripId.orders && invoice.tripId.orders.length > 0 && (() => {
                                        let totalWeight = 0;
                                        const weightUnits: string[] = [];
                                        const commodities: string[] = [];
                                        const orderTypes: string[] = [];
                                        const equipmentList: string[] = [];
                                        let hasTemperature = false;
                                        let temperatureValue: number | null = null;
                                        const specialFlags: string[] = [];
                                        
                                        invoice.tripId.orders.forEach((order) => {
                                            if (order.weight) {
                                                totalWeight += order.weight;
                                                if (order.weightUnit && !weightUnits.includes(order.weightUnit)) {
                                                    weightUnits.push(order.weightUnit);
                                                }
                                            }
                                            if (order.commodity && !commodities.includes(order.commodity)) {
                                                commodities.push(order.commodity);
                                            }
                                            if (order.orderType && !orderTypes.includes(order.orderType)) {
                                                orderTypes.push(order.orderType);
                                            }
                                            if (order.equipment && Array.isArray(order.equipment)) {
                                                order.equipment.forEach((eq) => {
                                                    if (!equipmentList.includes(eq)) {
                                                        equipmentList.push(eq);
                                                    }
                                                });
                                            }
                                            if (order.temperature !== null && order.temperature !== undefined) {
                                                hasTemperature = true;
                                                temperatureValue = order.temperature;
                                            }
                                            if (order.additionalInfo) {
                                                if (order.additionalInfo.HAZMAT) specialFlags.push('HAZMAT');
                                                if (order.additionalInfo.TARP) specialFlags.push('TARP');
                                                if (order.additionalInfo.OverDimension) specialFlags.push('Over Dimension');
                                                if (order.additionalInfo.CSA) specialFlags.push('CSA');
                                            }
                                        });
                                        
                                        return (
                                            <div className="mt-6 pt-6 border-t border-theme">
                                                <h4 className="text-sm font-medium text-primary mb-3">Load Details</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {commodities.length > 0 && (
                                                        <div>
                                                            <span className="text-xs font-medium text-secondary">Product/Load Type</span>
                                                            <p className="text-primary font-medium">{commodities.join(', ')}</p>
                                                        </div>
                                                    )}
                                                    {orderTypes.length > 0 && (
                                                        <div>
                                                            <span className="text-xs font-medium text-secondary">Order Type</span>
                                                            <p className="text-primary font-medium">{orderTypes.join(', ')}</p>
                                                        </div>
                                                    )}
                                                    {totalWeight > 0 && (
                                                        <div>
                                                            <span className="text-xs font-medium text-secondary">Total Load Weight</span>
                                                            <p className="text-primary font-medium">
                                                                {totalWeight.toFixed(2)} {weightUnits.length > 0 ? weightUnits[0] : 'kg'}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {equipmentList.length > 0 && (
                                                        <div>
                                                            <span className="text-xs font-medium text-secondary">Equipment</span>
                                                            <p className="text-primary font-medium">{equipmentList.join(', ')}</p>
                                                        </div>
                                                    )}
                                                    {hasTemperature && temperatureValue !== null && (
                                                        <div>
                                                            <span className="text-xs font-medium text-secondary">Temperature</span>
                                                            <p className="text-primary font-medium">{temperatureValue}°C</p>
                                                        </div>
                                                    )}
                                                    {specialFlags.length > 0 && (
                                                        <div>
                                                            <span className="text-xs font-medium text-secondary">Special Requirements</span>
                                                            <p className="text-primary font-medium">{specialFlags.join(', ')}</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="mt-4">
                                                    <span className="text-xs font-medium text-secondary">Orders</span>
                                                    <div className="mt-2 space-y-2">
                                                        {invoice.tripId.orders.map((order, index) => (
                                                            <div key={order._id} className="text-sm text-primary">
                                                                <span className="font-medium">{index + 1}. {order.customerOrderNo || `Order ${index + 1}`}</span>
                                                                {order.customer?.name && <span className="text-secondary"> - {order.customer.name}</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            {/* Notes */}
                            {invoice.notes && (
                                <div className="mt-6 pt-6 border-t border-theme">
                                    <h3 className="text-sm font-medium text-secondary uppercase tracking-wide mb-2">Notes</h3>
                                    <p className="text-secondary">{invoice.notes}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Payment Section */}
                    <div className="lg:col-span-1">
                        <div className="bg-card rounded-lg shadow-sm border border-theme p-6 sticky top-6">
                            <h2 className="text-xl font-semibold text-primary mb-4">Payment</h2>
                            
                            <div className="space-y-4">
                                {/* Amount */}
                                <div className="flex items-center justify-between py-3 border-b border-theme">
                                    <span className="text-secondary">Amount Due</span>
                                    <span className="text-2xl font-bold text-primary">
                                        {formatCurrency(invoice.amount, invoice.currency)}
                                    </span>
                                </div>

                                {/* Payment Button */}
                                {invoice.status === 'pending' && (
                                    <button
                                        onClick={handlePayment}
                                        disabled={paymentLoading}
                                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                                    >
                                        {paymentLoading ? (
                                            <>
                                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <CreditCard className="h-5 w-5 mr-2" />
                                                Pay Now
                                            </>
                                        )}
                                    </button>
                                )}

                                {invoice.status === 'paid' && (
                                    <div className="text-center py-4">
                                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                                        <p className="text-green-600 font-medium">Payment Complete</p>
                                        <p className="text-sm text-secondary mt-1">
                                            Paid on {formatDate(invoice.paymentDate!)}
                                        </p>
                                    </div>
                                )}

                                {/* Security Notice */}
                                <div className="text-xs text-secondary text-center">
                                    <p>🔒 Secure payment powered by Stripe</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center text-sm text-secondary">
                    <p>If you have any questions about this invoice, please contact us.</p>
                </div>
            </div>
        </div>
    );
};

export default InvoicePayment;
