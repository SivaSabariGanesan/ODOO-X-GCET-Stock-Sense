# StockSense Design System — MASTER

> **LOGIC:** When building a specific page, first check `design-system/stocksense/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file. Otherwise, strictly follow the rules below.

**Project:** StockSense (Inventory Management built on top of Odoo)
**Stack:** React 18 + Tailwind CSS 3 + TypeScript
**Updated:** 2026-09-26
**Design Dials:** Variance 4/10 (Balanced/Modern) · Motion 3/10 (Subtle) · Density 8/10 (Dense/Dashboard)

---

## 1. Philosophy

StockSense is an inventory management dashboard that lives **inside the Odoo ecosystem**. The design system follows three guiding principles:

1. **Odoo-native feel** — Users switching between Odoo and StockSense should feel zero visual jarring. Match Odoo's color language, spacing rhythm, and component vocabulary.
2. **Data-first density** — Odoo's 14px base, 2px input padding, and compact stat buttons are intentional. StockSense inherits this density. Information per pixel is a feature.
3. **Functional motion only** — Transitions signal state changes, not decorate. No animation for its own sake.

---

## 2. Color System

### 2.1 Brand Tokens

These map directly to Odoo's own brand color in the community edition (`$o-community-color: #71639e`), extended with a stock-management semantic layer.

| Token | Hex | Tailwind Class | Usage |
|---|---|---|---|
| `--color-brand` | `#71639e` | `bg-brand` | Primary brand — Odoo purple |
| `--color-brand-dark` | `#5a4f80` | `bg-brand-dark` | Hover/active state of brand |
| `--color-brand-light` | `#e8e5f3` | `bg-brand-light` | Brand tints (badges, active sidebar) |
| `--color-action` | `#71639e` | `bg-action` | Interactive elements (buttons, links) |

### 2.2 Semantic Status Colors (Traffic-Light System)

Essential for inventory: receipt in, delivery out, adjustments, low stock alerts.

| Token | Hex | Tailwind | Odoo Equivalent | Usage |
|---|---|---|---|---|
| `--color-success` | `#28a745` | `text-success` | `$o-success` | Stock OK, confirmed, received |
| `--color-success-text` | `#008818` | — | `$o-theme-text-colors.success` | Text on light bg (WCAG AA) |
| `--color-warning` | `#ffac00` | `text-warning` | `$o-warning` | Low stock, pending |
| `--color-warning-text` | `#9a6b01` | — | `$o-theme-text-colors.warning` | Text on light bg (WCAG AA) |
| `--color-danger` | `#dc3545` | `text-danger` | `$o-danger` | Out of stock, cancelled, overdue |
| `--color-danger-text` | `#d23f3a` | — | `$o-theme-text-colors.danger` | Text on light bg (WCAG AA) |
| `--color-info` | `#17a2b8` | `text-info` | `$o-info` | Informational, transfers in-progress |
| `--color-info-text` | `#0180a5` | — | `$o-theme-text-colors.info` | Text on light bg (WCAG AA) |

> ⚠️ Always use the `-text` variants for text on white/light backgrounds. The base colors are for badges and icon fills only. This mirrors Odoo's `$o-theme-text-colors` WCAG override map.

### 2.3 Neutral Palette (Bootstrap 5 / Odoo Gray Scale)

| Token | Hex | Tailwind | Odoo Equivalent |
|---|---|---|---|
| `--gray-100` | `#f8f9fa` | `bg-gray-100` | `$o-gray-100` |
| `--gray-200` | `#e9ecef` | `bg-gray-200` | `$o-gray-200` |
| `--gray-300` | `#dee2e6` | `bg-gray-300` | `$o-gray-300` |
| `--gray-400` | `#ced4da` | `bg-gray-400` | `$o-gray-400` |
| `--gray-500` | `#adb5bd` | `bg-gray-500` | `$o-gray-500` |
| `--gray-600` | `#6c757d` | `bg-gray-600` | `$o-gray-600` |
| `--gray-700` | `#495057` | `bg-gray-700` | `$o-gray-700` — body text |
| `--gray-800` | `#343a40` | `bg-gray-800` | `$o-gray-800` |
| `--gray-900` | `#212529` | `bg-gray-900` | `$o-gray-900` — headings |

### 2.4 Surface Colors

