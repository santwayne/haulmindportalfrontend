import { type AxiosResponse } from "axios";
import apiClient from "../apiClient";

interface ApiError {
    response?: {
        data?: {
            message: string;
        };
    };
}

interface Error {
    message?: string;
    response?: {
        data?: {
            message: string;
        };
    };
}

export interface DashboardStats {
    activeLoads: number;
    vehiclesOnline: number;
    activeDrivers: number;
    pendingTasks: number;
    complianceRate: number;
    monthlyRevenue: number;
    openIncidents: number;
    maintenanceOrdersCount?: number;
}

export interface Trip {
    id: string;
    tripNumber: string;
    origin: string;
    destination: string;
    originLat: number | null;
    originLng: number | null;
    destLat: number | null;
    destLng: number | null;
    driver?: string | {
        _id: string;
        name: string;
        email?: string;
        phone?: string;
        internalId?: string;
    };
    coDriver?: {
        _id: string;
        name: string;
        email?: string;
        phone?: string;
        internalId?: string;
    };
    driverInfo?: {
        name: string;
        email: string;
        phone: string;
    } | null;
    truck?: {
        _id?: string;
        plateNumber?: string;
        licensePlate?: string;
        unitNumber?: string;
        internalId?: string;
        make?: string;
        model?: string;
        makeModel?: string;
        type?: string;
        unitType?: string;
        year?: string | number;
        vin?: string;
    };
    truckInfo?: {
        id: string;
        unitNo: string;
        licensePlate: string;
        makeModel: string;
        internalId: string;
        operationStatus: string;
        currentLocation: {
            latitude: string;
            longitude: string;
            address: string;
            updatedAt: string;
        } | null;
        yard: {
            yardName: string;
            yardCode: string;
            address: string;
            city: string;
            stateProvince: string;
            coordinates: {
                latitude: number | null;
                longitude: number | null;
            } | null;
        } | null;
    } | null;
    trailer?: {
        _id?: string;
        plateNumber?: string;
        licensePlate?: string;
        unitNumber?: string;
        make?: string;
        model?: string;
        makeModel?: string;
        type?: string;
        capacity?: string;
        internalId?: string;
        year?: string | number;
        vin?: string;
    };
    status: string;
    eta: string;
    currentLat: number | null;
    currentLng: number | null;
    plannedStartDate?: string;
    plannedEndDate?: string;
    actualStartDate?: string;
    actualEndDate?: string;
    startLocation?: {
        place?: string;
        latitude?: string | number;
        longitude?: string | number;
    };
    endLocation?: {
        place?: string;
        latitude?: string | number;
        longitude?: string | number;
    };
    orders?: Array<{
        _id: string;
        orderNumber: string;
        customerOrderNo?: string;
        status?: string;
        commodity?: string;
        weight?: number;
        weightUnit?: string;
        pickupLocation?: {
            place?: string;
            latitude?: string | number;
            longitude?: string | number;
        };
        deliveryLocation?: {
            place?: string;
            latitude?: string | number;
            longitude?: string | number;
        };
        truck?: any;
        trailer?: any;
        driver?: any;
        coDriver?: any;
    }>;
    route?: {
        waypoints: Array<{
            place: string;
            latitude: number | null;
            longitude: number | null;
            type: string;
            orderId: string | null;
        }>;
        summary: string;
        totalDistance: number;
        estimatedDuration: number;
    };
}

export interface Truck {
    id: string;
    unitNo: string;
    licensePlate: string;
    makeModel: string;
    internalId: string;
    operationStatus: string;
    latitude: number;
    longitude: number;
    address: string;
    updatedAt: string;
    isYardLocation?: boolean;
    yard?: {
        yardName: string;
        yardCode: string;
    } | null;
}

export interface deliverLocation {
    placeId: string,
    place: string,
    latitude: number,
    longitude: number
}

export interface RecentTrips {
    _id: string;
    tripNo: string;
    customerOrderNo?: string;
    driver: {
        name: string;
    };
    status: string;
    deliveryLocation: {
        place: string;
        latitude: number;
        longitude: number;
    };
    createdAt: string;
    driverAcceptanceStatus: string;
}

export interface AdminDashboardResponse {
    success: boolean;
    data?: {
        stats: DashboardStats;
        trips: Trip[];
        trucks: Truck[];
        recentTrips: RecentTrips[]
    };
    message?: string;
}

export const quickStats = async () => {
    try {
        const res: AxiosResponse = await apiClient.get("admin/stats");

        return res.data;
    } catch (error) {
        console.error(error);
        return (error as ApiError).response?.data;
    }
};

export const loadsPerMonth = async () => {
    try {
        const res: AxiosResponse = await apiClient.get("admin/loads-per-month");
        return res.data;
    } catch (error) {
        console.error(error);
        return (error as ApiError).response?.data;
    }
};

export const revenueTrend = async () => {
    try {
        const res: AxiosResponse = await apiClient.get("admin/revenue-trend");
        return res.data;
    } catch (error) {
        console.error(error);
        return (error as ApiError).response?.data;
    }
};

export const fuelEfficiency = async () => {
    try {
        const res: AxiosResponse = await apiClient.get("admin/fuel-efficiency");
        return res.data;
    } catch (error) {
        console.error(error);
        return (error as ApiError).response?.data;
    }
};

export const recentAlerts = async () => {
    try {
        const res: AxiosResponse = await apiClient.get("admin/recent-alerts");
        return res.data;
    } catch (error) {
        console.error(error);
        return (error as ApiError).response?.data;
    }
};

export const getAdminDashboard = async (): Promise<AdminDashboardResponse> => {
    try {
        const res: AxiosResponse = await apiClient.get(`admin/dashboard`);
        return res.data;
    } catch (error: any) {
        const err = error as Error;
        return {
            success: false,
            message: err.response?.data?.message || err.message || 'Failed to fetch dashboard data',
            data: undefined
        };
    }
};
