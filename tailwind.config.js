/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        app: {
          bg: '#F7F9FC',
          darkBg: '#0B1120',
          surface: '#FFFFFF',
          darkSurface: '#151E32',
          border: '#E5EAF1',
          darkBorder: '#23304B',
          text: '#172033',
          darkText: '#F1F5F9',
          secondary: '#667085',
          darkSecondary: '#94A3B8',
          muted: '#98A2B3',
          darkMuted: '#64748B',
        },
        brand: {
          blue: '#2563EB',
          softBlue: '#EFF6FF',
          darkBlue: '#1D4ED8',
          hoverBlue: '#1D4ED8',
        },
        gr: {
          DEFAULT: '#16A34A',
          bg: '#ECFDF3',
          dark: '#22C55E',
          darkBg: 'rgba(22, 163, 74, 0.15)',
        },
        gi: {
          DEFAULT: '#DC2626',
          bg: '#FEF2F2',
          dark: '#EF4444',
          darkBg: 'rgba(220, 38, 38, 0.15)',
        },
        warn: {
          DEFAULT: '#D97706',
          bg: '#FFF7E6',
          dark: '#F59E0B',
          darkBg: 'rgba(217, 119, 6, 0.15)',
        }
      },
      borderRadius: {
        'card': '16px',
        'subcard': '12px',
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(16, 24, 40, 0.06), 0 1px 2px 0 rgba(16, 24, 40, 0.04)',
        'card': '0 4px 6px -1px rgba(16, 24, 40, 0.04), 0 2px 4px -2px rgba(16, 24, 40, 0.03)',
        'modal': '0 20px 25px -5px rgba(16, 24, 40, 0.1), 0 8px 10px -6px rgba(16, 24, 40, 0.06)',
      },
      fontFamily: {
        sans: ['Inter', 'Prompt', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
