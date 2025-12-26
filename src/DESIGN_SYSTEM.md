# Professional Medical PMS Design System

## Overview
This document defines the unified professional theme for the entire Dental Practice Management System. All pages, components, and navigation elements follow this consistent design language.

## Core Principles
1. **Professional Medical Aesthetic** - Clean, trustworthy, clinical
2. **Accessibility First** - WCAG compliant, high contrast
3. **Consistency** - Same patterns across all modules
4. **Clarity** - Clear hierarchy, readable typography

## Color Palette

### Primary Colors (Blues - Professional, Trustworthy)
- **Blue-50**: `#eff6ff` - Backgrounds, highlights
- **Blue-100**: `#dbeafe` - Light backgrounds
- **Blue-600**: `#2563eb` - Interactive elements
- **Blue-700**: `#1d4ed8` - Headers, primary actions
- **Blue-800**: `#1e40af` - Hover states

### Secondary Colors (Teals - Medical, Calming)
- **Teal-100**: `#ccfbf1` - Accent backgrounds
- **Teal-600**: `#0d9488` - Secondary actions
- **Teal-700**: `#0f766e` - Secondary emphasis

### Neutral Colors (Slates - Clean, Modern)
- **Slate-50**: `#f8fafc` - Page backgrounds
- **Slate-100**: `#f1f5f9` - Card backgrounds
- **Slate-200**: `#e2e8f0` - Section headers
- **Slate-300**: `#cbd5e1` - Borders
- **Slate-600**: `#475569` - Secondary text
- **Slate-700**: `#334155` - Labels
- **Slate-900**: `#0f172a` - Primary text

### Status Colors
- **Success**: Green-600 (`#10b981`)
- **Warning**: Yellow-600 (`#f59e0b`)
- **Error**: Red-600 (`#ef4444`)
- **Info**: Blue-600 (`#2563eb`)

## Typography

### Headings
- **Page Title**: 2xl, Bold, White (on gradient header)
- **Section Title**: sm, Bold, Blue-700, UPPERCASE
- **Subsection**: xs, Bold, Slate-700, UPPERCASE

### Body Text
- **Primary**: sm/base, Semibold, Slate-900
- **Secondary**: sm, Medium, Slate-600
- **Labels**: xs, Bold, Slate-700, UPPERCASE, Tracking-wide

## Layout Patterns

### Page Structure
```tsx
<div className="min-h-screen bg-slate-50">
  <GlobalNav />
  <div className="max-w-7xl mx-auto p-6 space-y-6">
    {/* Page Header */}
    <PageHeader title="..." subtitle="..." />
    
    {/* Content Cards */}
    <div className="bg-white rounded-xl shadow-lg border-2 border-slate-200">
      <SectionHeader title="..." />
      {/* Content */}
    </div>
  </div>
</div>
```

### Headers
```tsx
// Page Header
<div className="bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-4">
  <h1 className="text-2xl font-bold text-white">Title</h1>
  <p className="text-sm text-blue-100">Subtitle</p>
</div>

// Section Header
<div className="bg-slate-200 px-4 py-3 border-b-2 border-slate-300">
  <h3 className="text-sm font-bold text-blue-700 uppercase">Section</h3>
</div>
```

### Cards & Panels
```tsx
// Primary Card
<div className="bg-white rounded-xl shadow-lg border-2 border-slate-200">
  {/* Content */}
</div>

// Panel/Section
<div className="bg-white border-2 border-slate-300 rounded-lg p-4">
  {/* Content */}
</div>
```

## Component Patterns

### Buttons
```tsx
// Primary Action
<button className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors">
  Action
</button>

// Secondary Action
<button className="px-6 py-2.5 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg transition-colors">
  Action
</button>

// Success Action
<button className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors">
  Save
</button>

// Danger Action
<button className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors">
  Delete
</button>
```

### Form Inputs
```tsx
// Label
<label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
  Field Name
</label>

// Input
<input className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />

// Required Input
<input className="w-full px-3 py-2 border-2 border-blue-500 rounded-lg text-sm bg-yellow-50" />

// Select
<select className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg text-sm">
  {/* Options */}
</select>
```

### Tables
```tsx
<table className="w-full text-sm">
  <thead className="bg-blue-700 text-white">
    <tr>
      <th className="px-4 py-3 text-left font-bold uppercase">Column</th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-b border-slate-200 hover:bg-blue-50">
      <td className="px-4 py-3 text-slate-900">Data</td>
    </tr>
  </tbody>
</table>
```

### Tabs
```tsx
<div className="flex border-b-2 border-slate-300 bg-slate-50">
  <button className="px-6 py-3 bg-white border-t-4 border-blue-600 text-blue-700 font-bold text-sm">
    Active Tab
  </button>
  <button className="px-6 py-3 text-slate-600 hover:text-blue-600 font-bold text-sm">
    Inactive Tab
  </button>
</div>
```

### Badges
```tsx
// Success
<span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">
  Active
</span>

// Warning
<span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold">
  Pending
</span>

// Error
<span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold">
  Overdue
</span>
```

## Module-Specific Guidelines

### Dashboard
- User identity panel at top
- Patient search panel below
- Both use white cards with blue headers

### Patient Module
- Secondary icon navigation (blue-700 background)
- White content area
- Consistent form layouts

### Scheduler
- Calendar grid with blue accents
- Time slots with clear borders
- Appointment cards with status colors

### Ledger/Transactions
- Blue-700 table headers
- Yellow highlights for pending items
- Green for payments, Red for balances

### Clinical Modules
- Clean white backgrounds
- Blue section headers
- Tooth charts with clear outlines

## Accessibility

### Contrast Ratios
- Text on white: Slate-900 (18.36:1)
- Text on blue-700: White (9.73:1)
- All combinations exceed WCAG AA standards

### Interactive Elements
- Minimum 44px touch targets
- Clear focus indicators (blue ring)
- Keyboard navigation support

## Implementation

### Using Theme Components
```tsx
import { components } from '../styles/theme';

// Apply button styles
<button className={components.buttonPrimary}>Click</button>

// Apply input styles
<input className={components.input} />

// Apply table styles
<table className={components.table}>
  <thead className={components.tableHeader}>
    {/* ... */}
  </thead>
</table>
```

### Custom Combinations
```tsx
import { theme, utils } from '../styles/theme';

// Combine classes conditionally
<div className={utils.cn(
  components.card,
  isActive && 'border-blue-500'
)}>
  {/* Content */}
</div>
```

## Page Checklist

When creating or updating a page, ensure:

- ✅ Uses `bg-slate-50` page background
- ✅ Blue-700 gradient headers
- ✅ White content cards with slate-200 borders
- ✅ Slate-200 section headers
- ✅ Consistent button styles
- ✅ Consistent form inputs
- ✅ Blue-700 table headers
- ✅ Proper spacing (p-6, gap-6)
- ✅ Rounded corners (rounded-lg/xl)
- ✅ Professional typography

## Future Enhancements

- Dark mode support
- Color customization per practice
- Accessibility preference settings
- Print-optimized styles
