import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'
// import { networkInterfaces } from 'os'

// Note: We previously used dynamic IP detection for API connections,
// but this caused ECONNREFUSED errors as the backend typically listens on localhost only.
// If network IP detection is needed in the future, uncomment the code below:
/*
function getLocalIpAddress() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets || {})) {
    for (const net of nets[name] || []) {
      // Skip over non-IPv4 and internal addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost'; // Fallback
}
*/

// Use localhost for development by default - hardcoded for reliability
const API_HOST = 'localhost';
const API_PORT = '8000';


// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: true, // Generate source maps properly
  },
  server: {
    // Force proper CORS headers for source maps
    cors: true,
    // Enable HTTPS with certificates
    https: {
      key: fs.readFileSync(path.resolve(__dirname, './certs/key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, './certs/cert.pem')),
    },
    // Add proxy for API and WebSocket requests to handle CORS properly with HTTPS
    proxy: {
      '/api': {
        target: `https://${API_HOST}:${API_PORT}`,
        changeOrigin: true,
        secure: false, // Accept self-signed certificates
        rewrite: (path) => path
      },
      '/socket.io': {
        target: `https://${API_HOST}:${API_PORT}`,
        changeOrigin: true,
        secure: false, // Accept self-signed certificates
        ws: true, // Enable WebSocket proxy
        rewrite: (path) => path
      }
    },
  },
})
