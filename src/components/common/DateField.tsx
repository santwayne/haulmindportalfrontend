import { useRef } from "react";
import { Calendar } from "lucide-react";

interface DateFieldProps {
  label?: React.ReactNode;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
}

export default function DateField({
  label,
  value,
  onChange,
  error,
  required,
}: DateFieldProps) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-primary mb-1">
          {label} {required && <span className="text-[var(--accent-red)]">*</span>}
        </label>
      )}

      <div
        className="relative cursor-pointer"
        onMouseDown={(e) => {
          e.preventDefault();
          ref.current?.showPicker?.();
          ref.current?.focus();
        }}
      >
        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary pointer-events-none z-10" />

        <input
          ref={ref}
          type="date"
          value={value}
          onChange={onChange}
          className={`w-full pl-10 pr-3 py-2 bg-[rgba(255,255,255,0.05)] text-primary border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] hover:bg-[rgba(0,209,255,0.08)] transition-all duration-200 cursor-pointer ${
            error ? "border-[var(--accent-red)]" : "border-theme"
          }`}
        />
      </div>

      {error && (
        <p className="text-xs text-[var(--accent-red)] mt-0.5">{error}</p>
      )}
    </div>
  );
}