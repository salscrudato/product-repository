import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';
import { copyFileSync } from 'fs';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Include .js files for JSX transformation
      include: ['**/*.jsx', '**/*.js', '**/*.tsx', '**/*.ts'],
      // Babel configuration for styled-components
      babel: {
        plugins: [
          [
            'babel-plugin-styled-components',
            {
              displayName: true,
              fileName: true,
              ssr: false,
              minify: true,
              transpileTemplateLiterals: true,
              pure: true,
            },
          ],
        ],
      },
    }),
    // Bundle analyzer (only in analyze mode)
    process.env.ANALYZE &&
      visualizer({
        open: true,
        gzipSize: true,
        brotliSize: true,
        filename: 'dist/stats.html',
      }),
    // Copy PDF.js worker file to build directory
    {
      name: 'copy-pdf-worker',
      closeBundle() {
        const workerSrc = path.resolve(__dirname, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
        const workerDest = path.resolve(__dirname, 'build/pdf.worker.min.mjs');
        try {
          copyFileSync(workerSrc, workerDest);
          console.log('✅ PDF.js worker file copied to build directory');
        } catch (error) {
          console.error('❌ Failed to copy PDF.js worker file:', error);
        }
      },
    },
  ].filter(Boolean),

  // Path resolution
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@services': path.resolve(__dirname, './src/services'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@config': path.resolve(__dirname, './src/config'),
      '@types': path.resolve(__dirname, './src/types'),
    },
  },

  // Server configuration
  server: {
    port: 3000,
    open: true,
    host: true,
    cors: true,
  },

  // Build configuration
  build: {
    outDir: 'build',
    sourcemap: 'hidden', // Generate source maps but don't reference them in production bundles
    // Increase chunk size warning limit (we have large dependencies)
    chunkSizeWarningLimit: 1000,
    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2,
      },
      mangle: true,
      format: {
        comments: false,
      },
    },
    // CSS code splitting
    cssCodeSplit: true,
    // Report compressed size
    reportCompressedSize: true,
    // Optimized: Enhanced chunk splitting for better caching and performance
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          // Vendor chunks - organized by dependency type
          if (id.includes('node_modules')) {
            // Core React ecosystem
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            // UI libraries
            if (id.includes('styled-components')) {
              return 'ui-vendor';
            }
            // Icons
            if (id.includes('@heroicons') || id.includes('react-icons')) {
              return 'icons-vendor';
            }
            // PDF processing (heavy, lazy-loaded)
            if (id.includes('pdfjs-dist')) {
              return 'pdfjs';
            }
            // Firebase (critical, separate chunk)
            if (id.includes('firebase')) {
              return 'firebase-vendor';
            }
            // Data utilities
            if (id.includes('axios') || id.includes('uuid') || id.includes('file-saver')) {
              return 'data-vendor';
            }
            // Document processing
            if (id.includes('xlsx') || id.includes('react-markdown') || id.includes('remark-gfm')) {
              return 'document-vendor';
            }
            // D3 and visualization (lazy-loaded)
            if (id.includes('d3-') || id.includes('react-simple-maps')) {
              return 'viz-vendor';
            }
          }
        },
      },
    },
  },

  // Optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'styled-components',
      '@heroicons/react',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'firebase/functions',
      'firebase/storage',
    ],
    exclude: ['pdfjs-dist'],
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
        '.ts': 'tsx',
      },
    },
  },

  // ESBuild configuration
  esbuild: {
    loader: 'tsx',
    include: /src\/.*\.[jt]sx?$/,
  },

  // Preview server (for production build preview)
  preview: {
    port: 3000,
    open: true,
  },
});

