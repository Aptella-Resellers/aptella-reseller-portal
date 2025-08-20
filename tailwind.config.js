/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        aptella: '#0b2b3c',
        gold: '#f5a11a',
      }
    }
  },
  plugins: []
}
