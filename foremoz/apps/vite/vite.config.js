import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const packageJsonPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  const env = loadEnv(mode, process.cwd(), '');
  const appStage = String(
    process.env.STAGE ||
    process.env.VITE_STAGE ||
    env.STAGE ||
    env.VITE_STAGE ||
    '4'
  ).trim() || '4';
  const outputDir = `dist-stg${appStage}`;
  const buildTimestamp = new Date().toISOString();
  const buildId = buildTimestamp.replace(/\D/g, '').slice(0, 14);
  const appVersion = String(packageJson.version || '0.0.0');

  return {
    plugins: [react()],
    build: {
      outDir: outputDir
    },
    define: {
      __APP_STAGE__: JSON.stringify(appStage),
      __APP_VERSION__: JSON.stringify(appVersion),
      __APP_BUILD_AT__: JSON.stringify(buildTimestamp),
      __APP_BUILD_ID__: JSON.stringify(buildId)
    }
  };
});
