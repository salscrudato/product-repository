// src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initPerformanceMonitoring } from './utils/performance';
import memoryManager from './utils/memoryManager';
import { optimizeChunkLoading } from './utils/bundleOptimization';

// Initialize performance monitoring and optimizations
initPerformanceMonitoring();
optimizeChunkLoading();

// Register service worker for caching and offline support
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('🎯 Service Worker registered successfully:', registration.scope);

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 New content available, please refresh');
              // Could show a notification to user here
            }
          });
        });
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error);
      });
  });
}

// Register memory manager cleanup
memoryManager.registerCleanup(() => {
  console.log('🧹 App-level cleanup executed');
});

// make sure you have <div id="root"></div> in your public/index.html
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);