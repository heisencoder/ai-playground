import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Use relative asset paths so the built site works at any URL or
// subpath (GitHub Pages project URL, custom domain, local preview).
export default defineConfig({
  base: './',
  plugins: [react()],
});
