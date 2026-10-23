// Color utility constants for fleet maintenance
export const FLEET_COLORS = {
  primary: '#016ab2',
  dark: '#063f6f',
  light: '#398bc3',
  gradient: 'linear-gradient(90deg, var(--accent-blue) 0%, var(--accent-blue) 40%, rgba(0,209,255,0.15) 100%)',
  gradientVertical: 'linear-gradient(to bottom right, #016ab2, #063f6f)',
  focusRing: 'rgba(66, 174, 236, 0.2)',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  background: '#EDF8FF',
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


