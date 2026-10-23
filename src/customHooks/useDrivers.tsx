import { useEffect, useState, useCallback } from "react";
import { listDriver } from "../axios/api/distapcher";

// Hook to fetch driver list
export const useDrivers = () => {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any | undefined>(undefined);

  const fetchDrivers = useCallback(async () => {
    if (!userInfo) {
      setDrivers([]);
      setLoading(false);
      return;
    }

    // Handle different userInfo structures (userData.company or direct company)
    const userRole = userInfo?.role || userInfo?.userData?.role;
    const userCompany = userInfo?.company || userInfo?.userData?.company;
    const isSuperadmin = userRole === "superadmin";
    const isDispatcher = userRole === "dispatcher";
    const isFleetManager = userRole === "Fleet Maintenance Manager";
    const isComplianceManager = userRole === "Compliance Manager";
    const hasCompany = Boolean(userCompany);

    // Allow dispatchers, fleet managers, and compliance managers to call API even if company is not visible in localStorage
    // The backend will handle company filtering based on the authenticated user
    if (!isSuperadmin && !isDispatcher && !isFleetManager && !isComplianceManager && !hasCompany) {
      setDrivers([]);
      setLoading(false);
      setMessage(null);
      return;
    }

    setLoading(true);
    try {
      const res = await listDriver(); // this returns { success, message, data }
      if (res?.success) {
        setDrivers(res.data || []);
        setMessage(res.message || "Drivers fetched successfully");
        setError(null);
      } else {
        setDrivers([]);
        setError(res?.message || "Failed to fetch drivers");
      }
    } catch (err: any) {
      setDrivers([]);
      setError(err?.message || "Unknown error");
    }
    setLoading(false);
  }, [userInfo]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("userInfo");
      if (stored) {
        setUserInfo(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Failed to parse userInfo for useDrivers hook", err);
    }
  }, []);

  useEffect(() => {
    if (userInfo === undefined) return;
    fetchDrivers();
  }, [fetchDrivers, userInfo]);

  return { drivers, loading, error, message, refetch: fetchDrivers };
};
