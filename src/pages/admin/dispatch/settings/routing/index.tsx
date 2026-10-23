// RoutingConfig.tsx
import  { useEffect, useState } from "react";

const ROUTING_SERVICES = ["OSRM", "Mapbox", "Google Maps", "Here Maps"];
const DISTANCE_UNITS = ["Kilometers", "Miles"];

export default function RoutingConfig() {
  const [open, setOpen] = useState(true);
  const [service, setService] = useState<string>("");
  const [unit, setUnit] = useState<string>("");
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // mark dirty when user changes any value
    setDirty(Boolean(service || unit));
  }, [service, unit]);

  const handleReset = () => {
    setService("");
    setUnit("");
    setDirty(false);
  };

  const handleSave = () => {
    // TODO: replace with your API call
    console.log("Saving routing config:", { service, unit });
    setSaved(true);
    setDirty(false);

    // hide toast after 2s
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-[60vh] w-full bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4">
      <div className="mx-auto w-full max-w-2xl">
        <div className="relative bg-card rounded-2xl shadow-xl ring-1 ring-gray-200 overflow-hidden">
          {/* Header */}
          <button
            onClick={() => setOpen((s) => !s)}
            aria-expanded={open}
            className="w-full flex items-center justify-between gap-4 p-6 border-b border-theme hover:bg-[rgba(255,255,255,0.03)]"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 ring-1 ring-indigo-100">
                <svg
                  className="h-5 w-5 text-indigo-600"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M12 2v6M12 16v6M4 12h6M14 12h6"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="text-left">
                <h3 className="text-lg font-semibold text-primary">
                  Configure Routing
                </h3>
                <p className="mt-1 text-sm text-secondary">
                  Choose routing engine and distance unit used across the
                  platform.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">

              <svg
                className={`h-5 w-5 transform transition-transform duration-200 ${
                  open ? "rotate-180" : "rotate-0"
                } text-secondary`}
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" />
              </svg>
            </div>
          </button>

          {/* Content */}
          {open && (
            <div className="p-6 space-y-6">
              {/* Routing Service */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Routing Service
                  <span
                    className="ml-2 text-xs text-secondary"
                    title="Which routing engine should be used to calculate routes."
                  >
                    ⓘ
                  </span>
                </label>

                <div className="relative">
                  <select
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className="block w-full rounded-lg border border-theme bg-card px-4 py-3 pr-10 text-sm text-primary shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    aria-label="Routing Service"
                  >
                    <option value="">Select routing service...</option>
                    {ROUTING_SERVICES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    <svg
                      className="h-5 w-5 text-secondary"
                      viewBox="0 0 20 20"
                      fill="none"
                    >
                      <path
                        d="M6 8l4 4 4-4"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Routing Distance Unit */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Routing Distance Unit
                  <span
                    className="ml-2 text-xs text-secondary"
                    title="Unit used for route distances and calculations."
                  >
                    ⓘ
                  </span>
                </label>

                <div className="relative">
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="block w-full rounded-lg border border-theme bg-card px-4 py-3 pr-10 text-sm text-primary shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    aria-label="Routing Distance Unit"
                  >
                    <option value="">Select routing unit...</option>
                    {DISTANCE_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                    <svg
                      className="h-5 w-5 text-secondary"
                      viewBox="0 0 20 20"
                      fill="none"
                    >
                      <path
                        d="M6 8l4 4 4-4"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm text-secondary">
                  Changes affect new route calculations immediately after saving.
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="rounded-md px-4 py-2 text-sm font-medium text-primary ring-1 ring-inset ring-gray-200 hover:bg-[rgba(255,255,255,0.03)] disabled:opacity-50"
                    disabled={!dirty}
                  >
                    Reset
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!dirty}
                    className={`inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold !text-white shadow-sm transition ${
                      dirty
                        ? "bg-gradient-to-br from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600"
                        : "opacity-50 cursor-not-allowed bg-indigo-400"
                    }`}
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M5 13l4 4L19 7"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Saved toast */}
          {saved && (
            <div className="absolute right-4 top-4 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium !text-white shadow">
              Saved
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
