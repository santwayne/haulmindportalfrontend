import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Clock, AlertTriangle, Truck, Wrench, CheckCircle, Search, Bell, Plus, X, FileText, Edit, Trash2 } from 'lucide-react';
import { FaCheckCircle, FaExclamationCircle, FaTimes, FaInfoCircle } from 'react-icons/fa';
import ConfirmationModal from '../../../../components/common/ConfirmationModal';
import { getMaintenanceSchedule, getMaintenanceCostReport } from "../../../../axios/api/fleet.maintenance"
import {
    createVehicleService,
    updateVehicleService,
    updateServiceStatus,
    deleteVehicleService,
    listVehicleServices,
    type VehicleServiceData,
    type UpdateServiceData,
    type ServiceFilters,
    type VehicleServiceResponse
} from "../../../../axios/api/vehicleService"
import { listUsers } from "../../../../axios/api/admin"

// Type Definitions
interface UpcomingService {
    serviceType: string;
    serviceOdometer: number;
    scheduledDate?: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
}

interface Vehicle {
    _id: string;
    plateNumber: string;
    make?: string;
    model?: string;
    year?: number;
    vinNumber?: string;
    odometer: number;
    currentOdometer?: number;
    status?: string;
    upcomingServices?: UpcomingService[];
}

interface CostReportItem {
    vehicleId: string;
    plateNumber: string;
    make?: string;
    model?: string;
    year: number;
    month: number;
    totalCost: number;
    avgCost?: number;
    workOrders: number;
}

interface Alert {
    id: string;
    message: string;
    type: 'critical' | 'warning' | 'info';
    vehicle: string;
    details: {
        vehicleInfo: {
            id: string;
            type: string;
            year?: number;
            make?: string;
            model?: string;
            vin?: string;
            currentMileage?: number;
        };
        issue: {
            serviceType: string;
            originalDueDate?: string;
            dueMileage?: number;
            remainingKm?: number;
            complianceRisk: string;
        };
        estimatedCost: string;
        estimatedTime: string;
        priority?: string;
        location: string;
    };
}

interface Mechanic {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
}

type NotificationType = 'success' | 'error' | 'info';

interface ToastNotification {
    id: number;
    type: NotificationType;
    message: string;
}

