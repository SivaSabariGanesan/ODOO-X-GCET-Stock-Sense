/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],

  theme: {
    // ── Extend only; keep all default Tailwind utilities intact ──────────
    extend: {

      // ── Colors ──────────────────────────────────────────────────────────
      // Mirrors Odoo's $o-community-color and semantic status palette.
      // "-text" variants are WCAG AA compliant for text on light backgrounds
      // (same logic as Odoo's $o-theme-text-colors override map).
      colors: {
        brand: {
          DEFAULT: '#71639e', // $o-community-color
          dark:    '#5a4f80', // darken(brand, 10%) — hover/active
          light:   '#e8e5f3', // brand tints — active sidebar, selected rows
        },

        // Semantic status — traffic-light system for inventory states
        success: {
          DEFAULT: '#28a745', // $o-success — fills, icons
          text:    '#008818', // $o-theme-text-colors.success — WCAG AA text
          bg:      '#e6f4ea', // light tint for badges
        },
        warning: {
          DEFAULT: '#ffac00', // $o-warning
          text:    '#9a6b01', // $o-theme-text-colors.warning
          bg:      '#fff8e1',
        },
        danger: {
          DEFAULT: '#dc3545', // $o-danger
          text:    '#d23f3a', // $o-theme-text-colors.danger
          bg:      '#fde8e8',
        },
        info: {
          DEFAULT: '#17a2b8', // $o-info
          text:    '#0180a5', // $o-theme-text-colors.info
          bg:      '#e0f4f8',
        },

        // Odoo gray scale — matches $o-gray-100 … $o-gray-900 exactly
        // (overrides Tailwind's default gray scale for Odoo parity)
        gray: {
          100: '#f8f9fa',
          200: '#e9ecef',
          300: '#dee2e6',
          400: '#ced4da',
          500: '#adb5bd',
          600: '#6c757d',
          700: '#495057', // $o-main-text-color
          800: '#343a40',
          900: '#212529', // $o-main-headings-color
        },

        // Surface / chrome colors
        app:     '#f0eeee', // $o-main-bg-color — app shell
        view:    '#ffffff', // $o-view-background-color — form/list content
        sidebar: '#f8f9fa', // $o-gray-100 — navigation rail

        // Odoo special semantic colors
        favorite: '#f3cc00', // $o-main-favorite-color
        code:     '#d2317b', // $o-main-code-color
      },

      // ── Typography ───────────────────────────────────────────────────────
      fontFamily: {
        // Body — Fira Sans, falls back to Odoo's system font stack
        sans: [
          'Fira Sans',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Ubuntu',
          'Noto Sans',
          'Arial',
          'sans-serif',
        ],
        // Headings — Fira Code, technical precision feel
        heading: [
          'Fira Code',
          'SF Pro Display',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        // Monospace — quantities, SKUs, barcodes, IDs, references
        mono: [
          'Fira Code',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
      },

      // ── Font sizes — Odoo-aligned type scale ─────────────────────────────
      // Base is 14px matching $o-font-size-base: o-to-rem(14px)
      // Never go below 12px ($o-font-size-base-smaller)
      fontSize: {
        'xs':      ['12px', { lineHeight: '1.4' }],           // $o-font-size-base-smaller
        'sm':      ['13px', { lineHeight: '1.5' }],           // $o-font-size-base-small
        'base':    ['14px', { lineHeight: '1.5' }],           // $o-font-size-base ← primary
        'touch':   ['16px', { lineHeight: '1.5' }],           // $o-font-size-base-touch
        'label':   ['11.2px', { lineHeight: '1.4', fontWeight: '500' }], // 14 × $o-label-font-size-factor (0.8)
        'subhead': ['16px', { lineHeight: '1.4', fontWeight: '500' }],
        'heading': ['18px', { lineHeight: '1.4', fontWeight: '600' }],
        'display': ['24px', { lineHeight: '1.3', fontWeight: '700' }],
      },

      // ── Font weights ──────────────────────────────────────────────────────
      fontWeight: {
        normal:    '400', // $o-font-weight-normal
        medium:    '500', // $o-font-weight-medium
        semibold:  '600',
        bold:      '700', // $o-font-weight-bold
        extrabold: '800', // $o-font-weight-extrabold
      },

      // ── Spacing — dense scale, 4px base unit ─────────────────────────────
      // Density 8/10. Odoo's $o-spacer is 16px (= 1rem).
      // Input padding: 2px/4px ($o-input-padding-y/x).
      spacing: {
        px:   '1px',
        0:    '0px',
        0.5:  '2px',   // $o-input-padding-y
        1:    '4px',   // $o-input-padding-x
        1.5:  '6px',   // $o-statbutton-spacing
        2:    '8px',
        2.5:  '10px',
        3:    '12px',
        3.5:  '14px',
        4:    '16px',  // $o-spacer — base unit
        5:    '20px',  // $o-dropdown-hpadding
        6:    '24px',
        7:    '28px',
        8:    '32px',
        9:    '36px',
        10:   '40px',
        11:   '44px',  // $o-statbutton-height — touch-safe minimum
        12:   '48px',
        14:   '56px',
        16:   '64px',
        20:   '80px',
        24:   '96px',
        28:   '112px',
        32:   '128px',
        36:   '144px',
        40:   '160px',
        44:   '176px',
        48:   '192px',
        52:   '208px',
        56:   '224px',
        60:   '240px',
        64:   '256px',
        72:   '288px',
        80:   '320px',
        96:   '384px',
      },

      // ── Border Radius — Odoo corporate-sharp, max 6px ────────────────────
      // $o-border-radius: 4px, $o-border-radius-sm: 3px, $o-border-radius-lg: 6px
      // ❌ Do NOT use rounded-xl (12px) or larger — feels consumer, not enterprise
      borderRadius: {
        none:    '0px',
        sm:      '3px',  // $o-border-radius-sm
        DEFAULT: '4px',  // $o-border-radius
        md:      '4px',
        lg:      '6px',  // $o-border-radius-lg
        full:    '9999px', // pills — badges and tags only
      },

      // ── Box Shadow — soft, functional, never decorative ──────────────────
      boxShadow: {
        sm:   '0 1px 2px rgba(0,0,0,0.05)',
        DEFAULT: '0 2px 4px rgba(0,0,0,0.08)',
        md:   '0 2px 4px rgba(0,0,0,0.08)',
        lg:   '0 4px 8px rgba(0,0,0,0.10)',
        xl:   '0 8px 16px rgba(0,0,0,0.12)',
        none: 'none',
        // Focus ring — brand color glow
        focus: '0 0 0 2px rgba(113,99,158,0.25)',
      },

      // ── Opacity tokens ────────────────────────────────────────────────────
      // $o-opacity-disabled: 0.5 · $o-opacity-muted: 0.76
      opacity: {
        0:        '0',
        5:        '0.05',
        10:       '0.1',
        20:       '0.2',
        25:       '0.25',
        50:       '0.5',
        disabled: '0.5',  // $o-opacity-disabled
        muted:    '0.76', // $o-opacity-muted
        75:       '0.75',
        80:       '0.8',
        90:       '0.9',
        95:       '0.95',
        100:      '1',
      },

      // ── Max-width — modal and form sizes from Odoo ────────────────────────
      maxWidth: {
        'modal-sm': '500px',
        'modal-md': '650px',  // $o-modal-md
        'modal-lg': '980px',  // $o-modal-lg
        'form':     '990px',  // $o-form-sheet-min-width
      },

      // ── Max-height ────────────────────────────────────────────────────────
      maxHeight: {
        dropdown: '70vh', // $o-dropdown-max-height
      },

      // ── Height — component-specific ───────────────────────────────────────
      height: {
        statbtn:    '44px',  // $o-statbutton-height
        statusbar:  '33px',  // $o-statusbar-height
        breadcrumb: '30px',  // $o-cp-breadcrumb-height
      },

      // ── Min Height ────────────────────────────────────────────────────────
      minHeight: {
        statbtn: '44px',  // $o-statbutton-height — used in stat-card component
      },

      // ── Width — sidebar ───────────────────────────────────────────────────
      width: {
        sidebar:          '240px',
        'sidebar-collapsed': '56px',
      },

      // ── Transition duration — motion is functional, never decorative ──────
      // All transitions: 150–250ms. Odoo uses no decorative animation.
      transitionDuration: {
        DEFAULT: '150ms',
        75:      '75ms',
        100:     '100ms',
        150:     '150ms',
        200:     '200ms',
        250:     '250ms',
        300:     '300ms',
      },

      // ── Breakpoints — Odoo extended Bootstrap 5 grid ─────────────────────
      // Odoo adds 'vsm' (475px) and 'xxl' (1534px) beyond BS5 defaults
      screens: {
        vsm:  '475px',   // Odoo custom
        sm:   '576px',
        md:   '768px',
        lg:   '992px',
        xl:   '1200px',
        '2xl':'1534px',  // Odoo custom (BS5 uses 1400px — Odoo uses 1534px)
      },
    },
  },

  plugins: [
    // tailwindcss-animate is already in package.json
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('tailwindcss-animate'),
  ],
}
