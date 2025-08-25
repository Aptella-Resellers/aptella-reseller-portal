/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        aptella: {
          navy: '#0E3446',
          'navy-dark': '#0B2938',
          orange: '#F0A03A'
        }
      },
      fontFamily: {
        // swap to your chosen brand font if you load it in index.html
        sans: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif']
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms')
  ]
}
