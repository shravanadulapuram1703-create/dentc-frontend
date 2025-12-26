// MEDICAL SLATE THEME - Production-Grade Professional PMS Design System
// Hospital-grade aesthetic • Enterprise-ready • Eye-strain optimized

export const medicalSlate = {
  // ============================================================================
  // CORE COLOR PALETTE
  // ============================================================================
  
  colors: {
    // Primary - Slate Blue (Top nav, section headers, professional authority)
    primary: {
      DEFAULT: '#1F3A5F',
      light: '#2d5080',
      dark: '#162942',
      hover: '#16314d',
    },
    
    // Secondary - Steel Blue (Buttons, highlights, interactive elements)
    secondary: {
      DEFAULT: '#3A6EA5',
      light: '#4d7fb3',
      dark: '#2e5883',
      hover: '#2f5a8c',
    },
    
    // Accent - Teal Green (Success, Active status, Insurance OK)
    accent: {
      DEFAULT: '#2FB9A7',
      light: '#4dc5b5',
      dark: '#259688',
      hover: '#28a495',
    },
    
    // Background - Off-White (Main page background, reduces eye strain)
    background: '#F7F9FC',
    
    // Surface - Pure White (Cards, forms, modals)
    surface: '#FFFFFF',
    
    // Text - Charcoal (Primary text, high readability)
    text: {
      primary: '#1E293B',
      secondary: '#475569',
      tertiary: '#64748B',
      inverse: '#FFFFFF',
    },
    
    // Borders & Dividers - Soft Gray
    border: {
      DEFAULT: '#E2E8F0',
      light: '#F1F5F9',
      dark: '#CBD5E1',
    },
    
    // Status Colors (Medical Context)
    status: {
      success: '#2FB9A7',      // Teal - Insurance approved, payment received
      warning: '#F59E0B',      // Amber - Pending, needs attention
      error: '#EF4444',        // Red - Overdue, rejected
      info: '#3A6EA5',         // Steel Blue - Informational
      active: '#2FB9A7',       // Teal - Active session, confirmed
      inactive: '#94A3B8',     // Slate - Inactive, archived
    },
  },
};

// ============================================================================
// COMPONENT CLASS PATTERNS - Reusable Tailwind Classes
// ============================================================================

