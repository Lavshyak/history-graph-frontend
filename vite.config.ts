import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Regex (not a plain "@" key) so third-party scopes like @xyflow/@tanstack
    // are never rewritten; only "@/..." specifiers map to src/.
    alias: [
      {
        find: /^@\//,
        replacement: fileURLToPath(new URL('./src/', import.meta.url)),
      },
    ],
  },
  server: {
    // Bind to the IPv4 loopback explicitly.
    // Vite's default host ('localhost') resolves to ::1 first on Windows, and
    // connections to ::1 loopback are blocked while a TUN-based proxy is active
    // (e.g. Throne / Clash / sing-box): the OS rejects them with WSAEACCES.
    // As a result the dev server only listened on [::1]:5173 and was unreachable
    // from the browser. Binding to 127.0.0.1 keeps it working in both cases.
    host: '127.0.0.1',
    port: 5173,
  },
})