| Token | Hex | Usage |
|---|---|---|
| `--color-app-bg` | `#f0eeee` | App shell (Odoo `$o-main-bg-color`) |
| `--color-view-bg` | `#ffffff` | Form views, list views, card content |
| `--color-sidebar-bg` | `#f8f9fa` | Navigation sidebar (Odoo `$o-gray-100`) |
| `--color-border` | `#dee2e6` | Dividers, input borders (Odoo `$o-gray-300`) |

### 2.5 Kanban / Tag Color Palette

For user-assignable colors on stock categories, product tags, warehouse labels (mirrors Odoo's `$o-colors`):

```
#a2a2a2  #ee2d2d  #dc8534  #e8bb1d  #5794dd  #9f628f
#db8865  #41a9a2  #304be0  #ee2f8a  #61c36e  #9872e6
```

---

## 3. Typography

### 3.1 Font Stack

Mirrors Odoo's system-font-first philosophy — no Google Fonts dependency in critical path.

```css
/* Body — Fira Sans for data labels (Google Fonts optional) */
--font-sans: 'Fira Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI',
             Roboto, 'Helvetica Neue', Ubuntu, Arial, sans-serif;

/* Headings — Fira Code for technical precision feel */
--font-heading: 'Fira Code', 'SF Pro Display', -apple-system,
                BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Monospace — for quantities, SKUs, barcodes, IDs */
--font-mono: 'Fira Code', SFMono-Regular, Menlo, Monaco,
             Consolas, 'Courier New', monospace;
```

**Google Fonts import (place in index.css):**
```css
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap');
```

### 3.2 Type Scale

| Token | Size | Weight | Line-height | Usage |
|---|---|---|---|---|
| `text-display` | 24px | 700 | 1.3 | Page titles |
| `text-heading` | 18px | 600 | 1.4 | Section headers, card titles |
| `text-subheading` | 16px | 500 | 1.4 | Sub-section labels |
| `text-base` | 14px | 400 | 1.5 | Body text — **matches Odoo's 14px** |
| `text-sm` | 13px | 400 | 1.5 | Secondary info, table meta |
| `text-xs` | 12px | 400 | 1.4 | Labels, badges, timestamps |
| `text-label` | 11.2px | 500 | 1.4 | Form labels (14px × 0.8 factor, Odoo `$o-label-font-size-factor`) |
| `text-code` | 13px | 400 | 1.5 | SKUs, barcodes, quantities — use `font-mono` |

> ⚠️ Never go below 12px for body content. Odoo's minimum is 12px (`$o-font-size-base-smaller`).

---

## 4. Spacing System

Density 8/10 — matches Odoo's enterprise data-density. The base unit is 4px (Tailwind default).

| Token | Value | Tailwind | Odoo Reference |
|---|---|---|---|
| `--space-1` | 4px | `p-1` / `m-1` | `$o-input-padding-x` |
| `--space-2` | 8px | `p-2` / `m-2` | `$o-statbutton-spacing` × ~1.5 |
| `--space-3` | 12px | `p-3` / `m-3` | — |
| `--space-4` | 16px | `p-4` / `m-4` | `$o-spacer` (base unit) |
| `--space-5` | 20px | `p-5` / `m-5` | `$o-dropdown-hpadding` |
| `--space-6` | 24px | `p-6` / `m-6` | — |
| `--space-8` | 32px | `p-8` / `m-8` | `2 × $o-spacer` |
| `--space-12` | 48px | `p-12` / `m-12` | — |

**Input padding:** `2px 4px` vertical/horizontal — mirrors Odoo's `$o-input-padding-y/x` exactly.

---

## 5. Border Radius

Matches Odoo's conservative, corporate-sharp radii:

| Token | Value | Tailwind | Odoo Equivalent |
|---|---|---|---|
| `--radius-sm` | 3px | `rounded-sm` | `$o-border-radius-sm` |
| `--radius` | 4px | `rounded` | `$o-border-radius` |
| `--radius-lg` | 6px | `rounded-lg` | `$o-border-radius-lg` |
| `--radius-pill` | 9999px | `rounded-full` | badges, tags only |

> ❌ Do not use `rounded-xl` (12px), `rounded-2xl` (16px), or larger. These feel consumer-app, not enterprise.

---

## 6. Shadows

Soft, functional — not decorative:

| Level | Value | Usage |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Inputs on focus, subtle cards |
| `--shadow-md` | `0 2px 4px rgba(0,0,0,0.08)` | Cards, stat buttons |
| `--shadow-lg` | `0 4px 8px rgba(0,0,0,0.1)` | Dropdowns, modals |
| `--shadow-xl` | `0 8px 16px rgba(0,0,0,0.12)` | Dialogs, popovers |

---

## 7. Component Specs

### 7.1 Buttons

Directly mirrors Odoo's `$o-btns-bs-override` map logic.

```css
/* Primary — brand purple */
.btn-primary {
  background: #71639e;
  color: white;
  padding: 6px 14px;          /* compact — Odoo style */
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  border: 1px solid #71639e;
  transition: background 150ms ease, border-color 150ms ease;
  cursor: pointer;
}
.btn-primary:hover  { background: #5a4f80; border-color: #4a4070; }
.btn-primary:active { background: #4a4070; }

/* Secondary — ghost gray */
.btn-secondary {
  background: #dee2e6;
  color: #343a40;
  padding: 6px 14px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 400;
  border: 1px solid #dee2e6;
  transition: background 150ms ease;
  cursor: pointer;
}
.btn-secondary:hover { background: #ced4da; }

/* Danger */
.btn-danger {
  background: #dc3545;
  color: white;
  padding: 6px 14px;
  border-radius: 4px;
  font-size: 14px;
}
```

**Tailwind classes:**
```
Primary:   bg-[#71639e] text-white px-3.5 py-1.5 rounded text-sm font-medium hover:bg-[#5a4f80] transition-colors duration-150
Secondary: bg-gray-300 text-gray-800 px-3.5 py-1.5 rounded text-sm hover:bg-gray-400 transition-colors duration-150
```

### 7.2 Inputs & Forms

Matches Odoo's tight input density:

```css
.input {
  padding: 2px 4px;              /* $o-input-padding-y/x */
  border: 1px solid #dee2e6;    /* $o-gray-300 */
  border-radius: 4px;
  font-size: 14px;
  line-height: 1.5;
  color: #495057;                /* $o-main-text-color */
  background: white;
  transition: border-color 150ms ease;
}
.input:hover  { border-color: #dee2e6; }   /* $o-input-hover-border-color */
.input:focus  { border-color: #71639e; outline: none; box-shadow: 0 0 0 2px rgba(113,99,158,0.2); }
.input.required { border-color: #71639e; } /* $o-input-border-required */

/* Labels sit above inputs at 80% of base size */
label {
  font-size: 11.2px;   /* 14px × 0.8 — $o-label-font-size-factor */
  font-weight: 500;
  color: #6c757d;      /* $o-gray-600 */
}
```

### 7.3 Data Tables / List Views

```
- Row height: 36px (tight)
- Header: gray-100 bg, gray-700 text, font-weight 500, text-xs uppercase
- Cell padding: py-1.5 px-3 (6px 12px)
- Border: border-b border-gray-200
- Hover row: bg-gray-50
- Selected row: bg-[#e8e5f3] (brand-light)
- Sticky header: yes
- Overflow: overflow-x-auto wrapper required on mobile
- Checkbox column for bulk actions
- Sort indicators on column headers
- Quantities/SKUs: font-mono text-sm
```

### 7.4 Stat / KPI Cards (Odoo-style "Stat Buttons")

Mirrors Odoo's `$o-statbutton-height: 44px`:

```
- Height: 44px minimum (touch-safe)
- Padding: 0 6px ($o-statbutton-vpadding / $o-statbutton-spacing)
- Background: white
- Border: 1px solid gray-300, radius 4px
- Label: text-xs, gray-600, uppercase
- Value: text-lg font-semibold, gray-900
- Trend indicator: colored text (success-text / danger-text)
- Hover: shadow-md, slight border-color darken
```

### 7.5 Status Badges

Used across inventory states (Draft / Ready / Done / Cancelled):

```
- Font size: 12px
- Padding: 2px 8px
- Border-radius: 9999px (pill)
- Font-weight: 500

State mapping:
  Draft     → bg-gray-100  text-gray-600
  Confirmed → bg-blue-50   text-[#0180a5]  (info-text)
  Ready     → bg-yellow-50 text-[#9a6b01]  (warning-text)
  Done      → bg-green-50  text-[#008818]  (success-text)
  Cancelled → bg-red-50    text-[#d23f3a]  (danger-text)
```

### 7.6 Modals

```
- Overlay: rgba(0,0,0,0.5) — no blur (Odoo doesn't use backdrop blur)
- Container: white, radius 6px, shadow-xl
- Large:  max-width 980px  ($o-modal-lg)
- Medium: max-width 650px  ($o-modal-md)
- Padding: 24px
- Header: border-b border-gray-200, pb-3, mb-4
- Footer: border-t border-gray-200, pt-3, mt-4, flex justify-end gap-2
```

### 7.7 Sidebar Navigation

```
- Width: 240px (expanded), 56px (collapsed)
- Background: gray-100 (#f8f9fa)
- Border-right: 1px solid gray-200
- Nav item height: 36px
- Nav item padding: px-4 py-2
- Active item: bg-[#e8e5f3] text-[#71639e] font-medium (brand-light + brand)
- Hover item: bg-gray-200
- Icon size: 16px, mr-3
- Section label: text-xs uppercase font-semibold text-gray-500, px-4 pt-4 pb-1
- Breadcrumb: height 30px ($o-cp-breadcrumb-height)
```

### 7.8 Dropdowns

```
- Max-height: 70vh ($o-dropdown-max-height) with overflow-y: auto
- Horizontal padding: 20px ($o-dropdown-hpadding)
- Vertical item padding: 6px ($o-dropdown-vpadding × 2)
- Background: white
- Shadow: shadow-lg
- Border-radius: 4px
- Border: 1px solid gray-200
```

---

## 8. Breakpoints

Matches Odoo's extended Bootstrap 5 grid (including Odoo custom breakpoints):

| Name | Value | Notes |
|---|---|---|
| `xs` | 0px | Base mobile |
| `vsm` | 475px | Odoo custom |
| `sm` | 576px | Bootstrap |
| `md` | 768px | Bootstrap |
| `lg` | 992px | Bootstrap |
| `xl` | 1200px | Bootstrap |
| `xxl` | 1534px | Odoo custom (wider than BS5's 1400px) |

---

## 9. Motion & Animation

**Principle:** Odoo uses virtually no decorative animation. Motion = communication only.

| Use case | Duration | Easing |
|---|---|---|
| Button state change | 150ms | `ease` |
| Input focus ring | 150ms | `ease` |
| Sidebar collapse | 200ms | `ease-in-out` |
| Modal enter | 200ms | `ease-out` |
| Toast notification | 250ms | `ease-out` |
| Row highlight | 100ms | `ease` |
| Dropdown open | 150ms | `ease-out` |

```css
/* Attention animation (mirrors Odoo's catchAttention) */
@keyframes catchAttention {
  0%, 100% { transform: translateY(0); }
  25%       { transform: translateY(-4px); }
  75%       { transform: translateY(-2px); }
}

/* Entry animation (mirrors Odoo's bounceIn — use sparingly) */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

```css
/* prefers-reduced-motion: always respect it */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 10. Opacity Tokens

Mirrors Odoo's `$o-opacity-disabled` and `$o-opacity-muted`:

| Token | Value | Usage |
|---|---|---|
| `--opacity-disabled` | `0.5` | Disabled inputs, buttons |
| `--opacity-muted` | `0.76` | Secondary/muted text |

---

## 11. Icons

- **Library:** Lucide React (already in `package.json`) — matches Odoo's Font Awesome outline style
- **Size scale:** 12px (xs), 14px (sm), 16px (default), 20px (md), 24px (lg)
- **Stroke width:** 1.5px (Lucide default) — do not change
- **Color:** Inherit from parent text color (`currentColor`)
- ❌ Never use emoji as icons
- ❌ Never mix icon sets

---

## 12. Tailwind Config Extension

Add to `tailwind.config.js`:

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#71639e',
          dark:    '#5a4f80',
          light:   '#e8e5f3',
        },
        success: { DEFAULT: '#28a745', text: '#008818' },
        warning: { DEFAULT: '#ffac00', text: '#9a6b01' },
        danger:  { DEFAULT: '#dc3545', text: '#d23f3a' },
        info:    { DEFAULT: '#17a2b8', text: '#0180a5' },
        app:     '#f0eeee',
        view:    '#ffffff',
      },
      fontFamily: {
        sans:    ['Fira Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        heading: ['Fira Code', 'SF Pro Display', '-apple-system', 'sans-serif'],
        mono:    ['Fira Code', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      fontSize: {
        'xs':    ['12px', { lineHeight: '1.4' }],
        'sm':    ['13px', { lineHeight: '1.5' }],
        'base':  ['14px', { lineHeight: '1.5' }],
        'label': ['11.2px', { lineHeight: '1.4', fontWeight: '500' }],
        'code':  ['13px', { lineHeight: '1.5', fontFamily: 'Fira Code' }],
      },
      borderRadius: {
        'sm':   '3px',
        DEFAULT:'4px',
        'lg':   '6px',
        'full': '9999px',
      },
      spacing: {
        // Dense scale — Odoo-aligned
        '0.5': '2px',
        '1':   '4px',
        '2':   '8px',
        '3':   '12px',
        '4':   '16px',
        '5':   '20px',
        '6':   '24px',
        '8':   '32px',
        '11':  '44px',   // statbutton height
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0,0,0,0.05)',
        'md': '0 2px 4px rgba(0,0,0,0.08)',
        'lg': '0 4px 8px rgba(0,0,0,0.10)',
        'xl': '0 8px 16px rgba(0,0,0,0.12)',
      },
      maxWidth: {
        'modal-md': '650px',
        'modal-lg': '980px',
        'form':     '990px',  // $o-form-sheet-min-width
      },
      maxHeight: {
        'dropdown': '70vh',   // $o-dropdown-max-height
      },
    },
  },
}
```

---

## 13. CSS Custom Properties (index.css)

```css
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap');

