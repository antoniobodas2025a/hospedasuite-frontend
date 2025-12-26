// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Asegúrate de importar Inter en index.css
      },
      colors: {
        brand: {
          50: '#f8fafc',
          100: '#f1f5f9',
          900: '#0f172a', // Azul oscuro premium
        },
      },
    },
  },
  plugins: [],
};
