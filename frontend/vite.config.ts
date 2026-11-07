import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Keep this toolchain's optimized modules separate from the old Vite 8 cache.
  cacheDir: 'node_modules/.vite6',
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
  },
})
