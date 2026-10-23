import React, { useState, useEffect } from "react";
import { listDriver } from "../../../../axios/api/distapcher";

interface Driver {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: "active" | "inactive";
  country?: string;
  state?: string;
  city?: string;
  joinDate: string;
  profileImageUrl?: string | null;
}

const DriversTable: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [assignedCount, setAssignedCount] = useState<number | null>(null);
  const [unassignedCount, setUnassignedCount] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [assignmentFilter, setAssignmentFilter] = useState<'assigned' | 'unassigned' | 'all'>('all');

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const res = await listDriver({ page: 1, limit: 100, assignment: assignmentFilter });
        if (res.success) {
          setDrivers(res.data); // adjust if API response structure is different
          setAssignedCount(res.assignedDrivers ?? null);
          setUnassignedCount(res.unassignedDrivers ?? null);
          setTotalCount(res.count ?? null);
        }
      } catch (err) {
        console.error("Error fetching drivers:", err);
      }
    };

    fetchDrivers();
  }, [assignmentFilter]);

  return (
    <div className=" bg-card bg-opacity-95 backdrop-blur-lg rounded-xl border border-white border-opacity-50 shadow-xl overflow-hidden">
      <div className="p-4 flex items-center gap-3">
        <button
          onClick={() => setAssignmentFilter('assigned')}
          className={`px-3 py-2 rounded ${assignmentFilter === 'assigned' ? 'bg-blue-600 text-white' : 'bg-card'}`}>
          Assigned ({assignedCount ?? '-'})
        </button>
        <button
          onClick={() => setAssignmentFilter('unassigned')}
          className={`px-3 py-2 rounded ${assignmentFilter === 'unassigned' ? 'bg-blue-600 text-white' : 'bg-card'}`}>
          Unassigned ({unassignedCount ?? '-'})
        </button>
        <button
          onClick={() => setAssignmentFilter('all')}
          className={`px-3 py-2 rounded ${assignmentFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-card'}`}>
          Total ({totalCount ?? '-'})
        </button>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-card bg-opacity-80 backdrop-blur-sm text-left font-semibold text-primary">
            <th className="px-6 py-4 border-r border-theme border-opacity-50">Name</th>
            <th className="px-6 py-4 border-r border-theme border-opacity-50">Email</th>
            <th className="px-6 py-4 border-r border-theme border-opacity-50">Phone</th>
            <th className="px-6 py-4 border-r border-theme border-opacity-50">Address</th>
            <th className="px-6 py-4 border-r border-theme border-opacity-50">Join Date</th>
            <th className="px-6 py-4">Status</th>
          </tr>
        </thead>
        <tbody>
          {drivers.length > 0 ? (
            drivers.map((driver) => (
              <tr
                key={driver._id}
                className="hover:bg-blue-50 hover:bg-opacity-50 transition-colors duration-200 border-b border-theme border-opacity-50"
              >
                {/* Name */}
                <td className="px-6 py-4 font-medium text-primary">{driver.name}</td>

                {/* Email */}
                <td className="px-6 py-4 text-primary">{driver.email}</td>

                {/* Phone */}
                <td className="px-6 py-4 text-primary">{driver.phone}</td>

                {/* Address */}
                <td className="px-6 py-4 text-primary">
                  {[driver.city, driver.state, driver.country].filter(Boolean).join(", ") || "N/A"}
                </td>

                {/* Join Date */}
                <td className="px-6 py-4 text-primary">
                  {driver.joinDate ? new Date(driver.joinDate).toLocaleDateString() : "N/A"}
                </td>

                {/* Status */}
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${driver.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                      }`}
                  >
                    {driver.status}
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="text-center py-6 text-secondary">
                No drivers available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DriversTable;
