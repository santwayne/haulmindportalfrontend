import React, { useState } from "react";
import { X, Plus, Settings, Database, Activity, Building } from "lucide-react";
import type { LucideIcon } from "lucide-react";



interface TabButtonProps {
    label: string;
    icon: LucideIcon;
    isActive: boolean;
    onClick: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ label, icon: Icon, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
      ${isActive
                ? "bg-blue-100 text-blue-700 border border-blue-200"
                : "text-secondary hover:text-primary hover:bg-[rgba(255,255,255,0.03)]"
            }`}
    >
        <Icon className="w-4 h-4" />
        <span>{label}</span>
    </button>
);


const OrdersConfiguration = () => {
    const [activeTab, setActiveTab] = useState<"details" | "custom-fields" | "activity-flow" | "entities">("details");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [configName, setConfigName] = useState("");
    const [configDescription, setConfigDescription] = useState("");
    const [configTags, setConfigTags] = useState("");

    // Sample configuration data
    const configData = {
        name: "Transport",
        description: "Default order configuration for transport",
        tags: ["transport", "delivery"],
        key: "transport",
        namespace: "system.order.config.transport",
        version: "0.0.1"
    };

    const handleCreateConfig = () => {
        // Handle config creation logic here
        console.log("Creating config:", { configName, configDescription, configTags });
        setIsModalOpen(false);
        // Reset form
        setConfigName("");
        setConfigDescription("");
        setConfigTags("");
    };



    return (
        <div className="min-h-screen bg-card">
            {/* Header */}
            <div className="bg-card border-b border-theme px-6 py-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold text-primary">Orders Configuration</h1>
                    <div className="flex items-center space-x-3">
                        <select className="px-3 py-2 border !mr-2 border-theme rounded-md text-sm bg-card">
                            <option>Transport</option>
                            <option>Pickup</option>
                            <option>Delivery</option>
                        </select>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center space-x-2  px-4 py-2 bg-blue-600 !text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            <span>New Order Config</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-card border-b border-theme px-6">
                <div className="flex space-x-1 py-4">
                    <TabButton

                        label="Details"
                        icon={Settings}
                        isActive={activeTab === "details"}
                        onClick={() => setActiveTab("details")}
                    />
                    <TabButton

                        label="Custom Fields"
                        icon={Database}
                        isActive={activeTab === "custom-fields"}
                        onClick={() => setActiveTab("custom-fields")}
                    />
                    <TabButton

                        label="Activity Flow"
                        icon={Activity}
                        isActive={activeTab === "activity-flow"}
                        onClick={() => setActiveTab("activity-flow")}
                    />
                    <TabButton

                        label="Entities"
                        icon={Building}
                        isActive={activeTab === "entities"}
                        onClick={() => setActiveTab("entities")}
                    />
                </div>
            </div>

            {/* Content Area */}
            <div className="p-6">
                <div className="bg-card rounded-lg shadow-sm border border-theme p-6">
                    {activeTab === "details" && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-medium text-primary mb-4">Configuration Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-primary mb-2">Name</label>
                                        <input
                                            type="text"
                                            value={configData.name}
                                            className="w-full px-3 py-2 border border-theme rounded-md bg-card"

                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-primary mb-2">Key</label>
                                        <input
                                            type="text"
                                            value={configData.key}
                                            className="w-full px-3 py-2 border border-theme rounded-md bg-card"

                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-primary mb-2">Description</label>
                                        <textarea
                                            value={configData.description}
                                            rows={3}
                                            className="w-full px-3 py-2 border border-theme rounded-md bg-card"

                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-primary mb-2">Tags</label>
                                        <div className="flex flex-wrap gap-2">
                                            {configData.tags.map((tag, index) => (
                                                <span
                                                    key={index}
                                                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-primary mb-2">Version</label>
                                        <input
                                            type="text"
                                            value={configData.version}
                                            className="w-full px-3 py-2 border border-theme rounded-md bg-card"

                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-primary mb-2">Namespace</label>
                                        <input
                                            type="text"
                                            value={configData.namespace}
                                            className="w-full px-3 py-2 border border-theme rounded-md bg-card"

                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "custom-fields" && (
                        <div>
                            <h3 className="text-lg font-medium text-primary mb-4">Custom Fields</h3>
                            <div className="text-center py-12">
                                <Database className="w-12 h-12 text-secondary mx-auto mb-4" />
                                <p className="text-secondary">No custom fields configured</p>
                                <button className="mt-4 px-4 py-2 bg-blue-600 !text-white rounded-md hover:bg-blue-700 transition-colors">
                                    Add Custom Field
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === "activity-flow" && (
                        <div>
                            <h3 className="text-lg font-medium text-primary mb-4">Activity Flow</h3>
                            <div className="text-center py-12">
                                <Activity className="w-12 h-12 text-secondary mx-auto mb-4" />
                                <p className="text-secondary">No activity flows configured</p>
                                <button className="mt-4 px-4 py-2 bg-blue-600 !text-white rounded-md hover:bg-blue-700 transition-colors">
                                    Create Activity Flow
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === "entities" && (
                        <div>
                            <h3 className="text-lg font-medium text-primary mb-4">Entities</h3>
                            <div className="text-center py-12">
                                <Building className="w-12 h-12 text-secondary mx-auto mb-4" />
                                <p className="text-secondary">No entities configured</p>
                                <button className="mt-4 px-4 py-2 bg-blue-600 !text-white rounded-md hover:bg-blue-700 transition-colors">
                                    Add Entity
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-card rounded-lg shadow-xl w-full max-w-md mx-4">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b border-theme">
                            <h3 className="text-lg font-semibold text-primary">
                                Create a new order configuration
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-secondary hover:text-secondary transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-primary mb-1">
                                    Config Name
                                </label>
                                <input
                                    type="text"
                                    value={configName}
                                    onChange={(e) => setConfigName(e.target.value)}
                                    placeholder="Config Name"
                                    className="w-full px-3 py-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-primary mb-1">
                                    Config Description
                                </label>
                                <textarea
                                    value={configDescription}
                                    onChange={(e) => setConfigDescription(e.target.value)}
                                    placeholder="Config Description"
                                    rows={3}
                                    className="w-full px-3 py-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-primary mb-1">
                                    Config Tags
                                </label>
                                <input
                                    type="text"
                                    value={configTags}
                                    onChange={(e) => setConfigTags(e.target.value)}
                                    placeholder="Add tags"
                                    className="w-full px-3 py-2 border border-theme rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end space-x-3 p-4 border-t border-theme">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-primary bg-card !mr-2 rounded-md hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateConfig}
                                className="px-4 py-2 bg-blue-600 !text-white rounded-md hover:bg-blue-700 transition-colors"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrdersConfiguration;