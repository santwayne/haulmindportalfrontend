
export interface TabButtonProps {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick: (id: string) => void;
}
export  interface ProfessionalCircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  children?: React.ReactNode;
  delay?: number;
}
export interface StockChartProps {
  data: number[];
  height?: number;
  color?: string;
  label?: string;
}
export interface ProfessionalUtilizationGaugeProps {
  activeCount: number;
  totalCount: number;
  type?: string;   // default "Truck"
  color?: string;  // default "#10b981"
}
export interface CandlestickBar {
  value: number;
  label: string;
  color: string;
}

export interface CandlestickBarChartProps {
  data: CandlestickBar[];
  height?: number;
}
export interface AnimatedCounterProps {
  value: number | string; // allow raw numbers or formatted strings
  duration?: number;
  prefix?: string;
  suffix?: string;
}

export interface Route {
  multipleDropOffs: boolean;
  selectPickup?: { place?: string; longitude?: string; latitude?: string };
  selectDropOff?: { place?: string; longitude?: string; latitude?: string };
  selectReturn?: string | null;
  wayPoints: {
    address: { place?: string; longitude?: string; latitude?: string };
    dropOff: boolean;
    pickup: boolean;
  }[];
}

export interface Load {
  _id: string;

    driverName:string
    customerName:string
  
  route: Route;
  status: string;
  notes?: string;
  assignedAt: string;
}