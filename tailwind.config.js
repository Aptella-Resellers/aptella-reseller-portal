/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        aptella: {
          navy: '#0e3446',
          'navy-dark': '#0b2938',
          orange: '#f0a03a',
        },
      },
    },
  },
  plugins: [],
};
