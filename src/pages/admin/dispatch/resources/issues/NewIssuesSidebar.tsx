import  { useState } from 'react';
import { X } from 'lucide-react';
import type { FC } from "react";

interface NewIssuesSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const NewIssuesSidebar: FC<NewIssuesSidebarProps> = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({
        reporter: '',
        assignee: '',
        driver: '',
        vehicle: '',
        issueType: '',
        issueCategory: '',
        issueReport: '',
        issueTags: '',
        priority: '',
        status: 'Active',
        latitude: '',
        longitude: '',
        avatar: '',

    });


    const [openDetails, setOpenDetails] = useState(true);



    const handleInputChange = (e: any) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };



    const handleSubmit = () => {
        console.log('Form submitted:', formData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[100]" onClick={onClose}></div>

            {/* Sidebar */}
            <div className="fixed right-0 top-0 h-full w-126 bg-card border-l border-theme shadow-lg z-[101] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-theme flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-primary">New Issue</h2>
                        <button onClick={onClose} className="text-secondary hover:text-secondary">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
                    {/* Details Panel */}
                    <div className="bg-card p-4 rounded-md">
                        <div
                            className="flex items-center justify-between cursor-pointer mb-4"
                            onClick={() => setOpenDetails(!openDetails)}
                        >
                            <h3 className="text-lg font-medium text-primary">Issue Report</h3>
                            <svg
                                className={`w-5 h-5 text-secondary transform transition-transform ${openDetails ? "rotate-180" : ""
                                    }`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>

                        {openDetails && (
                            <div className="space-y-4">
                                {/* Reporter & Assignee */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-primary mb-1">
                                            Reported By
                                        </label>
                                        <select
                                            name="reporter"
                                            value={formData.reporter}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Select Reporter</option>
                                            <option value="raman">Raman's Beauty Lounge</option>
                                            <option value="alice">Alice Corp</option>
                                            <option value="bob">Bob Enterprises</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-primary mb-1">
                                            Assigned To
                                        </label>
                                        <select
                                            name="assignee"
                                            value={formData.assignee}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Select Assignee</option>
                                            <option value="manager1">John Manager</option>
                                            <option value="manager2">Sarah Lead</option>
                                            <option value="manager3">Tom Admin</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Driver & Vehicle */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-primary mb-1">
                                            Driver
                                        </label>
                                        <select
                                            name="driver"
                                            value={formData.driver}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Select Driver</option>
                                            <option value="mike">Mike Johnson</option>
                                            <option value="jane">Jane Smith</option>
                                            <option value="john">John Doe</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-primary mb-1">
                                            Vehicle
                                        </label>
                                        <select
                                            name="vehicle"
                                            value={formData.vehicle}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Select Vehicle</option>
                                            <option value="truck-alpha">Truck Alpha</option>
                                            <option value="van-beta">Van Beta</option>
                                            <option value="car-gamma">Car Gamma</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Issue Type & Category */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-primary mb-1">
                                            Issue Type
                                        </label>
                                        <select
                                            name="issueType"
                                            value={formData.issueType}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Select Type</option>
                                            <option value="operational">Operational</option>
                                            <option value="maintenance">Maintenance</option>
                                            <option value="accident">Accident</option>
                                            <option value="compliance">Compliance</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-primary mb-1">
                                            Issue Category
                                        </label>
                                        <select
                                            name="issueCategory"
                                            value={formData.issueCategory}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Select Category</option>
                                            <option value="engine">Engine</option>
                                            <option value="fuel">Fuel</option>
                                            <option value="paperwork">Paperwork</option>
                                            <option value="damage">Minor Damage</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Issue Report */}
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">
                                        Issue Report
                                    </label>
                                    <textarea
                                        name="issueReport"
                                        value={formData.issueReport}
                                        onChange={handleInputChange}
                                        placeholder="Describe the issue"
                                        rows={3}
                                        className="w-full px-3 py-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Issue Tags */}
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">
                                        Issue Tags
                                    </label>
                                    <input
                                        type="text"
                                        name="issueTags"
                                        value={formData.issueTags}
                                        onChange={handleInputChange}
                                        placeholder="Add tags (comma separated)"
                                        className="w-full px-3 py-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Priority & Status */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-primary mb-1">
                                            Issue Priority
                                        </label>
                                        <select
                                            name="priority"
                                            value={formData.priority}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="Low">Low</option>
                                            <option value="Medium">Medium</option>
                                            <option value="High">High</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-primary mb-1">
                                            Status
                                        </label>
                                        <select
                                            name="status"
                                            value={formData.status}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="Open">Open</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Closed">Closed</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Coordinates */}
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-1">
                                        Coordinates
                                    </label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <input
                                            type="number"
                                            name="latitude"
                                            value={formData.latitude}
                                            onChange={handleInputChange}
                                            placeholder="Latitude"
                                            step="any"
                                            className="w-full px-3 py-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <input
                                            type="number"
                                            name="longitude"
                                            value={formData.longitude}
                                            onChange={handleInputChange}
                                            placeholder="Longitude"
                                            step="any"
                                            className="w-full px-3 py-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        className="mt-2 text-[#00D1FF] text-sm hover:text-blue-700 flex items-center"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="w-4 h-4 mr-1"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 11c0 .55-.45 1-1 1s-1-.45-1-1 .45-1 1-1 1 .45 1 1zm0-7C9.24 4 7 6.24 7 9c0 5.25 5 11 5 11s5-5.75 5-11c0-2.76-2.24-5-5-5z"
                                            />
                                        </svg>
                                        Select from map
                                    </button>
                                </div>
                            </div>

                        )}
                    </div>


                </div>

                {/* Fixed Footer */}
                <div className="p-4 border-t border-theme flex-shrink-0 bg-card sticky bottom-0 z-[102] shadow-lg">
                    <div className="flex justify-end space-x-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-theme !mr-3 rounded-md text-primary hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            className="px-4 py-2 bg-blue-600 !text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                            Create Issue
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default NewIssuesSidebar;