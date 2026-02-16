import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';
import { copyFileSync } from 'fs';

// Build plugins array
const plugins = [
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
];

// Add bundle analyzer in analyze mode
if (process.env.ANALYZE) {
  plugins.push(
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html',
    }) as any
  );
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins,

  // Test configuration (Vitest)
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['functions/**', 'node_modules/**'],
  },

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
      '@app-types': path.resolve(__dirname, './src/types'),
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
        manualChunks: (id: string): string | undefined => {
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
            // AI and LLM related (lazy-loaded)
            if (id.includes('openai') || id.includes('langchain') || id.includes('ai')) {
              return 'ai-vendor';
            }
          }
          return undefined;
        },
      },
    },
  },

  // Optimizations
  optimizeDeps: {
    // Force re-optimization on every dev server start to prevent stale
    // "504 Outdated Optimize Dep" errors from cached dep bundles.
    force: true,
    // Pre-bundle ALL runtime dependencies so Vite never discovers them
    // lazily at runtime (which triggers re-optimization and 504 errors
    // for already-loaded pages).
    include: [
      // Core framework
      'react',
      'react-dom',
      'react-router-dom',
      'styled-components',
      '@heroicons/react/24/solid',
      '@heroicons/react/24/outline',
      '@heroicons/react/20/solid',
      '@tanstack/react-query',
      // Firebase
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'firebase/functions',
      'firebase/storage',
      // Lazy-loaded component dependencies
      'react-simple-maps',
      'react-window',
      'react-markdown',
      'remark-gfm',
      'uuid',
      'xlsx',
      'file-saver',
      'fuse.js',
      'axios',
      'zod',
      'prop-types',
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

