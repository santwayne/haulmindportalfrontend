import React, { useMemo, useState } from "react";

// ---- Types ----
type EventKey =
  | "orderAssigned"
  | "orderCanceled"
  | "orderDispatched"
  | "orderDispatchFailed"
  | "orderPing"
  | "orderFailed"
  | "orderCompleted";

type SelectionMap = Partial<Record<EventKey, string>>;

// ---- Data ----
const EVENTS: { key: EventKey; label: string; hint?: string }[] = [
  { key: "orderAssigned", label: "Order Assigned", hint: "When an order is allotted to a driver/partner." },
  { key: "orderCanceled", label: "Order Canceled", hint: "When an order is canceled by any party." },
  { key: "orderDispatched", label: "Order Dispatched", hint: "When an order leaves the facility." },
  { key: "orderDispatchFailed", label: "Order Dispatch Failed", hint: "Dispatch attempt could not be completed." },
  { key: "orderPing", label: "Order Ping", hint: "Periodic status ping / heartbeat." },
  { key: "orderFailed", label: "Order Failed", hint: "Order processing failed." },
  { key: "orderCompleted", label: "Order Completed", hint: "Order finished and closed." },
];

const OPTION_GROUPS: { group: string; options: { value: string; label: string }[] }[] = [
  {
    group: "User",
    options: [{ value: "user:ramans-beauty-lounge", label: "Raman's Beauty Lounge" }],
  },
  {
    group: "Dynamic",
    options: [
      { value: "dynamic:customer", label: "Customer" },
      { value: "dynamic:driver", label: "Driver" },
      { value: "dynamic:facilitator", label: "Facilitator" },
    ],
  },
];

// ---- Component ----
const NotificationConfig: React.FC = () => {
  const [selections, setSelections] = useState<SelectionMap>({});
  const [bulk, setBulk] = useState<string>("");

  const hasAnySelection = useMemo(
    () => Object.values(selections).some(Boolean),
    [selections]
  );

  const handleChange = (k: EventKey, value: string) => {
    setSelections((prev) => ({ ...prev, [k]: value }));
  };

  const handleApplyAll = () => {
    if (!bulk) return;
    const next: SelectionMap = {};
    EVENTS.forEach((e) => (next[e.key] = bulk));
    setSelections(next);
  };

  const handleReset = () => setSelections({});

  const handleSave = () => {
    // Replace with API call
    // fetch('/api/notifications', { method: 'POST', body: JSON.stringify(selections) })
    console.log("Saved Configurations:", selections);
    alert("Notifications configuration saved.");
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4">
      <div className="mx-auto w-full max-w-3xl">
        {/* Card */}
        <div className="bg-card rounded-2xl shadow-xl ring-1 ring-gray-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 p-6 border-b border-theme">
            <div className="flex items-center gap-3">
              {/* Bell Icon */}
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-card ring-1 ring-gray-200">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 text-primary">
                  <path fill="currentColor" d="M12 22a2.5 2.5 0 0 0 2.45-2H9.55A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5-6.7V4a2 2 0 1 0-4 0v.3A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z"/>
                </svg>
              </span>
              <div>
                <h2 className="text-xl font-semibold text-primary tracking-tight">Configure Notifications</h2>
                <p className="text-sm text-secondary">Choose who should be notified for each order event.</p>
              </div>
            </div>
          
          </div>

          {/* Quick Apply */}
          <div className="p-6 border-b border-theme bg-card/60">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Quick apply to all</label>
                <select
                  value={bulk}
                  onChange={(e) => setBulk(e.target.value)}
                  className="w-full rounded-lg border border-theme bg-card px-3 py-2 text-sm text-primary shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="">Select notifiables...</option>
                  {OPTION_GROUPS.map((g) => (
                    <optgroup key={g.group} label={g.group}>
                      {g.options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleApplyAll}
                className="self-end inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold !text-white bg-blue-600 shadow hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
              >
                Apply to all
              </button>
            </div>
          </div>

          {/* Form rows */}
          <div className="divide-y divide-gray-100">
            {EVENTS.map((evt) => (
              <div key={evt.key} className="p-6">
                <div className="grid items-start gap-3 sm:grid-cols-[220px_minmax(0,1fr)]">
                  <div className="pt-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-primary">{evt.label}</h3>
                      {evt.hint && (
                        <span
                          className="cursor-default text-secondary"
                          title={evt.hint}
                          aria-label="Hint"
                        >
                          <svg viewBox="0 0 24 24" className="h-4 w-4"><path fill="currentColor" d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm1 15h-2v-2h2Zm1.07-7.75-.9.92A2.51 2.51 0 0 0 12 12h-1v-1a3.5 3.5 0 1 1 6 0 1 1 0 0 1-2 0 1.5 1.5 0 1 0-3 0Z"/></svg>
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-secondary">Select who receives notifications.</p>
                  </div>

                  <div>
                    <select
                      value={selections[evt.key] || ""}
                      onChange={(e) => handleChange(evt.key, e.target.value)}
                      className="w-full rounded-lg border border-theme bg-card px-3 py-2 text-sm text-primary shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    >
                      <option value="">Select notifiables...</option>
                      {OPTION_GROUPS.map((g) => (
                        <optgroup key={g.group} label={g.group}>
                          {g.options.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-6 bg-card/80">
            <div className="text-xs text-secondary">Changes are saved to your workspace configuration.</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                disabled={!hasAnySelection}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-primary ring-1 ring-inset ring-gray-300 hover:bg-[rgba(255,255,255,0.03)] disabled:opacity-50 disabled:hover:bg-card"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold !text-white bg-blue-600 shadow hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationConfig;
