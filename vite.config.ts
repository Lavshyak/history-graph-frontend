import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
