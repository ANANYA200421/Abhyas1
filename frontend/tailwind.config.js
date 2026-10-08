/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core colors specified in DESIGN.md
        'abhyas-bg': '#F5E6F8',
        'abhyas-primary': '#A55FC6',
        'abhyas-deep': '#7A3A9A',
        'abhyas-plum': '#4A2160',

        // Detailed pedagogical & Stitch design tokens
        primary: {
          DEFAULT: '#A55FC6',
          dark: '#7A3A9A',
          deep: '#7A3A9A',
          hover: '#6C2282',
          container: '#9C57BD',
          fixed: '#F7D8FF',
          'fixed-dim': '#E9B3FF',
        },
        plum: {
          DEFAULT: '#4A2160',
          dark: '#2F0346',
          muted: '#736B79',
          light: '#7F7488',
        },
        surface: {
          DEFAULT: '#FFF7FC',
          bright: '#FFF7FC',
          dim: '#F2CEFF',
          container: '#FBE8FF',
          'container-low': '#FEEFFF',
          'container-high': '#F9E0FF',
          'container-highest': '#F6D9FF',
          'container-lowest': '#FFFFFF',
          variant: '#F6D9FF',
        },
        'on-surface': '#2F0346',
        'on-surface-variant': '#4D4350',
        'outline-variant': '#D0C2D1',
        gesture: {
          DEFAULT: '#D988ED',
          affirmation: '#D988ED',
        },
        brand: {
          purple: '#7E2D96',
          purpleLight: '#F4E9F8',
          purpleHover: '#6C2282',
          dark: '#1E0C29',
          muted: '#736B79',
          badge: '#F7EBFA',
          badgeText: '#A13DBF',
          border: '#F0E3F2',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        headline: ['"Plus Jakarta Sans"', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['"Nunito Sans"', 'sans-serif'],
      },
      borderRadius: {
        'pill': '9999px',
        'DEFAULT': '1rem',
        'lg': '1.5rem',
        'xl': '2rem',
        '2xl': '2rem',
        '3xl': '3rem',
      },
      boxShadow: {
        'soft-purple': '0 4px 24px rgba(110, 40, 135, 0.05)',
        'card': '0 8px 24px -4px rgba(74, 33, 96, 0.06), 0 2px 6px -1px rgba(165, 95, 198, 0.08)',
        'modal': '0 16px 36px -6px rgba(74, 33, 96, 0.12), 0 4px 12px -2px rgba(165, 95, 198, 0.1)',
      },
    },
  },
  plugins: [],
}