:root {
  /* Brand */
  --color-brand:       #71639e;
  --color-brand-dark:  #5a4f80;
  --color-brand-light: #e8e5f3;
  --color-action:      #71639e;

  /* Semantic */
  --color-success:       #28a745;
  --color-success-text:  #008818;
  --color-warning:       #ffac00;
  --color-warning-text:  #9a6b01;
  --color-danger:        #dc3545;
  --color-danger-text:   #d23f3a;
  --color-info:          #17a2b8;
  --color-info-text:     #0180a5;

  /* Surfaces */
  --color-app-bg:    #f0eeee;
  --color-view-bg:   #ffffff;
  --color-sidebar:   #f8f9fa;
  --color-border:    #dee2e6;

  /* Text */
  --color-text:          #495057;   /* $o-main-text-color */
  --color-text-muted:    rgba(73, 80, 87, 0.76);
  --color-headings:      #212529;   /* $o-main-headings-color */
  --color-link:          #5a4f80;   /* darken(brand, 5%) */
  --color-code:          #d2317b;   /* $o-main-code-color */
  --color-favorite:      #f3cc00;   /* $o-main-favorite-color */

  /* Opacity */
  --opacity-disabled: 0.5;
  --opacity-muted:    0.76;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 2px 4px rgba(0,0,0,0.08);
  --shadow-lg: 0 4px 8px rgba(0,0,0,0.10);
  --shadow-xl: 0 8px 16px rgba(0,0,0,0.12);
}
```

---

## 14. Anti-Patterns

| ❌ Don't | ✅ Do Instead |
|---|---|
| `rounded-xl` or larger | Max `rounded-lg` (6px) |
| `border-radius: 12px+` | Enterprise uses 4px max |
| Emoji as icons | Lucide React SVG icons |
| 16px+ input padding | 2px 4px (Odoo density) |
| Decorative animations | Only state-change transitions |
| `backdrop-filter: blur` | Plain overlays |
| `text-gray-400` on white | Min `text-gray-600` for 4.5:1 |
| 3D effects / drop-shadows | Flat with subtle box-shadow |
| Auto-play video | click-to-play only |
| Horizontal overflow | `overflow-x-auto` wrapper |

---

## 15. Pre-Delivery Checklist

- [ ] Icons from Lucide React only, no emoji
- [ ] `cursor-pointer` on all clickable elements
- [ ] All hover states: 150–200ms transition
- [ ] Text contrast ≥ 4.5:1 on all backgrounds
- [ ] Focus rings visible (keyboard navigation)
- [ ] `prefers-reduced-motion` respected
- [ ] Breakpoints tested: 375, 768, 1024, 1440px
- [ ] Tables wrapped in `overflow-x-auto`
- [ ] Bulk-action checkboxes on list/table views
- [ ] Loading states: skeleton or spinner for >300ms ops
- [ ] Status badges use correct semantic colors
- [ ] Quantities / SKUs / IDs use `font-mono`
- [ ] No fixed navbars blocking content without padding compensation
- [ ] Disabled elements: `opacity-50 pointer-events-none`
