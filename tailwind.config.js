/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "aptella-navy": "#0e3446",
        "aptella-orange": "#f0a03a",
      }
    },
  },
  plugins: [],
};
