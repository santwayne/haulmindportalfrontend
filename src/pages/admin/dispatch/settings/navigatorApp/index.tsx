import { useState } from 'react';

type FieldKey =
    | "name"
    | "description"
    | "sku"
    | "height"
    | "width"
    | "length"
    | "weight"
    | "declaredValue"
    | "salePrice";

type SelectedFields = {
    [K in FieldKey]: boolean;
};


const NavigatorSettings = () => {
    const [allowDriverEdit, setAllowDriverEdit] = useState(false);
    const [enableDriverOnboard, setEnableDriverOnboard] = useState(false);
    const [onboardMethod, setOnboardMethod] = useState('invite');
    const [requireDocuments, setRequireDocuments] = useState(false);

    const [selectedFields, setSelectedFields] = useState<SelectedFields>({
        name: false,
        description: false,
        sku: false,
        height: false,
        width: false,
        length: false,
        weight: false,
        declaredValue: false,
        salePrice: false,
    });

    const handleFieldChange = (field: FieldKey) => {
        setSelectedFields((prev) => ({
            ...prev,
            [field]: !prev[field],
        }));
    };

    const fieldLabels: Record<FieldKey, string> = {
        name: "Name",
        description: "Description",
        sku: "SKU",
        height: "Height",
        width: "Width",
        length: "Length",
        weight: "Weight",
        declaredValue: "Declared Value",
        salePrice: "Sale Price",
    };

    return (
        <div className="min-h-screen bg-card p-6">
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <h1 className="text-2xl font-semibold text-primary mb-8">Navigator App Settings</h1>

                {/* Entity Field Editing Settings */}
                <div className="bg-card rounded-lg shadow-sm border border-theme">
                    <div className="bg-purple-400 text-white px-6 py-3 rounded-t-lg">
                        <h2 className="text-lg font-medium">Entity Field Editing Settings</h2>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Transport/Storefront Tabs */}
                        <div className="flex space-x-4 border-b border-theme">
                            <button className="px-4 py-2 text-sm font-medium text-primary border-b-2 border-purple-400">
                                Transport
                            </button>
                            <button className="px-4 py-2 text-sm font-medium text-secondary hover:text-primary">
                                Storefront
                            </button>
                        </div>

                        {/* Allow Drivers to edit entity details */}
                        <div className="flex items-center space-x-3">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={allowDriverEdit}
                                    onChange={(e) => setAllowDriverEdit(e.target.checked)}
                                />
                                <div className={`w-11 h-6 rounded-full transition-colors ${allowDriverEdit ? 'bg-green-500' : 'bg-gray-300'
                                    }`}>
                                    <div className={`w-5 h-5 bg-card rounded-full shadow transform transition-transform ${allowDriverEdit ? 'translate-x-5' : 'translate-x-0'
                                        } mt-0.5 ml-0.5`}></div>
                                </div>
                            </label>
                            <span className="text-sm text-primary">Allow Drivers to edit entity details</span>
                        </div>

                        {/* Conditional Field Selection */}
                        {allowDriverEdit && (
                            <div className="mt-6 p-4 bg-card rounded-lg border border-theme">
                                <h3 className="text-sm font-medium text-primary mb-4">Select fields drivers can edit:</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {Object.entries(fieldLabels).map(([key, label]) => (
                                        <div key={key} className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id={key}
                                                checked={selectedFields[key as FieldKey]}   // ✅ Cast to FieldKey
                                                onChange={() => handleFieldChange(key as FieldKey)}
                                                className="w-4 h-4 text-purple-600 bg-card border-theme rounded focus:ring-purple-500 focus:ring-2"
                                            />

                                            <label htmlFor={key} className="text-sm text-primary cursor-pointer">
                                                {label}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button className="bg-green-500 hover:bg-green-600 !text-white px-6 py-2 rounded text-sm font-medium transition-colors">
                            Save Changes
                        </button>
                    </div>
                </div>

                {/* Driver Onboard Settings */}
                <div className="bg-card rounded-lg shadow-sm border border-theme">
                    <div className="bg-purple-400 text-white px-6 py-3 rounded-t-lg">
                        <h2 className="text-lg font-medium">Driver Onboard Settings</h2>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Enable Drivers onboard From navigator app */}
                        <div className="flex items-center space-x-3">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={enableDriverOnboard}
                                    onChange={(e) => setEnableDriverOnboard(e.target.checked)}
                                />
                                <div className={`w-11 h-6 rounded-full transition-colors ${enableDriverOnboard ? 'bg-green-500' : 'bg-gray-300'
                                    }`}>
                                    <div className={`w-5 h-5 bg-card rounded-full shadow transform transition-transform ${enableDriverOnboard ? 'translate-x-5' : 'translate-x-0'
                                        } mt-0.5 ml-0.5`}></div>
                                </div>
                            </label>
                            <span className="text-sm text-primary">Enable Drivers onboard From navigator app</span>
                        </div>

                        {/* Conditional Onboard Method Selection */}
                        {enableDriverOnboard && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-primary mb-2">
                                        Select driver onboard method
                                    </label>
                                    <select
                                        value={onboardMethod}
                                        onChange={(e) => setOnboardMethod(e.target.value)}
                                        className="w-full px-3 py-2 border border-theme rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-card text-sm"
                                    >
                                        <option value="invite">Invite</option>
                                        <option value="direct">Direct Registration</option>
                                        <option value="approval">Approval Required</option>
                                    </select>
                                </div>

                                {/* Require driver to upload onboard documents */}
                                <div className="flex items-center space-x-3">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={requireDocuments}
                                            onChange={(e) => setRequireDocuments(e.target.checked)}
                                        />
                                        <div className={`w-11 h-6 rounded-full transition-colors ${requireDocuments ? 'bg-green-500' : 'bg-gray-300'
                                            }`}>
                                            <div className={`w-5 h-5 bg-card rounded-full shadow transform transition-transform ${requireDocuments ? 'translate-x-5' : 'translate-x-0'
                                                } mt-0.5 ml-0.5`}></div>
                                        </div>
                                    </label>
                                    <span className="text-sm text-primary">Require driver to upload onboard documents</span>
                                </div>

                                {/* Conditional Document Upload Area */}
                                {requireDocuments && (
                                    <div className="mt-6 p-6 bg-card rounded-lg border border-theme">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-medium text-primary">Required onboard documents</h3>
                                            <button className="bg-blue-500 hover:bg-blue-600 !text-white px-4 py-2 rounded text-sm font-medium transition-colors flex items-center space-x-2">
                                                <span>+</span>
                                                <span>Add onboard document</span>
                                            </button>
                                        </div>

                                        <div className="h-32 border-2 border-dashed border-theme rounded-lg flex items-center justify-center bg-card">
                                            <div className="text-center">
                                                <div className="text-secondary mb-2">
                                                    <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                </div>
                                                <p className="text-sm text-secondary">No documents added yet</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <button className="bg-green-500 hover:bg-green-600 !text-white px-6 py-2 rounded text-sm font-medium transition-colors">
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NavigatorSettings;