/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4f9',
          100: '#e1e9f2',
          200: '#c3d3e6',
          300: '#94b3d4',
          400: '#5e8fc0',
          500: '#3871ab',
          600: '#27578d',
          700: '#1e4471',
          800: '#1b3a5e',
          900: '#0f2238',
          950: '#0a1626',
        },
        navy: {
          800: '#141E2E',
          850: '#101927',
          900: '#0B121D',
          950: '#060B12',
        },
        surface: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
        },
        conflict: {
          red: '#DC2626',
          'red-bg': '#FEF2F2',
          'red-border': '#FECACA',
          amber: '#D97706',
          'amber-bg': '#FFFBEB',
          'amber-border': '#FDE68A',
          green: '#059669',
          'green-bg': '#ECFDF5',
          'green-border': '#A7F3D0',
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
}
