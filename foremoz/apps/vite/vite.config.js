import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const appStage = String(process.env.STAGE || process.env.VITE_STAGE || '4').trim() || '4';

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_STAGE__: JSON.stringify(appStage)
  }
});
