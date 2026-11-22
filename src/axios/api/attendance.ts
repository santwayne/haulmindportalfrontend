import apiClient from "../apiClient";

export const listAttendance = async (params?: { month?: number; year?: number; date?: string; startDate?: string; endDate?: string; employee?: string; includeActiveSessions?: boolean }) => {
  const q = new URLSearchParams();
  if (params?.startDate) q.set("startDate", params.startDate);
  if (params?.endDate) q.set("endDate", params.endDate);
  if (params?.month) q.set("month", String(params.month));
  if (params?.year) q.set("year", String(params.year));
  if (params?.date) q.set("date", params.date);
  if (params?.employee) q.set("employee", params.employee);
  // Default to true - include currently logged in users
  q.set("includeActiveSessions", params?.includeActiveSessions !== false ? "true" : "false");
  const res = await apiClient.get(`/hr/attendance?${q.toString()}`);
  return res.data;
};

export const upsertAttendance = async (payload: {
  employee: string;
  date: string; // ISO date
  checkIn?: string;
  checkOut?: string;
  status: "present" | "absent" | "late" | "leave";
  notes?: string;
}) => {
  const res = await apiClient.post(`/hr/attendance`, payload);
  return res.data;
};

export const deleteAttendance = async (id: string) => {
  const res = await apiClient.delete(`/hr/attendance/${id}`);
  return res.data;
};

export const getCurrentSession = async () => {
  const res = await apiClient.get(`/hr/attendance/session/current`);
  return res.data;
};

export const clockIn = async () => {
  const res = await apiClient.post(`/hr/attendance/session/start`);
  return res.data;
};

export const startBreak = async () => {
  const res = await apiClient.post(`/hr/attendance/break/start`);
  return res.data;
};

export const endBreak = async () => {
  const res = await apiClient.post(`/hr/attendance/break/end`);
  return res.data;
};


