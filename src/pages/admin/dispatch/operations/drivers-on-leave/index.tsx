import { useState, useEffect } from "react";
import { User, Calendar, Phone, Mail, Search,  Clock, Loader2, FileText } from "lucide-react";

// import { getUserRole } from "../../../../../utils/auth";
import { getDriversOnLeave } from "../../../../../axios/api/distapcher";

interface DriverOnLeave {
  id: string;
  name: string;
  employeeCode: string;
  email: string;
  phone: string;
  leaveStartDate: string;
  leaveEndDate: string;
  leaveType: string;
  status: string;
  daysRemaining: number;
  notes: string;
}

const DriversOnLeavePage = () => {

  // const userRole = getUserRole();
 

  const [searchTerm, setSearchTerm] = useState("");
  const [drivers, setDrivers] = useState<DriverOnLeave[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDriversOnLeave();
  }, []);

  const fetchDriversOnLeave = async () => {
    try {
      setLoading(true);
      const response = await getDriversOnLeave();
      if (response.success && response.data) {
        setDrivers(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching drivers on leave:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDrivers = drivers.filter((driver) => {
    const matchesSearch =
      driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.phone.includes(searchTerm);

    return matchesSearch;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const calculateDaysRemaining = (endDate: string) => {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  return (
    <div className="min-h-screen" >
      <div className="relative w-full mx-auto">
      

        {/* Main content */}
        <div className="relative z-10 px-4 pt-3 pb-6">
          {/* Header Section */}
          <div className="mb-4 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
           
                <h1 className="text-xl font-bold text-[var(--accent-navyblue)]">Drivers on Leave</h1>
              </div>
              <div className="text-[var(--accent-navyblue)] text-sm">
                Total: {drivers.length} drivers
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="bg-card rounded-lg shadow-sm border border-theme mb-4 p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search drivers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Drivers Table */}
          <div className="bg-card rounded-lg shadow-sm border border-theme">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-card border-b border-theme">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                      Driver Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                      Employee Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                      Leave Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                      Days Remaining
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--accent-navyblue)] uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-theme">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center">
                        <div className="flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-navyblue)]" />
                          <span className="ml-2 text-secondary">Loading drivers on leave...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredDrivers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-secondary">
                        No drivers on leave found
                      </td>
                    </tr>
                  ) : (
                    filteredDrivers.map((driver) => (
                      <tr key={driver.id} className="hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                              <User className="w-5 h-5 text-[var(--accent-navyblue)]" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-primary">{driver.name}</div>
                              <div className="text-xs text-secondary">ID: {driver.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-primary">{driver.employeeCode}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-primary">
                            <div className="flex items-center mb-1">
                              <Mail className="w-3 h-3 mr-1 text-secondary" />
                              {driver.email}
                            </div>
                            <div className="flex items-center">
                              <Phone className="w-3 h-3 mr-1 text-secondary" />
                              {driver.phone}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-primary">
                            <Calendar className="w-4 h-4 mr-1 text-secondary" />
                            <div>
                              <div>{formatDate(driver.leaveStartDate)}</div>
                              <div className="text-xs text-secondary">to {formatDate(driver.leaveEndDate)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm font-medium text-[#F59E0B]">
                            <Clock className="w-4 h-4 mr-1" />
                            {calculateDaysRemaining(driver.leaveEndDate)} days
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-primary max-w-xs">
                            {driver.notes ? (
                              <div className="flex items-start">
                                <FileText className="w-4 h-4 mr-1 text-secondary mt-0.5 flex-shrink-0" />
                                <span className="break-words">{driver.notes}</span>
                              </div>
                            ) : (
                              <span className="text-secondary italic">No notes</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-[var(--accent-navyblue)]">
                            {driver.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriversOnLeavePage;