// Toast Notification Component
const ToastNotification = ({ notification, onClose }: { notification: ToastNotification; onClose: (id: number) => void }) => {
    const icons = {
        success: <FaCheckCircle className="text-green-500" size={24} />,
        error: <FaExclamationCircle className="text-red-500" size={24} />,
        info: <FaInfoCircle className="text-blue-500" size={24} />
    };

    const bgColors = {
        success: 'bg-green-50 border-green-200',
        error: 'bg-card border-red-200',
        info: 'bg-card border-blue-200'
    };

    useEffect(() => {
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

const MaintenanceSchedule = () => {
    const [showScheduleForm, setShowScheduleForm] = useState<boolean>(false);
    const [showAlertDetails, setShowAlertDetails] = useState<Alert | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; serviceId: string | null }>({ show: false, serviceId: null });
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [costReport, setCostReport] = useState<CostReportItem[]>([]);
    const [selectedYear] = useState<number>(new Date().getFullYear());

    // Vehicle Service State
    const [vehicleServices, setVehicleServices] = useState<VehicleServiceResponse[]>([]);
    const [editingService, setEditingService] = useState<VehicleServiceResponse | null>(null);
    const [serviceFilters, setServiceFilters] = useState<ServiceFilters>({});
    const [servicesLoading, setServicesLoading] = useState<boolean>(false);
    const [emptyStateMessage, setEmptyStateMessage] = useState<string | null>(null);
    const [userInfo, setUserInfo] = useState<any>(null);
    const [userInfoReady, setUserInfoReady] = useState<boolean>(false);
    const [mechanics, setMechanics] = useState<Mechanic[]>([]);
    const [loadingMechanics, setLoadingMechanics] = useState<boolean>(false);
    const [notifications, setNotifications] = useState<ToastNotification[]>([]);
    const notificationIdRef = useRef<number>(0);

    const sanitizeMessage = useCallback((message?: string | null) => {
        if (!message) return null;
        return message.toLowerCase().includes('no company assigned') ? null : message;
    }, []);

    const pushBannerMessage = useCallback((message?: string | null) => {
        const sanitized = sanitizeMessage(message);
        if (!sanitized) return;
        setEmptyStateMessage(prev => prev || sanitized);
    }, [sanitizeMessage]);

    const addNotification = (type: NotificationType, message: string) => {
        const id = ++notificationIdRef.current;
        setNotifications(prev => [...prev, { id, type, message }]);
    };

    const removeNotification = (id: number) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const [scheduleForm, setScheduleForm] = useState({
        vehicle: '',
        serviceType: '',
        priority: 'medium',
        dueDate: '',
        dueMileage: '',
        assignedMechanic: '',
        estimatedCost: '',
        estimatedTime: '',
        description: '',
        recurringService: false,
        recurringInterval: '',
        // Service Type Configuration
        mileageInterval: '', // Service interval in km
        timeInterval: '', // Service interval in days
        useMileageInterval: true,
        useTimeInterval: true,
        // New fields
        serviceDate: '',
        unitNumber: '',
        makeModel: '',
        vinLicensePlate: '',
        odometer: '',
        parts: '',
        notes: '',
        serviceProvider: '',
        invoiceNumber: ''
    });

    // Service Type Configuration - Default intervals for each service type
    const serviceTypeIntervals: { [key: string]: { mileage: number; days: number } } = {
        'oil-change': { mileage: 15000, days: 90 },
        'tire-rotation': { mileage: 10000, days: 180 },
        'brake-inspection': { mileage: 25000, days: 365 },
        'general-maintenance': { mileage: 20000, days: 180 },
        'other': { mileage: 0, days: 0 }
    };


    // State for vehicle's current odometer
    const [currentOdometer, setCurrentOdometer] = useState<number | null>(null);

    // Fetch data on component mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem('userInfo');
            if (stored) {
                setUserInfo(JSON.parse(stored));
            }
        } catch (err) {
            console.error('Error parsing userInfo from localStorage:', err);
        } finally {
            setUserInfoReady(true);
        }
    }, []);

    useEffect(() => {
        if (!userInfoReady) {
            return;
        }

        const userRole = userInfo?.role || userInfo?.userData?.role;
        const userCompany = userInfo?.company || userInfo?.userData?.company;
        const isSuperadmin = userRole === 'superadmin';
        const isFleetManager = userRole === 'Fleet Maintenance Manager';
        const hasCompany = Boolean(userCompany);

        if (!isSuperadmin && !hasCompany && !isFleetManager) {
            setVehicles([]);
            setVehicleServices([]);
            setCostReport([]);
            setEmptyStateMessage(null);
            setLoading(false);
            return;
        }

        fetchMaintenanceData();
        fetchVehicleServices();
        fetchCostReport();
        fetchMechanics();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userInfoReady, userInfo]);

    // Fetch vehicle services when filters change
    useEffect(() => {
        if (!userInfoReady) {
            return;
        }
        fetchVehicleServices();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [serviceFilters]);

    useEffect(() => {
        if (!userInfoReady) {
            return;
        }
        if (selectedYear) {
            fetchCostReport();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedYear]);

    const fetchMaintenanceData = async () => {
        setLoading(true);
        try {
            const response = await getMaintenanceSchedule();
            if (response.success) {
                const data = response.data || [];
                setVehicles(data);
                if (data.length === 0) {
                    pushBannerMessage(response.message);
                } else {
                    setEmptyStateMessage(null);
                }
            }
            if (response.success === false && response.message) {
                setVehicles([]);
                pushBannerMessage(response.message);
            }
        } catch (error) {
            console.error('Error fetching maintenance schedule:', error);
            setVehicles([]);
            pushBannerMessage('Failed to load maintenance schedule.');
        } finally {
            setLoading(false);
        }
    };

    const fetchCostReport = async () => {
        try {
            const response = await getMaintenanceCostReport({ year: selectedYear });
            if (response.success) {
                const data = response.data || [];
                setCostReport(data);
                if (data.length === 0) {
                    pushBannerMessage(response.message);
                }
            } else if (response?.message) {
                setCostReport([]);
                pushBannerMessage(response.message);
            }
        } catch (error) {
            console.error('Error fetching cost report:', error);
            setCostReport([]);
            pushBannerMessage('Failed to load maintenance cost report.');
        }
    };

    // ✅ VEHICLE SERVICE API FUNCTIONS
    const fetchVehicleServices = async () => {
        setServicesLoading(true);
        try {
            console.log('🔄 Fetching vehicle services with filters:', serviceFilters);
            const response = await listVehicleServices(serviceFilters);
            if (response?.success) {
                console.log('✅ Vehicle services fetched successfully:', response.data?.length || 0, 'services');
                const data = response.data || [];
                setVehicleServices(data);
                if (data.length === 0) {
                    pushBannerMessage(response.message);
                }
            } else {
                console.error('❌ Failed to fetch vehicle services:', response?.message);
                setVehicleServices([]);
                pushBannerMessage(response?.message || 'Failed to load vehicle services.');
            }
        } catch (error) {
            console.error('❌ Error fetching vehicle services:', error);
            setVehicleServices([]);
            pushBannerMessage('Failed to load vehicle services.');
        } finally {
            setServicesLoading(false);
        }
    };

    const createService = async (serviceData: VehicleServiceData) => {
        try {
            const response = await createVehicleService(serviceData);
            if (response?.success) {
                console.log('Service created successfully:', response);
                fetchVehicleServices(); // Refresh the list
                return response;
            } else {
                console.error('Failed to create service:', response?.message);
                return response;
            }
        } catch (error) {
            console.error('Error creating service:', error);
            return null;
        }
    };

    const updateService = async (serviceId: string, updateData: UpdateServiceData) => {
        try {
            const response = await updateVehicleService(serviceId, updateData);
            if (response?.success) {
                console.log('Service updated successfully:', response);
                fetchVehicleServices(); // Refresh the list
                return response;
            } else {
                console.error('Failed to update service:', response?.message);
                return response;
            }
        } catch (error) {
            console.error('Error updating service:', error);
            return null;
        }
    };

    const updateServiceStatusAPI = async (serviceId: string, status: 'pending' | 'in-progress' | 'completed') => {
        try {
            const response = await updateServiceStatus(serviceId, status);
            if (response?.success) {
                console.log('Service status updated successfully:', response);
                fetchVehicleServices(); // Refresh the list
                return response;
            } else {
                console.error('Failed to update service status:', response?.message);
                return response;
            }
        } catch (error) {
            console.error('Error updating service status:', error);
            return null;
        }
    };

    const deleteService = async (serviceId: string) => {
        try {
            const response = await deleteVehicleService(serviceId);
            if (response?.success) {
                console.log('Service deleted successfully:', response);
                fetchVehicleServices(); // Refresh the list
                return response;
            } else {
                console.error('Failed to delete service:', response?.message);
                return response;
            }
        } catch (error) {
            console.error('Error deleting service:', error);
            return null;
        }
    };

    // ✅ SERVICE FORM HANDLERS
    const handleCreateService = async () => {
        if (!scheduleForm.vehicle || !scheduleForm.serviceType || !scheduleForm.dueDate || !scheduleForm.assignedMechanic) {
            console.error('Please fill in all required fields');
            addNotification('error', 'Please fill in all required fields: Vehicle, Service Type, Due Date, and Assigned Mechanic');
            return;
        }

        // Convert service type to correct format (with hyphens)
        const serviceTypeMap: { [key: string]: string } = {
            'oil_change': 'oil-change',
            'tire_rotation': 'tire-rotation',
            'bike_inspection': 'bike-inspection',
            'general_maintenance': 'general-maintenance',
            'other': 'other'
        };

        const validServiceType = serviceTypeMap[scheduleForm.serviceType] || scheduleForm.serviceType;

        const serviceData: VehicleServiceData & {
            serviceDate?: string;
            unitNumber?: string;
            makeModel?: string;
            vinLicensePlate?: string;
            odometer?: number;
            parts?: string;
            notes?: string;
            serviceProvider?: string;
            invoiceNumber?: string;
            estimatedCost?: number;
            estimatedTime?: string;
        } = {
            vehicleId: scheduleForm.vehicle,
            serviceType: validServiceType as any,
            priority: scheduleForm.priority as any,
            dueDate: scheduleForm.dueDate,
            dueMileage: parseInt(scheduleForm.dueMileage) || 0,
            assignedMechanic: scheduleForm.assignedMechanic, // This should be an ObjectId string
            description: scheduleForm.description,
            // Additional fields
            serviceDate: scheduleForm.serviceDate || undefined,
            unitNumber: scheduleForm.unitNumber || undefined,
            makeModel: scheduleForm.makeModel || undefined,
            vinLicensePlate: scheduleForm.vinLicensePlate || undefined,
            odometer: parseInt(scheduleForm.odometer) || undefined,
            parts: scheduleForm.parts || undefined,
            notes: scheduleForm.notes || undefined,
            serviceProvider: scheduleForm.serviceProvider || undefined,
            invoiceNumber: scheduleForm.invoiceNumber || undefined,
            estimatedCost: scheduleForm.estimatedCost ? parseFloat(scheduleForm.estimatedCost) : undefined,
            estimatedTime: scheduleForm.estimatedTime || undefined
        };

        console.log('Creating service with data:', serviceData);

        const result = await createService(serviceData);
        if (result?.success) {
            addNotification('success', result?.message || 'Service created successfully!');
            setShowScheduleForm(false);
            // Reset form
            setScheduleForm({
                vehicle: '',
                serviceType: '',
                priority: 'medium',
                dueDate: '',
                dueMileage: '',
                assignedMechanic: '',
                estimatedCost: '',
                estimatedTime: '',
                description: '',
                recurringService: false,
                recurringInterval: '',
                mileageInterval: '',
                timeInterval: '',
                useMileageInterval: true,
                useTimeInterval: true,
                serviceDate: '',
                unitNumber: '',
                makeModel: '',
                vinLicensePlate: '',
                odometer: '',
                parts: '',
                notes: '',
                serviceProvider: '',
                invoiceNumber: ''
            });
        } else {
            console.error('Failed to create service:', result?.message);
            addNotification('error', `Failed to create service: ${result?.message || 'Unknown error'}`);
        }
    };

    const handleUpdateService = async (serviceId: string) => {
        const updateData: UpdateServiceData & {
            serviceDate?: string;
            unitNumber?: string;
            makeModel?: string;
            vinLicensePlate?: string;
            odometer?: number;
            parts?: string;
            notes?: string;
            serviceProvider?: string;
            invoiceNumber?: string;
            estimatedCost?: number;
            estimatedTime?: string;
        } = {
            vehicleId: scheduleForm.vehicle,
            serviceType: scheduleForm.serviceType as any,
            priority: scheduleForm.priority as any,
            dueDate: scheduleForm.dueDate,
            dueMileage: parseInt(scheduleForm.dueMileage) || 0,
            assignedMechanic: scheduleForm.assignedMechanic,
            description: scheduleForm.description,
            // Additional fields
            serviceDate: scheduleForm.serviceDate || undefined,
            unitNumber: scheduleForm.unitNumber || undefined,
            makeModel: scheduleForm.makeModel || undefined,
            vinLicensePlate: scheduleForm.vinLicensePlate || undefined,
            odometer: parseInt(scheduleForm.odometer) || undefined,
            parts: scheduleForm.parts || undefined,
            notes: scheduleForm.notes || undefined,
            serviceProvider: scheduleForm.serviceProvider || undefined,
            invoiceNumber: scheduleForm.invoiceNumber || undefined,
            estimatedCost: scheduleForm.estimatedCost ? parseFloat(scheduleForm.estimatedCost) : undefined,
            estimatedTime: scheduleForm.estimatedTime || undefined
        };

        const result = await updateService(serviceId, updateData);
        if (result?.success) {
            addNotification('success', result?.message || 'Service updated successfully!');
            setShowScheduleForm(false);
            setEditingService(null);
        } else {
            addNotification('error', `Failed to update service: ${result?.message || 'Unknown error'}`);
        }
    };

    const handleEditService = (service: VehicleServiceResponse) => {
        setEditingService(service);
        setScheduleForm({
            vehicle: service.vehicleId?._id || '',
            serviceType: service.serviceType,
            priority: service.priority,
            dueDate: service.dueDate ? service.dueDate.split('T')[0] : '',
            dueMileage: service.dueMileage ? service.dueMileage.toString() : '',
            assignedMechanic: (typeof service.assignedMechanic === 'object' && service.assignedMechanic?._id) || (typeof service.assignedMechanic === 'string' ? service.assignedMechanic : ''),
            estimatedCost: (service as any).estimatedCost?.toString() || '',
            estimatedTime: (service as any).estimatedTime || '',
            description: service.description || '',
            recurringService: false,
            recurringInterval: '',
            mileageInterval: '',
            timeInterval: '',
            useMileageInterval: true,
            useTimeInterval: true,
            // New fields - can be populated from service data if available
            serviceDate: (service as any).serviceDate?.split('T')[0] || '',
            unitNumber: service.vehicleId?.plateNumber || (service as any).unitNumber || '',
            makeModel: service.vehicleId?.make && service.vehicleId?.model
                ? `${service.vehicleId.make} ${service.vehicleId.model}`
                : (service as any).makeModel || '',
            vinLicensePlate: (service as any).vinLicensePlate || service.vehicleId?.plateNumber || '',
            odometer: (service as any).odometer?.toString() || '',
            parts: (service as any).parts || '',
            notes: (service as any).notes || '',
            serviceProvider: (service as any).serviceProvider || '',
            invoiceNumber: (service as any).invoiceNumber || ''
        });
        setShowScheduleForm(true);
    };

    const handleStatusChange = async (serviceId: string, newStatus: 'pending' | 'in-progress' | 'completed') => {
        const result = await updateServiceStatusAPI(serviceId, newStatus);
        if (result?.success) {
            addNotification('success', result?.message || 'Service status updated successfully!');
        } else {
            addNotification('error', `Failed to update service status: ${result?.message || 'Unknown error'}`);
        }
    };

    const fetchMechanics = async () => {
        setLoadingMechanics(true);
        try {
            const res = await listUsers('Maintenance Crew (Mechanics)');
            if (res?.success && Array.isArray(res.data)) {
                setMechanics(res.data);
            } else {
                console.error('Failed to fetch mechanics:', res?.message);
                setMechanics([]);
            }
        } catch (err: any) {
            console.error("Error fetching mechanics:", err);
            setMechanics([]);
        } finally {
            setLoadingMechanics(false);
        }
    };

    const serviceTypes = [
        'oil_change', 'tire_rotation', 'brake_inspection', 'general_maintenance', 'other'
    ];

    // Generate alerts from vehicle data
    const generateAlerts = (): Alert[] => {
        const alerts: Alert[] = [];
        vehicles.forEach((vehicle: Vehicle) => {
            if (vehicle.upcomingServices && vehicle.upcomingServices.length > 0) {
                vehicle.upcomingServices.forEach((service: UpcomingService) => {
                    const daysUntilService = service.scheduledDate
                        ? Math.ceil((new Date(service.scheduledDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                        : null;

                    const currentOdo = vehicle.currentOdometer || vehicle.odometer || 0;
                    const kmUntilService = service.serviceOdometer - currentOdo;

                    let alertType: 'critical' | 'warning' | 'info' = 'info';
                    let message = '';

                    if (kmUntilService <= 0) {
                        alertType = 'critical';
                        message = `${vehicle.plateNumber} ${service.serviceType} is overdue`;
                    } else if (kmUntilService < 1000) {
                        alertType = 'warning';
                        message = `${vehicle.plateNumber} ${service.serviceType} due in ${kmUntilService}km`;
                    } else if (daysUntilService && daysUntilService < 15) {
                        alertType = 'warning';
                        message = `${vehicle.plateNumber} ${service.serviceType} due in ${daysUntilService} days`;
                    } else {
                        alertType = 'info';
                        message = `${vehicle.plateNumber} ${service.serviceType} scheduled`;
                    }

                    alerts.push({
                        id: `${vehicle._id}-${service.serviceType}`,
                        message,
                        type: alertType,
                        vehicle: vehicle.plateNumber,
                        details: {
                            vehicleInfo: {
                                id: vehicle.plateNumber,
                                type: vehicle.make && vehicle.model ? `${vehicle.make} ${vehicle.model}` : 'Unknown',
                                year: vehicle.year,
                                make: vehicle.make,
                                model: vehicle.model,
                                vin: vehicle.vinNumber,
                                currentMileage: currentOdo
                            },
                            issue: {
                                serviceType: service.serviceType,
                                originalDueDate: service.scheduledDate,
                                dueMileage: service.serviceOdometer,
                                remainingKm: kmUntilService,
                                complianceRisk: service.priority === 'urgent' ? 'High' : 'Medium'
                            },
                            estimatedCost: '$150',
                            estimatedTime: '2 hours',
                            priority: service.priority,
                            location: 'Main Service Bay'
                        }
                    });
                });
            }
        });
        return alerts;
    };

    const alerts: Alert[] = generateAlerts();

    // Calculate stats from actual vehicle services data
    const stats = useMemo(() => {
        console.log('📊 Calculating stats for', vehicleServices.length, 'services');

        const overdue = vehicleServices.filter((service: VehicleServiceResponse) => {
            if (!service.dueDate) return false;
            const dueDate = new Date(service.dueDate);
            const today = new Date();
            return dueDate < today && service.status !== 'completed';
        }).length;

        const dueThisWeek = vehicleServices.filter((service: VehicleServiceResponse) => {
            if (!service.dueDate) return false;
            const dueDate = new Date(service.dueDate);
            const today = new Date();
            const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return daysUntil >= 0 && daysUntil <= 7 && service.status !== 'completed';
        }).length;

        const inProgress = vehicleServices.filter((service: VehicleServiceResponse) => service.status === 'in-progress').length;
        const scheduled = vehicleServices.filter((service: VehicleServiceResponse) => service.status === 'pending').length;

        console.log('📊 Stats calculated:', { overdue, dueThisWeek, inProgress, scheduled });

        return { overdue, dueThisWeek, inProgress, scheduled };
    }, [vehicleServices]);

    const handleFormChange = (field: string, value: string | boolean): void => {
        setScheduleForm(prev => ({ ...prev, [field]: value }));
    };

    // Static mock work orders data for next due calculation
    const staticWorkOrders = [
        {
            _id: 'wo1',
            vehicleId: { _id: 'v1' },
            status: 'completed',
            issue: 'Oil Change',
            description: 'Routine oil change service',
            odometerReading: 145000,
            completionDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
            createdAt: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            _id: 'wo2',
            vehicleId: { _id: 'v1' },
            status: 'completed',
            issue: 'Tire Rotation',
            description: 'Regular tire rotation',
            odometerReading: 140000,
            completionDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
            createdAt: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            _id: 'wo3',
            vehicleId: { _id: 'v2' },
            status: 'completed',
            issue: 'Brake Inspection',
            description: 'Full brake system inspection',
            odometerReading: 180000,
            completionDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(), // 120 days ago
            createdAt: new Date(Date.now() - 125 * 24 * 60 * 60 * 1000).toISOString()
        }
    ];

    // Function to calculate next due date and mileage based on last completed service (using static data)
    const calculateNextDue = useCallback((vehicleId: string, serviceType: string, intervals: { mileage: number; days: number }) => {
        try {
            // Use static work orders data instead of API call
            const completedOrders = staticWorkOrders
                .filter((order: any) =>
                    order.vehicleId?._id === vehicleId &&
                    order.status === 'completed' &&
                    order.odometerReading &&
                    (order.issue?.toLowerCase().includes(serviceType.replace(/_/g, ' ').toLowerCase()) ||
                        order.description?.toLowerCase().includes(serviceType.replace(/_/g, ' ').toLowerCase()))
                )
                .sort((a: any, b: any) => {
                    const dateA = new Date(a.completionDate || a.createdAt || '');
                    const dateB = new Date(b.completionDate || b.createdAt || '');
                    return dateB.getTime() - dateA.getTime(); // Sort descending
                });

            // Get vehicle's current odometer
            const selectedVehicle = vehicles.find(v => v._id === vehicleId);
            const currentOdo = selectedVehicle?.odometer || selectedVehicle?.currentOdometer || 0;
            setCurrentOdometer(currentOdo);

            let lastOdometer = currentOdo;
            let lastCompletionDate: Date | null = null;

            if (completedOrders.length > 0) {
                const lastOrder = completedOrders[0];
                lastOdometer = lastOrder.odometerReading || currentOdo;
                lastCompletionDate = new Date(lastOrder.completionDate || lastOrder.createdAt);
            } else {
                // No completed orders found, use vehicle's current odometer
                lastCompletionDate = new Date(); // Use today as base if no previous service
            }

            // Calculate next due mileage
            if (scheduleForm.useMileageInterval && intervals.mileage > 0) {
                const nextDueMileage = lastOdometer + intervals.mileage;
                setScheduleForm(prev => ({ ...prev, dueMileage: nextDueMileage.toString() }));
            }

            // Calculate next due date
            if (scheduleForm.useTimeInterval && intervals.days > 0 && lastCompletionDate) {
                const nextDueDate = new Date(lastCompletionDate);
                nextDueDate.setDate(nextDueDate.getDate() + intervals.days);

                // Format date as YYYY-MM-DD for input
                const formattedDate = nextDueDate.toISOString().split('T')[0];
                setScheduleForm(prev => ({ ...prev, dueDate: formattedDate }));
            }

            addNotification('info', `Next due calculated based on last service at ${lastOdometer.toLocaleString()} km`);
        } catch (error) {
            console.error('Error calculating next due:', error);
            addNotification('error', 'Failed to calculate next due date/mileage');
        }
    }, [vehicles, scheduleForm.useMileageInterval, scheduleForm.useTimeInterval, addNotification]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        console.log('New service scheduled:', scheduleForm);

        if (editingService) {
            // Update existing service
            await handleUpdateService(editingService._id);
        } else {
            // Create new service
            await handleCreateService();
        }
    };

    const AlertDetailsModal = ({ alert, onClose }: { alert: Alert | null; onClose: () => void }) => {
        if (!alert) return null;

        return (
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center p-6 border-b border-theme">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${alert.type === 'critical' ? 'bg-red-100' :
                                alert.type === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
                                }`}>
                                <AlertTriangle className={`${alert.type === 'critical' ? 'text-[#A855F7]' :
                                    alert.type === 'warning' ? 'text-[#00FFA3]' : 'text-[#00D1FF]'
                                    }`} size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-primary">Alert Details</h2>
                                <p className="text-sm text-secondary capitalize">{alert.type} Priority</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-[rgba(255,255,255,0.03)] rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className={`p-4 rounded-lg border-l-4 ${alert.type === 'critical' ? 'bg-card border-red-500' :
                            alert.type === 'warning' ? 'bg-card border-yellow-500' : 'bg-card border-blue-500'
                            }`}>
                            <p className={`font-medium ${alert.type === 'critical' ? 'text-red-800' :
                                alert.type === 'warning' ? 'text-yellow-800' : 'text-blue-800'
                                }`}>
                                {alert.message}
                            </p>
                        </div>

                        <div className="bg-card rounded-lg p-4">
                            <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                                <Truck size={18} />
                                Vehicle Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-secondary">Vehicle ID</p>
                                    <p className="font-medium">{alert.details.vehicleInfo.id}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-secondary">Type</p>
                                    <p className="font-medium">{alert.details.vehicleInfo.type}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-secondary">Current Mileage</p>
                                    <p className="font-medium">{alert.details.vehicleInfo.currentMileage} km</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 p-6 border-t border-theme">
                        <button onClick={onClose} className="px-4 py-2 text-primary bg-card hover:bg-gray-200 rounded-lg transition-colors">
                            Close
                        </button>
                        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                            Schedule Service
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Wrench className="animate-spin mx-auto mb-4" size={48} />
                    <p className="text-secondary">Loading maintenance data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-card p-6">
            <div className="max-w-7xl mx-auto">
                {emptyStateMessage && (
                    <div className="mb-6 flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="text-sm">{emptyStateMessage}</span>
                    </div>
                )}

                <div className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-3xl font-bold text-primary">Fleet Maintenance Schedule</h1>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-card rounded-lg p-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="bg-red-100 p-2 rounded-lg">
                                    <AlertTriangle className="text-[#A855F7]" size={20} />
                                </div>
                                <div>
                                    <p className="text-sm text-secondary">Overdue</p>
                                    <p className="text-2xl font-bold text-[#A855F7]">{stats.overdue}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-card rounded-lg p-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="bg-yellow-100 p-2 rounded-lg">
                                    <Clock className="text-[#00FFA3]" size={20} />
                                </div>
                                <div>
                                    <p className="text-sm text-secondary">Due This Week</p>
                                    <p className="text-2xl font-bold text-[#00FFA3]">{stats.dueThisWeek}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-card rounded-lg p-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-100 p-2 rounded-lg">
                                    <Wrench className="text-[#00D1FF]" size={20} />
                                </div>
                                <div>
                                    <p className="text-sm text-secondary">In Progress</p>
                                    <p className="text-2xl font-bold text-[#00D1FF]">{stats.inProgress}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-card rounded-lg p-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="bg-green-100 p-2 rounded-lg">
                                    <CheckCircle className="text-green-600" size={20} />
                                </div>
                                <div>
                                    <p className="text-sm text-secondary">Scheduled</p>
                                    <p className="text-2xl font-bold text-green-600">{stats.scheduled}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {alerts.length > 0 && (
                    <div className="bg-card rounded-lg shadow-sm mb-6">
                        <div className="p-6 border-b border-theme">
                            <div className="flex items-center gap-2">
                                <Bell className="text-red-500" size={20} />
                                <h2 className="text-xl font-semibold text-primary">Maintenance Alerts</h2>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="space-y-3">
                                {alerts.slice(0, 3).map((alert: Alert) => (
                                    <div key={alert.id} className={`p-4 rounded-lg border-l-4 ${alert.type === 'critical' ? 'bg-card border-red-500' :
                                        alert.type === 'warning' ? 'bg-card border-yellow-500' : 'bg-card border-blue-500'}`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className={`font-medium ${alert.type === 'critical' ? 'text-red-800' :
                                                    alert.type === 'warning' ? 'text-yellow-800' : 'text-blue-800'}`}>
                                                    {alert.message}
                                                </p>
                                                <p className="text-sm text-secondary mt-1">Vehicle: {alert.vehicle}</p>
                                            </div>
                                            <button
                                                onClick={() => setShowAlertDetails(alert)}
                                                className="text-sm text-[#00D1FF] hover:text-blue-800 font-medium flex items-center gap-1"
                                            >
                                                <FileText size={14} />
                                                View Details
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}



                {/* Cost Report Summary */}
                {costReport.length > 0 && (
                    <div className="mt-6 bg-card rounded-lg shadow-sm">
                        <div className="p-6 border-b border-theme">
                            <h2 className="text-xl font-semibold text-primary">Maintenance Cost Report - {selectedYear}</h2>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {costReport.map((item: CostReportItem) => (
                                    <div key={`${item.vehicleId}-${item.month}`} className="bg-card rounded-lg p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="font-medium text-primary">{item.plateNumber}</p>
                                                <p className="text-sm text-secondary">Month: {item.month}/{item.year}</p>
                                            </div>
                                            <span className="text-lg font-bold text-[#00D1FF]">${item.totalCost.toFixed(2)}</span>
                                        </div>
                                        <div className="mt-2 text-sm text-secondary">
                                            <p>Work Orders: {item.workOrders}</p>
                                            {item.avgCost && <p>Avg Cost: ${item.avgCost.toFixed(2)}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Schedule Service Form Sidebar */}
            {showScheduleForm && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100] flex justify-end">
                    <div className="bg-card w-full max-w-md h-full overflow-y-auto shadow-xl">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-semibold text-primary">Schedule New Service</h2>
                                <button onClick={() => setShowScheduleForm(false)} className="p-2 hover:bg-[rgba(255,255,255,0.03)] rounded-lg transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">Vehicle *</label>
                                    <select
                                        value={scheduleForm.vehicle}
                                        onChange={(e) => {
                                            const vehicleId = e.target.value;
                                            handleFormChange('vehicle', vehicleId);

                                            // Auto-populate vehicle-related fields
                                            const selectedVehicle = vehicles.find(v => v._id === vehicleId);
                                            if (selectedVehicle) {
                                                setCurrentOdometer(selectedVehicle.odometer || selectedVehicle.currentOdometer || 0);
                                                // Auto-populate unit number, make/model, VIN/license plate, and odometer
                                                setScheduleForm(prev => ({
                                                    ...prev,
                                                    unitNumber: selectedVehicle.plateNumber || prev.unitNumber,
                                                    makeModel: `${selectedVehicle.make || ''} ${selectedVehicle.model || ''}`.trim() || prev.makeModel,
                                                    vinLicensePlate: selectedVehicle.vinNumber || selectedVehicle.plateNumber || prev.vinLicensePlate,
                                                    odometer: (selectedVehicle.odometer || selectedVehicle.currentOdometer || 0).toString()
                                                }));
                                            }

                                            // Auto-calculate next due if service type is selected
                                            if (vehicleId && scheduleForm.serviceType) {
                                                const intervals = serviceTypeIntervals[scheduleForm.serviceType];
                                                if (intervals) {
                                                    calculateNextDue(vehicleId, scheduleForm.serviceType, intervals);
                                                }
                                            }
                                        }}
                                        className="w-full p-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    >
                                        <option value="">Select a vehicle</option>
                                        {vehicles.map((vehicle: Vehicle) => (
                                            <option key={vehicle._id} value={vehicle._id}>
                                                {vehicle.plateNumber} {vehicle.make && vehicle.model ? `- ${vehicle.make} ${vehicle.model}` : ''}
                                                {(vehicle.odometer || vehicle.currentOdometer) ? ` (${(vehicle.odometer || vehicle.currentOdometer || 0).toLocaleString()} km)` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    {currentOdometer !== null && (
                                        <p className="text-xs text-secondary mt-1">Current Odometer: {currentOdometer.toLocaleString()} km</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">Service Type *</label>
                                    <select
                                        value={scheduleForm.serviceType}
                                        onChange={(e) => {
                                            const selectedType = e.target.value;
                                            handleFormChange('serviceType', selectedType);

                                            // Auto-populate service intervals based on service type
                                            const intervals = serviceTypeIntervals[selectedType];
                                            if (intervals) {
                                                setScheduleForm(prev => ({
                                                    ...prev,
                                                    mileageInterval: intervals.mileage.toString(),
                                                    timeInterval: intervals.days.toString()
                                                }));

                                                // Auto-calculate next due if vehicle is selected
                                                if (scheduleForm.vehicle) {
                                                    calculateNextDue(scheduleForm.vehicle, selectedType, intervals);
                                                }
                                            }
                                        }}
                                        className="w-full p-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    >
                                        <option value="">Select service type</option>
                                        {serviceTypes.map((service: string) => (
                                            <option key={service} value={service}>
                                                {service.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Service Type Configuration */}
                                {scheduleForm.serviceType && (
                                    <div className="bg-card border border-blue-200 rounded-lg p-4 space-y-4">
                                        <h3 className="text-sm font-semibold text-blue-900 mb-2">Service Interval Configuration</h3>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-primary mb-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={scheduleForm.useMileageInterval}
                                                        onChange={(e) => handleFormChange('useMileageInterval', e.target.checked)}
                                                        className="mr-2"
                                                    />
                                                    Mileage Interval (km)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={scheduleForm.mileageInterval}
                                                    onChange={(e) => {
                                                        handleFormChange('mileageInterval', e.target.value);
                                                        if (scheduleForm.vehicle && scheduleForm.serviceType) {
                                                            const intervals = serviceTypeIntervals[scheduleForm.serviceType];
                                                            calculateNextDue(scheduleForm.vehicle, scheduleForm.serviceType, {
                                                                mileage: parseInt(e.target.value) || intervals.mileage,
                                                                days: parseInt(scheduleForm.timeInterval) || intervals.days
                                                            });
                                                        }
                                                    }}
                                                    placeholder="e.g., 15000"
                                                    disabled={!scheduleForm.useMileageInterval}
                                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                                    min="0"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-primary mb-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={scheduleForm.useTimeInterval}
                                                        onChange={(e) => handleFormChange('useTimeInterval', e.target.checked)}
                                                        className="mr-2"
                                                    />
                                                    Time Interval (days)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={scheduleForm.timeInterval}
                                                    onChange={(e) => {
                                                        handleFormChange('timeInterval', e.target.value);
                                                        if (scheduleForm.vehicle && scheduleForm.serviceType) {
                                                            const intervals = serviceTypeIntervals[scheduleForm.serviceType];
                                                            calculateNextDue(scheduleForm.vehicle, scheduleForm.serviceType, {
                                                                mileage: parseInt(scheduleForm.mileageInterval) || intervals.mileage,
                                                                days: parseInt(e.target.value) || intervals.days
                                                            });
                                                        }
                                                    }}
                                                    placeholder="e.g., 90"
                                                    disabled={!scheduleForm.useTimeInterval}
                                                    className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                                    min="0"
                                                />
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (scheduleForm.vehicle && scheduleForm.serviceType) {
                                                    const intervals = serviceTypeIntervals[scheduleForm.serviceType];
                                                    calculateNextDue(scheduleForm.vehicle, scheduleForm.serviceType, {
                                                        mileage: parseInt(scheduleForm.mileageInterval) || intervals.mileage,
                                                        days: parseInt(scheduleForm.timeInterval) || intervals.days
                                                    });
                                                }
                                            }}
                                            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 !text-white text-sm rounded-lg transition-colors"
                                        >
                                            Calculate Next Due
                                        </button>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">Priority</label>
                                    <select
                                        value={scheduleForm.priority}
                                        onChange={(e) => handleFormChange('priority', e.target.value)}
                                        className="w-full p-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="low">Low Priority</option>
                                        <option value="medium">Medium Priority</option>
                                        <option value="high">High Priority</option>
                                        <option value="urgent">Urgent Priority</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">Due Date *</label>
                                    <input
                                        type="date"
                                        value={scheduleForm.dueDate}
                                        onChange={(e) => handleFormChange('dueDate', e.target.value)}
                                        className="w-full p-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">Due Mileage (km)</label>
                                    <input
                                        type="number"
                                        value={scheduleForm.dueMileage}
                                        onChange={(e) => handleFormChange('dueMileage', e.target.value)}
                                        placeholder="e.g., 50000"
                                        className="w-full p-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">Assigned Mechanic</label>
                                    <select
                                        value={scheduleForm.assignedMechanic}
                                        onChange={(e) => handleFormChange('assignedMechanic', e.target.value)}
                                        className="w-full p-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        disabled={loadingMechanics}
                                    >
                                        <option value="">{loadingMechanics ? 'Loading mechanics...' : 'Select Mechanic'}</option>
                                        {mechanics.map((mechanic) => (
                                            <option key={mechanic._id} value={mechanic._id}>
                                                {mechanic.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">Estimated Cost ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={scheduleForm.estimatedCost}
                                        onChange={(e) => handleFormChange('estimatedCost', e.target.value)}
                                        placeholder="0.00"
                                        className="w-full p-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">Estimated Time</label>
                                    <input
                                        type="text"
                                        value={scheduleForm.estimatedTime}
                                        onChange={(e) => handleFormChange('estimatedTime', e.target.value)}
                                        placeholder="e.g., 2 hours, 1 day"
                                        className="w-full p-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* New Fields Section */}
                                <div className="border-t pt-6 mt-6">
                                    <h3 className="text-lg font-semibold text-primary mb-4">Service Details</h3>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-primary mb-2">Service Date</label>
                                            <input
                                                type="date"
                                                value={scheduleForm.serviceDate}
                                                onChange={(e) => handleFormChange('serviceDate', e.target.value)}
                                                className="w-full p-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-primary mb-2">Unit Number</label>
                                            <input
                                                type="text"
                                                value={scheduleForm.unitNumber}
                                                onChange={(e) => handleFormChange('unitNumber', e.target.value)}
                                                placeholder="Unit Number"
                                                className="w-full p-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-primary mb-2">Make/Model</label>
                                            <input
                                                type="text"
                                                value={scheduleForm.makeModel}
                                                onChange={(e) => handleFormChange('makeModel', e.target.value)}
                                                placeholder="Make/Model"
                                                className="w-full p-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-primary mb-2">VIN/License Plate</label>
                                            <input
                                                type="text"
                                                value={scheduleForm.vinLicensePlate}
                                                onChange={(e) => handleFormChange('vinLicensePlate', e.target.value)}
                                                placeholder="VIN or License Plate"
                                                className="w-full p-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-primary mb-2">Odometer</label>
                                            <input
                                                type="number"
                                                value={scheduleForm.odometer}
                                                onChange={(e) => handleFormChange('odometer', e.target.value)}
                                                placeholder="Current Odometer Reading"
                                                className="w-full p-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-primary mb-2">Service Provider</label>
                                            <input
                                                type="text"
                                                value={scheduleForm.serviceProvider}
                                                onChange={(e) => handleFormChange('serviceProvider', e.target.value)}
                                                placeholder="Service Provider/Shop Name"
                                                className="w-full p-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-primary mb-2">Invoice Number</label>
                                            <input
                                                type="text"
                                                value={scheduleForm.invoiceNumber}
                                                onChange={(e) => handleFormChange('invoiceNumber', e.target.value)}
                                                placeholder="Invoice Number"
                                                className="w-full p-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-primary mb-2">PARTS</label>
                                            <textarea
                                                value={scheduleForm.parts}
                                                onChange={(e) => handleFormChange('parts', e.target.value)}
                                                rows={3}
                                                placeholder="List parts used or required..."
                                                className="w-full p-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-primary mb-2">DESCRIPTION</label>
                                            <textarea
                                                value={scheduleForm.description}
                                                onChange={(e) => handleFormChange('description', e.target.value)}
                                                rows={3}
                                                placeholder="Describe any specific requirements or issues..."
                                                className="w-full p-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-primary mb-2">Notes</label>
                                            <textarea
                                                value={scheduleForm.notes}
                                                onChange={(e) => handleFormChange('notes', e.target.value)}
                                                rows={3}
                                                placeholder="Additional notes..."
                                                className="w-full p-3 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowScheduleForm(false)}
                                        className="flex-1 px-4 py-3 text-primary bg-card hover:bg-gray-200 rounded-lg transition-colors font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 !text-white rounded-lg transition-colors font-medium"
                                    >
                                        Schedule Service
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ✅ VEHICLE SERVICES SECTION WITH FILTERS */}
            <div className="bg-card rounded-lg shadow-sm mb-6">
                <div className="p-6 border-b border-theme">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Wrench className="text-blue-500" size={20} />
                            <h2 className="text-xl font-semibold text-primary">Vehicle Services</h2>
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                {vehicleServices.length} services
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={fetchVehicleServices}
                                disabled={servicesLoading}
                                className="bg-gray-600 hover:bg-gray-700 !text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                            >
                                <Search size={16} />
                                Refresh
                            </button>
                            <button
                                onClick={() => setShowScheduleForm(true)}
                                className="bg-blue-600 hover:bg-blue-700 !text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                            >
                                <Plus size={16} />
                                Add Service
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="p-6 border-b border-theme">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-primary mb-1">Status Filter</label>
                            <select
                                value={serviceFilters.status || ''}
                                onChange={(e) => setServiceFilters({ ...serviceFilters, status: e.target.value as any || undefined })}
                                className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="in-progress">In Progress</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-primary mb-1">Priority Filter</label>
                            <select
                                value={serviceFilters.priority || ''}
                                onChange={(e) => setServiceFilters({ ...serviceFilters, priority: e.target.value as any || undefined })}
                                className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">All Priorities</option>
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-primary mb-1">Service Type</label>
                            <select
                                value={serviceFilters.serviceType || ''}
                                onChange={(e) => setServiceFilters({ ...serviceFilters, serviceType: e.target.value as any || undefined })}
                                className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">All Types</option>
                                <option value="oil-change">Oil Change</option>
                                <option value="tire-rotation">Tire Rotation</option>
                                <option value="bike-inspection">Bike Inspection</option>
                                <option value="general-maintenance">General Maintenance</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-primary mb-1">Vehicle Filter</label>
                            <select
                                value={serviceFilters.vehicleId || ''}
                                onChange={(e) => setServiceFilters({ ...serviceFilters, vehicleId: e.target.value || undefined })}
                                className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">All Vehicles</option>
                                {vehicles.map((vehicle: Vehicle) => (
                                    <option key={vehicle._id} value={vehicle._id}>
                                        {vehicle.plateNumber}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-primary mb-1">Mechanic Filter</label>
                            <select
                                value={serviceFilters.mechanic || ''}
                                onChange={(e) => setServiceFilters({ ...serviceFilters, mechanic: e.target.value || undefined })}
                                className="w-full px-3 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">All Mechanics</option>
                                {mechanics.map((mechanic) => (
                                    <option key={mechanic._id} value={mechanic._id}>
                                        {mechanic.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={() => setServiceFilters({})}
                                className="w-full px-4 py-2 bg-gray-500 hover:bg-gray-600 !text-white rounded-lg transition-colors"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                </div>

                {/* Vehicle Services Table */}
                <div className="overflow-x-auto">
                    {servicesLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-2 text-secondary">Loading vehicle services...</span>
                        </div>
                    ) : vehicleServices.length === 0 ? (
                        <div className="text-center py-8">
                            <Wrench className="mx-auto h-12 w-12 text-secondary" />
                            <h3 className="mt-2 text-sm font-medium text-primary">No vehicle services found</h3>
                            <p className="mt-1 text-sm text-secondary">
                                {Object.keys(serviceFilters).length > 0
                                    ? "Try adjusting your filters or create a new service."
                                    : "Get started by creating a new vehicle service."}
                            </p>
                            <div className="mt-6">
                                <button
                                    onClick={() => setShowScheduleForm(true)}
                                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md !text-white bg-blue-600 hover:bg-blue-700"
                                >
                                    <Plus size={16} className="mr-2" />
                                    Create Service
                                </button>
                            </div>
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-theme">
                            <thead className="bg-card">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Unit/Vehicle</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Service Type</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Service Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Due Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Odometer (km)</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Due Mileage</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Priority</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Assigned Mechanic</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Service Provider</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Estimated Cost</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Parts</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-card divide-y divide-theme">
                                {vehicleServices.map((service: VehicleServiceResponse) => {
                                    const formatDate = (dateString: string | Date | null | undefined) => {
                                        if (!dateString) return 'N/A';
                                        const date = new Date(dateString);
                                        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                                    };

                                    return (
                                        <tr key={service._id} className="hover:bg-[rgba(255,255,255,0.03)]">
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-medium text-primary">
                                                        {(service as any).unitNumber || service.vehicleId?.internalId || 'N/A'}
                                                    </div>
                                                    <div className="text-xs text-secondary">
                                                        {service.vehicleId?.plateNumber || ''}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-primary">
                                                {service.serviceType.replace('-', ' ').toUpperCase()}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-secondary">
                                                {formatDate((service as any).serviceDate)}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-secondary">
                                                {formatDate(service.dueDate)}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-secondary">
                                                {(service as any).odometer ? (service as any).odometer.toLocaleString() : 'N/A'}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-secondary">
                                                {service.dueMileage ? service.dueMileage.toLocaleString() : 'N/A'}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${service.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                                    service.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                                        service.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-green-100 text-green-800'}`}>
                                                    {service.priority.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${service.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                        service.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                                                            'bg-yellow-100 text-yellow-800'}`}>
                                                        {service.status.replace('-', ' ').toUpperCase()}
                                                    </span>
                                                    {service.status !== 'completed' && (
                                                        <select
                                                            value={service.status}
                                                            onChange={(e) => handleStatusChange(service._id, e.target.value as any)}
                                                            className="text-xs border border-theme rounded px-2 py-1"
                                                        >
                                                            <option value="pending">Pending</option>
                                                            <option value="in-progress">In Progress</option>
                                                            <option value="completed">Completed</option>
                                                        </select>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-secondary">
                                                {(() => {
                                                    const mechanic = service.assignedMechanic as any;
                                                    if (!mechanic) return 'N/A';
                                                    if (typeof mechanic === 'string') {
                                                        return mechanics.find(m => m._id === mechanic)?.name || mechanic;
                                                    }
                                                    // Handle populated object
                                                    if (mechanic.name) {
                                                        return mechanic.name;
                                                    }
                                                    if (mechanic.first_name || mechanic.last_name) {
                                                        return `${mechanic.first_name || ''} ${mechanic.last_name || ''}`.trim() || 'N/A';
                                                    }
                                                    return 'N/A';
                                                })()}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-secondary">
                                                <div className="truncate max-w-24" title={(service as any).serviceProvider || 'N/A'}>
                                                    {(service as any).serviceProvider || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-secondary">
                                                {(service as any).estimatedCost ? `$${((service as any).estimatedCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
                                            </td>
                                            <td className="px-4 py-4 text-sm text-secondary max-w-xs">
                                                <div className="truncate" title={(service as any).parts || 'N/A'}>
                                                    {(service as any).parts || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleEditService(service)}
                                                        className="text-[#00D1FF] hover:text-blue-900"
                                                        title="Edit Service"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirm({ show: true, serviceId: service._id })}
                                                        className="text-[#A855F7] hover:text-red-900"
                                                        title="Delete Service"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <AlertDetailsModal
                alert={showAlertDetails}
                onClose={() => setShowAlertDetails(null)}
            />

            {/* Toast Notifications Container */}
            <div className="fixed top-4 right-4 z-[10002] flex flex-col gap-3 max-w-md">
                {notifications.map(notification => (
                    <ToastNotification
                        key={notification.id}
                        notification={notification}
                        onClose={removeNotification}
                    />
                ))}
            </div>

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={deleteConfirm.show}
                onClose={() => setDeleteConfirm({ show: false, serviceId: null })}
                onConfirm={async () => {
                    if (deleteConfirm.serviceId) {
                        const result = await deleteService(deleteConfirm.serviceId);
                        if (result?.success) {
                            addNotification('success', result?.message || 'Service deleted successfully!');
                        } else {
                            addNotification('error', `Failed to delete service: ${result?.message || 'Unknown error'}`);
                        }
                        setDeleteConfirm({ show: false, serviceId: null });
                    }
                }}
                title="Delete Service"
                message="Are you sure you want to delete this service? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                type="danger"
            />
        </div>
    );
};

export default MaintenanceSchedule;