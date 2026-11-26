/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        thyo: {
          bg: '#f5f7fb',
          surface: '#ffffff',
          border: '#e2e8f0',
          text: '#172033',
          muted: '#64748b',
          primary: '#4f46e5',
          primaryHover: '#4338ca',
          violet: '#7c3aed',
          navy: '#10152d',
          navyDeep: '#090d1d',
          navyBlue: '#172554',
          indigoDeep: '#312e81',
          blue: '#0b5ed7',
          green: '#2e7d32',
          red: '#d32f2f',
          amber: '#ffb300',
        },
        hrms: {
          primary: '#4f46e5',
          navy: '#111827',
          darkBlue: '#172554',
          darkBlueAlt: '#312e81',
          bg: '#f5f7fb',
          lightBlue: '#eef2ff',
          lightBlueAlt: '#f5f7fb',
          border: '#e2e8f0',
          secondaryText: '#64748b',
          primaryText: '#172033',
        },
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#172554',
        }
      }
    },
  },
  plugins: [],
}