export const components = {
  // --------------------------------------------------------------------------
  // PAGE LAYOUTS
  // --------------------------------------------------------------------------
  pageContainer: 'min-h-screen',
  pageBackground: 'bg-[#F7F9FC]', // Off-white background
  contentContainer: 'max-w-7xl mx-auto p-6 space-y-6',
  
  // --------------------------------------------------------------------------
  // HEADERS
  // --------------------------------------------------------------------------
  
  // Global Navigation (Top Nav - Slate Blue)
  globalNav: 'bg-[#1F3A5F] border-b-2 border-[#162942] shadow-lg',
  globalNavText: 'text-white',
  globalNavHover: 'hover:bg-[#2d5080]',
  
  // Page Header (Slate Blue gradient)
  pageHeader: 'bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-6 py-4 flex items-center justify-between shadow-md',
  pageHeaderTitle: 'text-2xl font-bold text-white',
  pageHeaderSubtitle: 'text-sm text-white/80',
  
  // Section Header (Light slate background)
  sectionHeader: 'bg-[#F1F5F9] px-4 py-3 border-b-2 border-[#E2E8F0]',
  sectionHeaderTitle: 'text-sm font-bold text-[#1F3A5F] uppercase tracking-wide',
  
  // Modal Header
  modalHeader: 'bg-gradient-to-r from-[#1F3A5F] to-[#2d5080] px-6 py-4 flex items-center justify-between rounded-t-lg',
  modalHeaderTitle: 'text-xl font-bold text-white',
  
  // --------------------------------------------------------------------------
  // CARDS & PANELS
  // --------------------------------------------------------------------------
  card: 'bg-white rounded-lg shadow-md border border-[#E2E8F0]',
  cardHeader: 'bg-[#F7F9FC] px-6 py-4 border-b border-[#E2E8F0]',
  cardBody: 'p-6',
  
  panel: 'bg-white border-2 border-[#E2E8F0] rounded-lg',
  panelHighlight: 'bg-white border-2 border-[#3A6EA5] rounded-lg',
  
  // --------------------------------------------------------------------------
  // BUTTONS (Steel Blue primary, Teal for success)
  // --------------------------------------------------------------------------
  
  // Primary Button - Steel Blue
  buttonPrimary: 'px-6 py-2.5 bg-[#3A6EA5] hover:bg-[#2f5a8c] text-white font-bold rounded-lg transition-all shadow-sm hover:shadow-md',
  
  // Secondary Button - Slate
  buttonSecondary: 'px-6 py-2.5 bg-[#475569] hover:bg-[#334155] text-white font-bold rounded-lg transition-all shadow-sm',
  
  // Success Button - Teal
  buttonSuccess: 'px-6 py-2.5 bg-[#2FB9A7] hover:bg-[#28a495] text-white font-bold rounded-lg transition-all shadow-sm hover:shadow-md',
  
  // Danger Button - Red
  buttonDanger: 'px-6 py-2.5 bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold rounded-lg transition-all shadow-sm',
  
  // Warning Button - Amber
  buttonWarning: 'px-6 py-2.5 bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold rounded-lg transition-all shadow-sm',
  
  // Outline Button - Steel Blue outline
  buttonOutline: 'px-6 py-2.5 border-2 border-[#3A6EA5] text-[#3A6EA5] hover:bg-[#3A6EA5] hover:text-white font-bold rounded-lg transition-all',
  
  // Ghost Button
  buttonGhost: 'px-6 py-2.5 text-[#1E293B] hover:bg-[#F1F5F9] font-bold rounded-lg transition-all',
  
  // --------------------------------------------------------------------------
  // FORMS
  // --------------------------------------------------------------------------
  label: 'block text-xs font-bold text-[#1E293B] uppercase tracking-wide mb-1.5',
  labelOptional: 'block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1.5',
  
  input: 'w-full px-4 py-2.5 border-2 border-[#E2E8F0] rounded-lg text-sm text-[#1E293B] bg-white focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 outline-none transition-all',
  inputRequired: 'w-full px-4 py-2.5 border-2 border-[#3A6EA5] rounded-lg text-sm text-[#1E293B] bg-[#F7F9FC] focus:border-[#2f5a8c] focus:ring-2 focus:ring-[#3A6EA5]/30 outline-none transition-all',
  inputDisabled: 'w-full px-4 py-2.5 border-2 border-[#E2E8F0] rounded-lg text-sm text-[#94A3B8] bg-[#F7F9FC] cursor-not-allowed',
  
  select: 'w-full px-4 py-2.5 border-2 border-[#E2E8F0] rounded-lg text-sm text-[#1E293B] bg-white focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 outline-none transition-all cursor-pointer',
  
  textarea: 'w-full px-4 py-2.5 border-2 border-[#E2E8F0] rounded-lg text-sm text-[#1E293B] bg-white focus:border-[#3A6EA5] focus:ring-2 focus:ring-[#3A6EA5]/20 outline-none transition-all resize-none',
  
  checkbox: 'w-4 h-4 text-[#3A6EA5] rounded border-2 border-[#E2E8F0] focus:ring-2 focus:ring-[#3A6EA5]/20 cursor-pointer',
  radio: 'w-4 h-4 text-[#3A6EA5] border-2 border-[#E2E8F0] focus:ring-2 focus:ring-[#3A6EA5]/20 cursor-pointer',
  
  // --------------------------------------------------------------------------
  // TABLES
  // --------------------------------------------------------------------------
  table: 'w-full text-sm border-collapse',
  tableWrapper: 'overflow-x-auto bg-white rounded-lg border border-[#E2E8F0]',
  
  // Table Header - Slate Blue
  tableHeader: 'bg-[#1F3A5F] text-white',
  tableHeaderCell: 'px-4 py-3 text-left font-bold uppercase tracking-wide text-xs',
  
  // Table Rows
  tableRow: 'border-b border-[#E2E8F0] hover:bg-[#F7F9FC] transition-colors',
  tableRowEven: 'bg-white border-b border-[#E2E8F0] hover:bg-[#F7F9FC] transition-colors',
  tableRowOdd: 'bg-[#F7F9FC] border-b border-[#E2E8F0] hover:bg-[#EFF6FF] transition-colors',
  
  tableCell: 'px-4 py-3 text-[#1E293B]',
  tableCellAmount: 'px-4 py-3 text-[#1E293B] font-semibold tabular-nums',
  
  // --------------------------------------------------------------------------
  // TABS
  // --------------------------------------------------------------------------
  tabList: 'flex border-b-2 border-[#E2E8F0] bg-[#F7F9FC]',
  tabButton: 'px-6 py-3 font-bold text-sm transition-all relative',
  tabActive: 'bg-white text-[#1F3A5F] border-t-4 border-[#3A6EA5]',
  tabInactive: 'text-[#64748B] hover:text-[#1F3A5F] hover:bg-white/50',
  
  // --------------------------------------------------------------------------
  // BADGES & STATUS INDICATORS
  // --------------------------------------------------------------------------
  badge: 'inline-flex items-center px-3 py-1 rounded-full text-xs font-bold',
  
  // Status-specific badges
  badgeSuccess: 'bg-[#2FB9A7]/10 text-[#2FB9A7] border border-[#2FB9A7]/30',  // Teal - Active, Approved
  badgeWarning: 'bg-[#F59E0B]/10 text-[#D97706] border border-[#F59E0B]/30',  // Amber - Pending
  badgeError: 'bg-[#EF4444]/10 text-[#DC2626] border border-[#EF4444]/30',    // Red - Overdue
  badgeInfo: 'bg-[#3A6EA5]/10 text-[#3A6EA5] border border-[#3A6EA5]/30',     // Steel Blue - Info
  badgeNeutral: 'bg-[#E2E8F0] text-[#475569] border border-[#CBD5E1]',        // Gray - Inactive
  
  // --------------------------------------------------------------------------
  // ICONS
  // --------------------------------------------------------------------------
  iconButton: 'p-2 hover:bg-[#F1F5F9] rounded-lg transition-colors cursor-pointer',
  iconSmall: 'w-4 h-4',
  iconMedium: 'w-5 h-5',
  iconLarge: 'w-6 h-6',
  
  // --------------------------------------------------------------------------
  // LOADING & SKELETON
  // --------------------------------------------------------------------------
  spinner: 'animate-spin rounded-full border-4 border-[#E2E8F0] border-t-[#3A6EA5]',
  skeleton: 'animate-pulse bg-[#E2E8F0] rounded',
  
  // --------------------------------------------------------------------------
  // ALERTS & NOTIFICATIONS
  // --------------------------------------------------------------------------
  alertSuccess: 'bg-[#2FB9A7]/10 border-2 border-[#2FB9A7] rounded-lg p-4 text-[#1E293B]',
  alertWarning: 'bg-[#F59E0B]/10 border-2 border-[#F59E0B] rounded-lg p-4 text-[#1E293B]',
  alertError: 'bg-[#EF4444]/10 border-2 border-[#EF4444] rounded-lg p-4 text-[#1E293B]',
  alertInfo: 'bg-[#3A6EA5]/10 border-2 border-[#3A6EA5] rounded-lg p-4 text-[#1E293B]',
  
  // --------------------------------------------------------------------------
  // DIVIDERS
  // --------------------------------------------------------------------------
  divider: 'border-t border-[#E2E8F0]',
  dividerThick: 'border-t-2 border-[#E2E8F0]',
  dividerDark: 'border-t-2 border-[#CBD5E1]',
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const utils = {
  // Combine class names conditionally
  cn: (...classes: (string | boolean | undefined | null)[]) => {
    return classes.filter(Boolean).join(' ');
  },
  
  // Get status badge class
  getStatusBadge: (status: string): string => {
    const statusMap: { [key: string]: string } = {
      active: components.badgeSuccess,
      approved: components.badgeSuccess,
      confirmed: components.badgeSuccess,
      completed: components.badgeSuccess,
      paid: components.badgeSuccess,
      
      pending: components.badgeWarning,
      scheduled: components.badgeWarning,
      processing: components.badgeWarning,
      
      overdue: components.badgeError,
      rejected: components.badgeError,
      cancelled: components.badgeError,
      failed: components.badgeError,
      
      inactive: components.badgeNeutral,
      archived: components.badgeNeutral,
    };
    return statusMap[status.toLowerCase()] || components.badgeInfo;
  },
  
  // Get amount color (positive/negative)
  getAmountColor: (amount: number): string => {
    if (amount > 0) return 'text-[#2FB9A7]'; // Teal for positive
    if (amount < 0) return 'text-[#EF4444]'; // Red for negative
    return 'text-[#1E293B]'; // Charcoal for zero
  },
};

// Export default theme
export default {
  colors: medicalSlate.colors,
  components,
  utils,
};
