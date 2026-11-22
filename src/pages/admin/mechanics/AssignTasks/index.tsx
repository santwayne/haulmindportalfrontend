import React from "react";
import { useSearchParams } from "react-router-dom";
import { Wrench, ClipboardList } from "lucide-react";
import Services from "../Services";
import Orders from "../Orders";

type TabKey = "services" | "repairs";

const TABS: Array<{ key: TabKey; label: string; hint: string; icon: React.ReactNode }> = [
  {
    key: "services",
    label: "Scheduled Services",
    hint: "Services from the Scheduled Services Log",
    icon: <Wrench size={16} />,
  },
  {
    key: "repairs",
    label: "Repair Orders",
    hint: "Repairs from the Maintenance Orders Log",
    icon: <ClipboardList size={16} />,
  },
];

/**
 * Assign Tasks — everything the fleet manager has assigned to this mechanic that is
 * still open. Completing a task moves it to Completed Orders (and the fleet manager's
 * Maintenance Orders Log).
 */
const AssignTasks: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const active: TabKey = params.get("tab") === "repairs" ? "repairs" : "services";

  return (
    <div className="p-6 bg-main min-h-screen">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-headings">Assign Tasks</h1>
        <p className="text-sm text-secondary mt-1">
          Work assigned to you. When you complete a task it moves to Completed Orders.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6 border-b border-theme">
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              type="button"
              title={tab.hint}
              onClick={() => setParams(tab.key === "services" ? {} : { tab: tab.key }, { replace: true })}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium -mb-px border-b-2 transition ${
                isActive
                  ? "border-[var(--accent-blue)] text-[var(--accent-blue)]"
                  : "border-transparent text-secondary hover:text-primary"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {active === "services" ? <Services embedded /> : <Orders defaultStatus="pending" embedded />}
    </div>
  );
};

export default AssignTasks;
