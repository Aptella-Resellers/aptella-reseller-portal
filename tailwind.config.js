/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'aptella-navy': '#0e3446',
        'aptella-navy-dark': '#0b2938',
        'aptella-orange': '#f0a03a'
      },
      boxShadow: {
        'aptella': '0 8px 30px rgba(14, 52, 70, 0.15)'
      },
      borderRadius: {
        'aptella': '1.25rem'
      }
    }
  },
  plugins: []
};
