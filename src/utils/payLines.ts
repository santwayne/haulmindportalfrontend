// Additions / deductions lines (memo + amount) shared by payroll, driver payroll and settlements

export interface PayLine {
    id: string;
    memo: string;
    amount: number | string;
    date?: string;
    source?: 'manual' | 'profile' | 'trip' | 'suggested';
}

export const newPayLine = (memo = '', amount: number | string = '', source: PayLine['source'] = 'manual'): PayLine => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    memo,
    amount,
    source,
});

export const sumPayLines = (lines: PayLine[]) =>
    Math.round(lines.reduce((s, l) => s + (parseFloat(String(l.amount)) || 0), 0) * 100) / 100;

/** Lines ready for the API: { memo, amount, date } with empty lines dropped. */
export const toApiPayLines = (lines: PayLine[]) =>
    lines
        .map(l => ({ memo: l.memo.trim(), amount: Math.round((parseFloat(String(l.amount)) || 0) * 100) / 100, date: l.date, source: l.source || 'manual' }))
        .filter(l => l.amount > 0);

/** First line that has an amount but no memo, as a message; null when all good. */
export const payLinesError = (additions: PayLine[], deductions: PayLine[]) => {
    const a = additions.findIndex(l => (parseFloat(String(l.amount)) || 0) > 0 && !l.memo.trim());
    if (a >= 0) return `Addition #${a + 1}: write what it is for (memo)`;
    const d = deductions.findIndex(l => (parseFloat(String(l.amount)) || 0) > 0 && !l.memo.trim());
    if (d >= 0) return `Deduction #${d + 1}: write what it is for (memo)`;
    return null;
};

