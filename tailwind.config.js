/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        aptella: {
          navy: '#0E3446',
          navyDark: '#0B2938',
          orange: '#F0A03A',
        },
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        card: '0 6px 20px -4px rgba(14,52,70,0.15)',
      },
    },
  },
  plugins: [],
}
