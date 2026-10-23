import { useEffect, useState, useCallback } from "react";
import { listTrailers } from "../axios/api/distapcher";

export interface TrailerOption {
  _id: string;
  trailer: string;
}

export const useTrailers = () => {
  const [trailers, setTrailers] = useState<TrailerOption[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any | undefined>(undefined);

  const fetchTrailers = useCallback(async () => {
    if (!userInfo) {
      setTrailers([]);
      setLoading(false);
      return;
    }

    // Handle different userInfo structures (userData.company or direct company)
    const userRole = userInfo?.role || userInfo?.userData?.role;
    const userCompany = userInfo?.company || userInfo?.userData?.company;
    const isSuperadmin = userRole === "superadmin";
    const isAdmin = userRole === "admin";
    const isHR = userRole === "hr";
    const isDispatcher = userRole === "dispatcher";
    const isFleetManager = userRole === "Fleet Maintenance Manager";
    const isComplianceManager = userRole === "Compliance Manager";
    const hasCompany = Boolean(userCompany);

    // Allow superadmin, admin, hr, dispatchers, fleet managers, and compliance managers to call API even if company is not visible in localStorage
    // The backend will handle company filtering based on the authenticated user
    if (!isSuperadmin && !isAdmin && !isHR && !isDispatcher && !isFleetManager && !isComplianceManager && !hasCompany) {
      setTrailers([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    try {
      const res = await listTrailers();
      if (res?.success && Array.isArray(res.data)) {
        setTrailers(res.data);
        setError(null);
      } else {
        setTrailers([]);
        setError(res?.message || "Failed to fetch trailers");
      }
    } catch (err: any) {
      setTrailers([]);
      setError(err?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [userInfo]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("userInfo");
      if (stored) {
        setUserInfo(JSON.parse(stored));
      } else {
        setUserInfo(null);
      }
    } catch (err) {
      console.error("Failed to parse userInfo for useTrailers hook", err);
      setUserInfo(null);
    }
  }, []);

  useEffect(() => {
    if (userInfo === undefined) return;
    fetchTrailers();
  }, [fetchTrailers, userInfo]);

  return { trailers, loading, error, refetch: fetchTrailers };
};

