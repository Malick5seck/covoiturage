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
        gainde: {
          yellow: '#F5A623',
          dark: '#111827',
          green: '#10B981',
          red: '#EF4444',
          gray: '#F3F4F6',
        }
      }
    },
  },
  plugins: [],
}