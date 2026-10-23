import React, { useState, useMemo } from 'react';
import { Search, Filter, ChevronDown, MoreVertical } from 'lucide-react';

const VehicleManagementTable = () => {
    // Sample data based on the image
    const [vehicles] = useState([
        {
            id: 1,
            name: '001-EL-BMW',
            description: 'Vehicle ID Training-64',
            vin: 'WP1ZZZ5B1525',
            licensePlate: 'CA69568',
            serialNumber: 'G8551A',
            odometer: '--------',
            ratePlan: 'Proplus',
            status: 'active',
            group: 'Training',
            installation: 'Pending'
        },
        {
            id: 2,
            name: '002-Ford-Transit',
            description: 'Vehicle ID Delivery-23',
            vin: 'WF0EXXGAAEXB12345',
            licensePlate: 'NY78921',
            serialNumber: 'F2341B',
            odometer: '45,230',
            ratePlan: 'Basic',
            status: 'active',
            group: 'Delivery',
            installation: 'Complete'
        },
        {
            id: 3,
            name: '003-Mercedes-Van',
            description: 'Vehicle ID Service-89',
            vin: 'WDB9066321A123456',
            licensePlate: 'TX45612',
            serialNumber: 'M7789C',
            odometer: '62,150',
            ratePlan: 'Premium',
            status: 'inactive',
            group: 'Service',
            installation: 'In Progress'
        }
    ]);

    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
    const [filterGroup, setFilterGroup] = useState('');
    const [filterInstallation, setFilterInstallation] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Get unique values for filters
    const uniqueGroups = [...new Set(vehicles.map(v => v.group))];
    const uniqueInstallations = [...new Set(vehicles.map(v => v.installation))];

    // Filter and sort logic
    const filteredAndSortedVehicles = useMemo(() => {
        let filtered = vehicles.filter(vehicle => {
            const matchesSearch = vehicle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                vehicle.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                vehicle.vin.toLowerCase().includes(searchTerm.toLowerCase()) ||
                vehicle.licensePlate.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesGroup = !filterGroup || vehicle.group === filterGroup;
            const matchesInstallation = !filterInstallation || vehicle.installation === filterInstallation;

            return matchesSearch && matchesGroup && matchesInstallation;
        });

        if (sortConfig.key) {
            filtered.sort((a, b) => {
                const key = sortConfig.key as keyof typeof a;
                if (a[key] < b[key]) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (a[key] > b[key]) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }

        return filtered;
    }, [vehicles, searchTerm, sortConfig, filterGroup, filterInstallation]);

    const handleSort = (key: any) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const SortableHeader = ({ column, children }: { column: string; children: React.ReactNode }) => (
        <th
            className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider cursor-pointer hover:bg-[rgba(255,255,255,0.03)] select-none"
            onClick={() => handleSort(column)}
        >
            <div className="flex items-center space-x-1">
                <span>{children}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${sortConfig.key === column && sortConfig.direction === 'desc' ? 'rotate-180' : ''
                    }`} />
            </div>
        </th>
    );

    return (
        <div className="min-h-screen bg-card p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-primary">Vehicles Assets</h1>
                            <p className="text-sm text-secondary mt-1">Manage your vehicle fleet and installations</p>
                        </div>
                        <div className="flex items-center space-x-3">
                            <button className="px-4 py-2 bg-blue-600 !text-white rounded-lg hover:bg-blue-700 transition-colors">
                                Add Vehicle
                            </button>

                        </div>
                    </div>

                    {/* Search and Filters */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-4 h-4" />
                            <input
                                type="text"
                                placeholder="Search by name, VIN, license plate..."
                                className="w-full pl-10 pr-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center space-x-2 px-4 py-2 border border-theme rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                        >
                            <Filter className="w-4 h-4" />
                            <span>Filters</span>
                            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    {/* Filter Dropdowns */}
                    {showFilters && (
                        <div className="flex flex-wrap gap-4 mb-4 p-4 bg-card rounded-lg border border-theme">
                            <div className="min-w-[150px]">
                                <label className="block text-sm font-medium text-primary mb-1">Filter by Group</label>
                                <select
                                    value={filterGroup}
                                    onChange={(e) => setFilterGroup(e.target.value)}
                                    className="w-full p-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">All Groups</option>
                                    {uniqueGroups.map(group => (
                                        <option key={group} value={group}>{group}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="min-w-[150px]">
                                <label className="block text-sm font-medium text-primary mb-1">Filter by Installation</label>
                                <select
                                    value={filterInstallation}
                                    onChange={(e) => setFilterInstallation(e.target.value)}
                                    className="w-full p-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">All Installations</option>
                                    {uniqueInstallations.map(installation => (
                                        <option key={installation} value={installation}>{installation}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-end">
                                <button
                                    onClick={() => {
                                        setFilterGroup('');
                                        setFilterInstallation('');
                                        setSearchTerm('');
                                        setSortConfig({ key: null, direction: 'asc' });
                                    }}
                                    className="px-4 py-2 text-sm text-secondary hover:text-primary border border-theme rounded-md hover:bg-[rgba(255,255,255,0.03)]"
                                >
                                    Clear All
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Results Summary */}
                <div className="mb-4 text-sm text-secondary">
                    Showing {filteredAndSortedVehicles.length} of {vehicles.length} vehicles
                </div>

                {/* Table */}
                <div className="bg-card rounded-xl shadow-sm border border-theme overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-theme">
                            <thead className="bg-card">
                                <tr>
                                    <th className="px-4 py-3 text-left">
                                        <input type="checkbox" className="rounded border-theme" />
                                    </th>
                                    <SortableHeader column="name">Name</SortableHeader>
                                    <SortableHeader column="vin">VIN</SortableHeader>
                                    <SortableHeader column="licensePlate">License Plate</SortableHeader>
                                    <SortableHeader column="serialNumber">Serial Number</SortableHeader>
                                    <SortableHeader column="odometer">Odometer</SortableHeader>
                                    <SortableHeader column="ratePlan">Rate Plan</SortableHeader>
                                    <SortableHeader column="group">Group</SortableHeader>
                                    <SortableHeader column="installation">Installation</SortableHeader>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-card divide-y divide-theme">
                                {filteredAndSortedVehicles.map((vehicle) => (
                                    <tr key={vehicle.id} className="hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                                        <td className="px-4 py-4">
                                            <input type="checkbox" className="rounded border-theme" />
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                                                <div>
                                                    <div className="text-sm font-medium text-primary">{vehicle.name}</div>
                                                    <div className="text-sm text-secondary">{vehicle.description}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-primary font-mono">
                                            {vehicle.vin}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-primary font-mono">
                                            {vehicle.licensePlate}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-primary font-mono">
                                            {vehicle.serialNumber}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-primary">
                                            {vehicle.odometer}
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {vehicle.ratePlan}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-card text-primary">
                                                {vehicle.group}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${vehicle.installation === 'Complete' ? 'bg-green-100 text-green-800' :
                                                vehicle.installation === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-orange-100 text-orange-800'
                                                }`}>
                                                {vehicle.installation}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <button className="text-secondary hover:text-secondary">
                                                <MoreVertical className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredAndSortedVehicles.length === 0 && (
                        <div className="text-center py-12">
                            <div className="text-secondary">
                                <Search className="mx-auto h-12 w-12 text-secondary mb-4" />
                                <h3 className="text-lg font-medium text-primary mb-2">No vehicles found</h3>
                                <p className="text-sm">Try adjusting your search or filter criteria.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {filteredAndSortedVehicles.length > 0 && (
                    <div className="flex items-center justify-between mt-6">
                        <div className="text-sm text-primary">
                            Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredAndSortedVehicles.length}</span> of{' '}
                            <span className="font-medium">{vehicles.length}</span> results
                        </div>
                        <div className="flex items-center space-x-2">
                            <button className="px-3 py-1 text-sm border border-theme rounded-md hover:bg-[rgba(255,255,255,0.03)] disabled:opacity-50">
                                Previous
                            </button>
                            <button className="px-3 py-1 text-sm bg-blue-600 !text-white rounded-md">1</button>
                            <button className="px-3 py-1 text-sm border border-theme rounded-md hover:bg-[rgba(255,255,255,0.03)] disabled:opacity-50">
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VehicleManagementTable;