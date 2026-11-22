import { useEffect, useMemo, useState } from 'react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEARS_BACK = 100;

const pad = (n: number) => String(n).padStart(2, '0');

const parseDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || '');
  return match ? { year: match[1], month: match[2], day: match[3] } : null;
};

interface DateOfBirthFieldProps {
  /** YYYY-MM-DD, or empty until year, month and day are all chosen */
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
}

/**
 * Year, month and day dropdowns for dates far in the past, where a calendar
 * means paging back through decades. Typing "1980" in the year also selects it.
 */
const DateOfBirthField = ({ value, onChange, error }: DateOfBirthFieldProps) => {
  const [parts, setParts] = useState(() => parseDate(value) || { year: '', month: '', day: '' });

  useEffect(() => {
    const parsed = parseDate(value);
    if (parsed) setParts(parsed);
    else setParts((p) => (p.year && p.month && p.day ? { year: '', month: '', day: '' } : p));
  }, [value]);

  const today = new Date();
  const thisYear = today.getFullYear();
  const isThisYear = Number(parts.year) === thisYear;
  const isThisMonth = isThisYear && Number(parts.month) === today.getMonth() + 1;

  const years = useMemo(() => {
    const list = Array.from({ length: YEARS_BACK + 1 }, (_, i) => String(thisYear - i));
    // Keep a saved date selectable even if it falls outside the list
    return parts.year && !list.includes(parts.year) ? [...list, parts.year] : list;
  }, [thisYear, parts.year]);

  const lastMonth = isThisYear ? today.getMonth() + 1 : 12;
  const monthDays = parts.year && parts.month
    ? new Date(Number(parts.year), Number(parts.month), 0).getDate()
    : 31;
  const lastDay = isThisMonth ? today.getDate() : monthDays;

  const update = (change: Partial<typeof parts>) => {
    const next = { ...parts, ...change };
    const nextIsThisYear = Number(next.year) === thisYear;
    // Clear a month or day that the new choice makes invalid, such as Feb 31
    if (nextIsThisYear && Number(next.month) > today.getMonth() + 1) next.month = '';
    if (next.year && next.month && next.day) {
      const nextIsThisMonth = nextIsThisYear && Number(next.month) === today.getMonth() + 1;
      const maxDay = nextIsThisMonth
        ? today.getDate()
        : new Date(Number(next.year), Number(next.month), 0).getDate();
      if (Number(next.day) > maxDay) next.day = '';
    }
    setParts(next);
    onChange(next.year && next.month && next.day ? `${next.year}-${next.month}-${next.day}` : '');
  };

  const selectClass = `min-w-0 px-1.5 py-2 text-sm text-primary bg-[rgba(15,31,23,0.05)] border rounded-lg cursor-pointer transition-all duration-200 hover:bg-[rgba(5,150,105,0.08)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)] focus:border-[var(--accent-blue)] ${
    error ? 'border-[var(--accent-red)]' : 'border-theme'
  }`;

  return (
    <div className="grid grid-cols-[1.25fr_1.1fr_1fr] gap-1">
      <select
        aria-label="Birth year"
        value={parts.year}
        onChange={(e) => update({ year: e.target.value })}
        className={selectClass}
      >
        <option className="form-option" value="">Year</option>
        {years.map((y) => <option className="form-option" key={y} value={y}>{y}</option>)}
      </select>
      <select
        aria-label="Birth month"
        value={parts.month}
        onChange={(e) => update({ month: e.target.value })}
        className={selectClass}
      >
        <option className="form-option" value="">Month</option>
        {MONTHS.slice(0, lastMonth).map((m, i) => (
          <option className="form-option" key={m} value={pad(i + 1)}>{m}</option>
        ))}
      </select>
      <select
        aria-label="Birth day"
        value={parts.day}
        onChange={(e) => update({ day: e.target.value })}
        className={selectClass}
      >
        <option className="form-option" value="">Day</option>
        {Array.from({ length: lastDay }, (_, i) => (
          <option className="form-option" key={i} value={pad(i + 1)}>{i + 1}</option>
        ))}
      </select>
    </div>
  );
};

export default DateOfBirthField;
