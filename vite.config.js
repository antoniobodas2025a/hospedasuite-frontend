import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 👇👇👇 AGREGA ESTE BLOQUE AQUÍ 👇👇👇
    allowedHosts: [
      'agitatorial-bastionary-vincent.ngrok-free.dev', // Tu dirección actual
      '.ngrok-free.dev', // Comodín para futuros túneles
    ],
    host: true, // Esto ya lo debías tener o se pone así para exponer red
    // 👆👆👆 FIN DEL BLOQUE 👆👆👆
  },
});
