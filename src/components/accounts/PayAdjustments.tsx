import { Plus, Trash2 } from 'lucide-react';
import { type PayLine, newPayLine, sumPayLines } from '../../utils/payLines';

// Additions / deductions on a payroll or settlement. Every line must say what it is for
// (client: "if we are doing deduction or addition we have to mention what it is for,
// for example insurance deduction, registration in case of owner-operator").

const ADDITION_SUGGESTIONS = ['Delivery', 'Pickup', 'Layover', 'City work', 'Detention', 'Safety bonus', 'Reimbursement', 'Overtime adjustment'];
const DEDUCTION_SUGGESTIONS = ['Insurance deduction', 'Registration', 'Advance recovery', 'Fuel advance', 'Equipment / uniform', 'Damage', 'Driver deduction', 'Truck rent', 'Escrow'];

interface Props {
    additions: PayLine[];
    deductions: PayLine[];
    onChange: (additions: PayLine[], deductions: PayLine[]) => void;
    currency?: string;
    title?: string;
}

const Section = ({
    kind, lines, onLines, currency,
}: { kind: 'addition' | 'deduction'; lines: PayLine[]; onLines: (l: PayLine[]) => void; currency: string }) => {
    const isAdd = kind === 'addition';
    const listId = `pay-${kind}-suggestions`;
    const update = (id: string, patch: Partial<PayLine>) => onLines(lines.map(l => (l.id === id ? { ...l, ...patch } : l)));
    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <h6 className={`text-sm font-semibold ${isAdd ? 'text-green-600' : 'text-red-600'}`}>
                    {isAdd ? 'Additions (+)' : 'Deductions (−)'}
                </h6>
                <button
                    type="button"
                    onClick={() => onLines([...lines, newPayLine()])}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 border border-theme rounded hover:bg-[rgba(15,31,23,0.05)]"
                >
                    <Plus size={14} /> Add {isAdd ? 'addition' : 'deduction'}
                </button>
            </div>
            <datalist id={listId}>
                {(isAdd ? ADDITION_SUGGESTIONS : DEDUCTION_SUGGESTIONS).map(s => <option key={s} value={s} />)}
            </datalist>
            {lines.length === 0 ? (
                <p className="text-xs text-secondary">None</p>
            ) : (
                <div className="space-y-2">
                    {lines.map(line => {
                        const missingMemo = (parseFloat(String(line.amount)) || 0) > 0 && !line.memo.trim();
                        return (
                            <div key={line.id} className="flex flex-wrap md:flex-nowrap items-center gap-2">
                                <input
                                    type="text"
                                    list={listId}
                                    value={line.memo}
                                    onChange={e => update(line.id, { memo: e.target.value })}
                                    placeholder={isAdd ? 'What is it for? e.g. Layover' : 'What is it for? e.g. Insurance deduction'}
                                    className={`flex-1 min-w-[180px] px-3 py-2 text-sm border rounded-lg bg-[var(--bg-card)] ${missingMemo ? 'border-red-500' : 'border-theme'}`}
                                />
                                <input
                                    type="date"
                                    value={line.date || ''}
                                    onChange={e => update(line.id, { date: e.target.value })}
                                    className="w-36 px-2 py-2 text-sm border border-theme rounded-lg bg-[var(--bg-card)]"
                                    title="Date (optional)"
                                />
                                <div className="relative w-32">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-secondary">{currency === 'USD' ? 'US$' : '$'}</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={line.amount}
                                        onChange={e => update(line.id, { amount: e.target.value })}
                                        placeholder="0.00"
                                        className="w-full pl-8 pr-2 py-2 text-sm border border-theme rounded-lg bg-[var(--bg-card)]"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onLines(lines.filter(l => l.id !== line.id))}
                                    className="p-2 text-red-500 hover:bg-red-500/10 rounded"
                                    title="Remove"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default function PayAdjustments({ additions, deductions, onChange, currency = 'CAD', title = 'Additions & Deductions' }: Props) {
    return (
        <div className="bg-card border border-theme rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-theme">
                <h5 className="text-sm font-medium text-headings">{title}</h5>
                <p className="text-xs text-secondary mt-1">Each line needs a memo saying what it is for. Memos are printed on the pay statement.</p>
            </div>
            <div className="p-4 space-y-5">
                <Section kind="addition" lines={additions} onLines={l => onChange(l, deductions)} currency={currency} />
                <Section kind="deduction" lines={deductions} onLines={l => onChange(additions, l)} currency={currency} />
                <div className="flex justify-end gap-6 text-sm pt-2 border-t border-theme">
                    <span className="text-green-600">Additions: +${sumPayLines(additions).toFixed(2)}</span>
                    <span className="text-red-600">Deductions: −${sumPayLines(deductions).toFixed(2)}</span>
                </div>
            </div>
        </div>
    );
}
