import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const appStage = String(
    env.STAGE ||
    env.VITE_STAGE ||
    process.env.STAGE ||
    process.env.VITE_STAGE ||
    '4'
  ).trim() || '4';
  const outputDir = `dist-stg${appStage}`;

  return {
    plugins: [react()],
    build: {
      outDir: outputDir
    },
    define: {
      __APP_STAGE__: JSON.stringify(appStage)
    }
  };
});
