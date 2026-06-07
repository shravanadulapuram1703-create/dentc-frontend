import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Bundle analyzer — only when ANALYZE=true (npm run build:analyze)
    process.env.ANALYZE === 'true' &&
      visualizer({
        open: true,
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
      }),
  ].filter(Boolean),

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },

  server: {
    host: true,
    // Honor an externally-assigned PORT (e.g. preview harness) so a second
    // instance can run alongside one already bound to 5173.
    port: Number(process.env.PORT) || 5173,
    strictPort: true,
    hmr: { overlay: true },
  },

  preview: {
    port: 4173,
    host: true,
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.info', 'console.debug'],
      },
    },
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Split vendor code into cacheable chunks. Function form so we never
        // reference a package that isn't installed.
        manualChunks(id) {
          // Rollup's shared CommonJS interop helper lives in a virtual module
          // (no "node_modules" in its id). Pin it to the foundational react-vendor
          // chunk; otherwise Rollup parks it in chart-vendor and react-vendor
          // imports it back, creating a react-vendor <-> chart-vendor cycle that
          // leaves React undefined ("Cannot read properties of undefined
          // (reading 'forwardRef')").
          if (id.includes('commonjsHelpers')) return 'react-vendor';
          if (!id.includes('node_modules')) return undefined;
          // Keep React AND every React-internal shared dep together. If a shared
          // dep (scheduler, react-is, …) leaks into another vendor chunk, that
          // chunk and react-vendor end up importing each other — a circular chunk
          // dependency that makes React undefined at eval time ("Cannot read
          // properties of undefined (reading 'forwardRef')").
          if (
            /[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler|react-is|prop-types|use-sync-external-store|object-assign)[\\/]/.test(
              id
            )
          ) {
            return 'react-vendor';
          }
          if (id.includes('@radix-ui')) return 'ui-vendor';
          if (id.includes('recharts')) return 'chart-vendor';
          if (id.includes('lucide-react')) return 'icons-vendor';
          if (
            id.includes('axios') ||
            id.includes('clsx') ||
            id.includes('tailwind-merge') ||
            id.includes('class-variance-authority')
          ) {
            return 'utils-vendor';
          }
          return undefined;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name ?? '';
          const ext = name.split('.').pop() ?? '';
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return 'assets/images/[name]-[hash][extname]';
          }
          if (/woff2?|eot|ttf|otf/i.test(ext)) {
            return 'assets/fonts/[name]-[hash][extname]';
          }
          return 'assets/[ext]/[name]-[hash][extname]';
        },
      },
    },
  },

  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios', 'lucide-react'],
  },
});
