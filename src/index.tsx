import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ProductProvider } from './context/ProductContext';
import env from './config/env';

// Register service worker for caching and offline support
if ('serviceWorker' in navigator && env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[OK] Service Worker registered successfully:', registration.scope);

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[INFO] New content available, please refresh');
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('[ERROR] Service Worker registration failed:', error);
      });
  });
}

// Ensure root element exists
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {/* Optimized: ProductProvider eliminates prop drilling */}
    <ProductProvider>
      <App />
    </ProductProvider>
  </React.StrictMode>
);

