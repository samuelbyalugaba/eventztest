import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: ['es2015', 'edge88', 'firefox78', 'chrome87', 'safari14'],
      outDir: 'dist',
      cssMinify: true,
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              // Keep react + react-dom + scheduler together to avoid circular deps
              if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/scheduler/')) return 'react-core';
              if (id.includes('recharts') || id.includes('d3-')) return 'charts';
              if (id.includes('@radix-ui')) return 'radix';
              if (id.includes('@supabase')) return 'supabase';
              if (id.includes('lucide-react')) return 'icons';
              if (id.includes('agora-rtc')) return 'agora';
              if (id.includes('hls.js')) return 'hls';
            }
          },
        },
      },
    },
    server: {
      port: 3000,
      host: true,
      allowedHosts: ['localhost', '.eventz.app'],
    },
    preview: {
      port: 4173,
      host: true,
    },
  });
