import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // allow the Dockerized preview/test harness to reach the dev server by its
    // host alias (the container hits the host via host.docker.internal)
    allowedHosts: ['host.docker.internal'],
  },
})
