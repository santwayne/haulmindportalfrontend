// Color utility constants for fleet maintenance
export const FLEET_COLORS = {
  primary: '#047857',
  dark: '#065f46',
  light: '#059669',
  gradient: 'linear-gradient(90deg, var(--accent-blue) 0%, var(--accent-blue) 40%, rgba(5,150,105,0.15) 100%)',
  gradientVertical: 'linear-gradient(to bottom right, #047857, #065f46)',
  focusRing: 'rgba(16,185,129, 0.2)',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  background: '#ecfdf5',
};

export const getFocusStyles = () => ({
  onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = FLEET_COLORS.primary;
    e.target.style.boxShadow = `0 0 0 2px ${FLEET_COLORS.focusRing}`;
  },
  onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = '';
    e.target.style.boxShadow = '';
  },
});


