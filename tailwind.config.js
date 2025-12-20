/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // La fuente de los títulos elegantes
        serif: ['"Playfair Display"', 'serif'],
        // La fuente de los textos técnicos/legibles
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        // La variable de oro oficial del proyecto
        'leyva-gold': '#D4AF37',
      },
    },
  },
  plugins: [],
};
