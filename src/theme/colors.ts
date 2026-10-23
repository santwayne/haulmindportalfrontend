// Bright, Professional Color Palette for Health & Safety System
export const COLORS = {
    // Primary Brand Colors
    primary: {
      main: '#6366f1',      // Bright Indigo
      light: '#818cf8',
      dark: '#4f46e5',
      50: '#eef2ff',
      100: '#e0e7ff',
      500: '#6366f1',
      600: '#4f46e5',
      700: '#4338ca',
    },
    
    // Status Colors (Bright & Clear)
    status: {
      success: '#10b981',   // Bright Green
      warning: '#f59e0b',   // Bright Amber
      danger: '#ef4444',    // Bright Red
      info: '#3b82f6',      // Bright Blue
      neutral: '#64748b',   // Slate
    },
    
    // Module-Specific Colors
    modules: {
      incident: '#ef4444',      // Red - Urgent
      hazard: '#f59e0b',        // Amber - Caution
      training: '#8b5cf6',      // Purple - Education
      policy: '#06b6d4',        // Cyan - Documentation
      committee: '#10b981',     // Green - Collaboration
      trucking: '#f97316',      // Orange - Operations
      inspection: '#3b82f6',    // Blue - Verification
      compliance: '#6366f1',    // Indigo - Regulatory
      reports: '#14b8a6',       // Teal - Analytics
    },
    
    // Background & Surface
    background: {
      primary: '#ffffff',
      secondary: '#f8fafc',
      tertiary: '#f1f5f9',
      dark: '#0f172a',
    },
    
    // Text Colors
    text: {
      primary: '#0f172a',
      secondary: '#475569',
      tertiary: '#94a3b8',
      inverse: '#ffffff',
    },
    
    // Border Colors
    border: {
      light: '#e2e8f0',
      main: '#cbd5e1',
      dark: '#94a3b8',
    },
    
    // Gradient Backgrounds
    gradients: {
      primary: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      danger: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      info: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      incident: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
      hazard: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
      training: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
      policy: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
      trucking: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
    },
    
    // Shadow Colors
    shadow: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
      primary: '0 4px 14px 0 rgba(99, 102, 241, 0.39)',
      danger: '0 4px 14px 0 rgba(239, 68, 68, 0.39)',
      success: '0 4px 14px 0 rgba(16, 185, 129, 0.39)',
    },
  };
  
  // Helper function for rgba conversion
  export const hexToRgba = (hex: string, alpha = 1): string => {
    const parsed = hex.replace('#', '');
    const bigint = parseInt(parsed, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  
  // Status color helper
  export const getStatusColor = (status: string): { bg: string; text: string; border: string } => {
    const statusMap: Record<string, { bg: string; text: string; border: string }> = {
      // Generic Status
      active: { bg: '#d1fae5', text: '#065f46', border: '#10b981' },
      completed: { bg: '#d1fae5', text: '#065f46', border: '#10b981' },
      valid: { bg: '#d1fae5', text: '#065f46', border: '#10b981' },
      
      pending: { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
      'in-progress': { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
      scheduled: { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
      
      overdue: { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' },
      expired: { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' },
      critical: { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' },
      
      draft: { bg: '#f3f4f6', text: '#374151', border: '#9ca3af' },
      archived: { bg: '#f3f4f6', text: '#374151', border: '#9ca3af' },
      
      // Specific Status
      investigating: { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
      'action-required': { bg: '#fed7aa', text: '#9a3412', border: '#f97316' },
      resolved: { bg: '#d1fae5', text: '#065f46', border: '#10b981' },
      expiring: { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
      coached: { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
      'follow-up': { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
    };
    
    return statusMap[status.toLowerCase()] || { bg: '#f3f4f6', text: '#374151', border: '#9ca3af' };
  };
  
  // Priority color helper
  export const getPriorityColor = (priority: string): { bg: string; text: string } => {
    const priorityMap: Record<string, { bg: string; text: string }> = {
      low: { bg: '#10b981', text: '#ffffff' },
      medium: { bg: '#f59e0b', text: '#ffffff' },
      high: { bg: '#f97316', text: '#ffffff' },
      critical: { bg: '#ef4444', text: '#ffffff' },
    };
    
    return priorityMap[priority.toLowerCase()] || { bg: '#64748b', text: '#ffffff' };
  };
  
  export default COLORS;