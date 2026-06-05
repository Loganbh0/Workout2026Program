import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base` must match the GitHub Pages repo path: https://<user>.github.io/<repo>/
// Override via VITE_BASE if your repo name differs.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || '/Workout2026Program/',
});
