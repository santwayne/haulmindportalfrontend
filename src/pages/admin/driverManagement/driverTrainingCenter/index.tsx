import { useState } from "react";
import TrainingCertificates from "../trainingCertificates/index";
import TrainingTestManagement from "../trainingTestManagement/index";

type TabType = "certificates" | "training" | "questions";

const DriverTrainingCenter = () => {
  const [activeTab, setActiveTab] = useState<TabType>("certificates");

  const tabs = [
    { key: "certificates", label: "Certificates" },
    { key: "training", label: "Training Content" },
    { key: "questions", label: "Question Banks" },
  ];

  return (
    <div className="p-6 bg-main min-h-screen">
      <div className="w-full mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold  mb-2 text-[var(--accent-navyblue)]">
            Driver Training Center
          </h1>
          <p className="text-secondary">
            Manage driver certificates, training materials, and test questions
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-card rounded-lg shadow-sm mb-6">
          <div className="flex border-b border-theme">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabType)}
                className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === tab.key
                  ? "text-[rgba(0,209,255,0.15)] border-b-2 border-[rgba(0,209,255,0.15)]"
                  : "text-secondary hover:text-primary"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === "certificates" && <TrainingCertificates hideHeader={true} />}
          {activeTab === "training" && <TrainingTestManagement showOnly="training" />}
          {activeTab === "questions" && <TrainingTestManagement showOnly="questions" />}
        </div>
      </div>
    </div>
  );
};

export default DriverTrainingCenter;

