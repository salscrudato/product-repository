// Service Worker for Product Hub App
// Provides intelligent caching, offline support, and performance optimization

const CACHE_NAME = 'product-hub-v1.2.0';
const STATIC_CACHE = 'static-v1.2.0';
const DYNAMIC_CACHE = 'dynamic-v1.2.0';
const API_CACHE = 'api-v1.2.0';

// Resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/static/js/main.js',
  '/static/css/main.css',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Open+Sans:wght@400;700&display=swap'
];

// API endpoints to cache with different strategies
const API_PATTERNS = [
  /\/api\//,
  /firestore\.googleapis\.com/,
  /firebase\.googleapis\.com/
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - intelligent caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip invalid or malformed URLs
  if (!url.pathname || url.pathname === '/') {
    if (url.hostname === 'fonts.googleapis.com' && !url.pathname.includes('/css')) {
      // Skip invalid font URLs that don't have proper CSS paths
      return;
    }
  }

  // Handle different types of requests with appropriate strategies
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
  } else if (isAPIRequest(request)) {
    event.respondWith(networkFirstStrategy(request, API_CACHE));
  } else if (isImageRequest(request)) {
    event.respondWith(cacheFirstStrategy(request, DYNAMIC_CACHE));
  } else {
    event.respondWith(staleWhileRevalidateStrategy(request, DYNAMIC_CACHE));
  }
});

// Cache-first strategy (for static assets)
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('📋 Cache hit:', request.url);
      return cachedResponse;
    }
    
    console.log('🌐 Fetching from network:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('❌ Cache-first strategy failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

// Network-first strategy (for API calls)
async function networkFirstStrategy(request, cacheName) {
  try {
    console.log('🌐 Network-first for:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('📋 Network failed, trying cache:', request.url);
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response('Offline', { status: 503 });
  }
}

// Stale-while-revalidate strategy (for dynamic content)
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Fetch from network in background
  const networkResponsePromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => null);
  
  // Return cached version immediately if available
  if (cachedResponse) {
    console.log('📋 Serving from cache (revalidating):', request.url);
    return cachedResponse;
  }
  
  // Otherwise wait for network
  console.log('🌐 No cache, waiting for network:', request.url);
  return networkResponsePromise || new Response('Offline', { status: 503 });
}

// Helper functions
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.includes('/static/') ||
         url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.woff2') ||
         url.pathname.endsWith('.woff') ||
         isFontRequest(request);
}

function isAPIRequest(request) {
  const url = new URL(request.url);
  return API_PATTERNS.some(pattern => pattern.test(url.href));
}

function isImageRequest(request) {
  const url = new URL(request.url);
  return url.pathname.endsWith('.png') ||
         url.pathname.endsWith('.jpg') ||
         url.pathname.endsWith('.jpeg') ||
         url.pathname.endsWith('.svg') ||
         url.pathname.endsWith('.webp');
}

function isFontRequest(request) {
  const url = new URL(request.url);
  return url.hostname === 'fonts.googleapis.com' ||
         url.hostname === 'fonts.gstatic.com';
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('🔄 Background sync triggered');
    event.waitUntil(handleBackgroundSync());
  }
});

async function handleBackgroundSync() {
  // Handle any queued offline actions
  console.log('📤 Processing offline actions...');
  // Implementation would depend on specific offline requirements
}

// Push notifications (if needed)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    console.log('📬 Push notification received:', data);
    
    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/logo192.png',
        badge: '/logo192.png'
      })
    );
  }
});

console.log('🎯 Product Hub Service Worker loaded');
