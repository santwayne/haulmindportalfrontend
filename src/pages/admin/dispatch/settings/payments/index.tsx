import { FileDown } from "lucide-react";
import jsPDF from "jspdf";

const ScrollableTable = () => {
    // Sample data based on actual columns from the image
    const tableData = [
        {
            id: 1,
            invoices: 'INV-2025-001',
            order: 'ORD-12345',
            pars_paps: 'PARS12345',
            rate: '$2,450.00',
            customer: 'ABC Logistics Inc.',
            shipper_city: 'Chicago',
            shipper_state: 'IL',
            receiver_city: 'Dallas',
            receiver_state: 'TX',
            time: '2025-01-15 14:30',
            truck: 'TRK-001',
            trailer: 'TRL-A123',
            driver_carrier: 'John Smith / Fast Freight',
            merged_load: 'ML-2025-001',
            net: '$2,205.00',
            count: 3
        },
        {
            id: 2,
            invoices: 'INV-2025-002',
            order: 'ORD-12346',
            pars_paps: 'PAPS67890',
            rate: '$1,850.00',
            customer: 'XYZ Transport Co.',
            shipper_city: 'Los Angeles',
            shipper_state: 'CA',
            receiver_city: 'Phoenix',
            receiver_state: 'AZ',
            time: '2025-01-16 09:15',
            truck: 'TRK-002',
            trailer: 'TRL-B456',
            driver_carrier: 'Sarah Johnson / Quick Haul',
            merged_load: 'ML-2025-002',
            net: '$1,665.00',
            count: 2
        },
        {
            id: 3,
            invoices: 'INV-2025-003',
            order: 'ORD-12347',
            pars_paps: 'PARS54321',
            rate: '$3,200.00',
            customer: 'Global Shipping Ltd.',
            shipper_city: 'Miami',
            shipper_state: 'FL',
            receiver_city: 'Atlanta',
            receiver_state: 'GA',
            time: '2025-01-17 11:45',
            truck: 'TRK-003',
            trailer: 'TRL-C789',
            driver_carrier: 'Mike Brown / Elite Express',
            merged_load: 'ML-2025-003',
            net: '$2,880.00',
            count: 5
        },
        {
            id: 4,
            invoices: 'INV-2025-004',
            order: 'ORD-12348',
            pars_paps: 'PAPS98765',
            rate: '$1,650.00',
            customer: 'Prime Logistics',
            shipper_city: 'Seattle',
            shipper_state: 'WA',
            receiver_city: 'Denver',
            receiver_state: 'CO',
            time: '2025-01-18 16:20',
            truck: 'TRK-004',
            trailer: 'TRL-D012',
            driver_carrier: 'Lisa Davis / Swift Move',
            merged_load: 'ML-2025-004',
            net: '$1,485.00',
            count: 1
        },
        {
            id: 5,
            invoices: 'INV-2025-005',
            order: 'ORD-12349',
            pars_paps: 'PARS11111',
            rate: '$2,750.00',
            customer: 'Nationwide Freight',
            shipper_city: 'New York',
            shipper_state: 'NY',
            receiver_city: 'Detroit',
            receiver_state: 'MI',
            time: '2025-01-19 08:00',
            truck: 'TRK-005',
            trailer: 'TRL-E345',
            driver_carrier: 'Robert Wilson / Metro Transport',
            merged_load: 'ML-2025-005',
            net: '$2,475.00',
            count: 4
        }
    ];

    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.text("Invoices Report", 20, 20); // sample text
        // You can loop through your invoice data and format it here
        doc.save("invoices.pdf");
    };

    return (
        <div className="min-h-screen bg-card p-6">
            {/* Header */}
            <div className="bg-card shadow-sm border-b border-theme px-6 py-4 mb-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold text-primary">Invoices</h1>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={handleExportPDF}
                            className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md transition"
                        >
                            <FileDown className="w-4 h-4 mr-2" />
                            Export PDF
                        </button>
                    </div>
                </div>
            </div>


            {/* Table Container with Horizontal Scroll */}
            <div className="bg-card rounded-lg shadow-sm border border-theme overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-max w-full table-auto">
                        <thead>
                            <tr className="bg-card border-b border-theme">
                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider min-w-32">
                                    INVOICES
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider min-w-28">
                                    ORDER
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider min-w-28">
                                    PARS/PAPS
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider min-w-28">
                                    RATE
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider min-w-40">
                                    CUSTOMER
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider min-w-32">
                                    SHIPPER CITY
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider min-w-32">
                                    SHIPPER STATE
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider min-w-32">
                                    RECEIVER CITY
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider min-w-36">
                                    RECEIVER STATE
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider min-w-36">
                                    TIME
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider min-w-24">
                                    TRUCK
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider min-w-28">
                                    TRAILER
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider min-w-48">
                                    DRIVER/CARRIER
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider min-w-32">
                                    MERGED LOAD
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider min-w-28">
                                    NET
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider min-w-20">
                                    COUNT
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-theme">
                            {tableData.map((row) => (
                                <tr key={row.id} className="hover:bg-[rgba(255,255,255,0.03)] transition-colors">
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-primary min-w-32">
                                        {row.invoices}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-primary min-w-28">
                                        {row.order}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-primary min-w-28">
                                        {row.pars_paps}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-600 min-w-28">
                                        {row.rate}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-primary min-w-40">
                                        {row.customer}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-primary min-w-32">
                                        {row.shipper_city}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-primary min-w-32">
                                        {row.shipper_state}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-primary min-w-32">
                                        {row.receiver_city}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-primary min-w-36">
                                        {row.receiver_state}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-primary min-w-36">
                                        {row.time}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-primary min-w-24">
                                        {row.truck}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-primary min-w-28">
                                        {row.trailer}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-primary min-w-48">
                                        {row.driver_carrier}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-[#00D1FF] min-w-32">
                                        {row.merged_load}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-primary min-w-28">
                                        {row.net}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-primary min-w-20">
                                        {row.count}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Scroll Indicator */}
                <div className="bg-card px-4 py-2 border-t border-theme">
                    <p className="text-xs text-secondary text-center">
                        ← Scroll horizontally to view all columns →
                    </p>
                </div>
            </div>

            {/* Additional Info */}
            <div className="mt-4 text-sm text-secondary">
                <p>Showing {tableData.length} entries • Table scrolls horizontally on smaller screens</p>
            </div>
        </div>
    );
};

export default ScrollableTable;