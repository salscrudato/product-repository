// src/services/imageOptimizationService.js
/**
 * Advanced Image Optimization Service
 * Handles lazy loading, responsive images, WebP conversion, and caching
 */

class ImageOptimizationService {
  constructor() {
    this.imageCache = new Map();
    this.loadingImages = new Set();
    this.intersectionObserver = null;
    this.resizeObserver = null;
    this.lazyImages = new Set();
    
    // Configuration
    this.config = {
      rootMargin: '50px',
      threshold: 0.1,
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1080,
      formats: ['webp', 'jpeg', 'png'],
      cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
    };
    
    // Initialize observers
    this.initializeObservers();
    
    // Check WebP support
    this.checkWebPSupport();
  }

  // Initialize intersection observer for lazy loading
  initializeObservers() {
    if ('IntersectionObserver' in window) {
      this.intersectionObserver = new IntersectionObserver(
        this.handleIntersection.bind(this),
        {
          rootMargin: this.config.rootMargin,
          threshold: this.config.threshold
        }
      );
    }
    
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(
        this.handleResize.bind(this)
      );
    }
  }

  // Check WebP support
  async checkWebPSupport() {
    try {
      const webpData = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
      const img = new Image();
      
      this.webpSupported = await new Promise((resolve) => {
        img.onload = () => resolve(img.width === 2 && img.height === 2);
        img.onerror = () => resolve(false);
        img.src = webpData;
      });
      
      console.log(`🖼️ WebP support: ${this.webpSupported ? 'Yes' : 'No'}`);
    } catch (error) {
      this.webpSupported = false;
    }
  }

  // Handle intersection observer events
  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        this.loadImage(img);
        this.intersectionObserver.unobserve(img);
        this.lazyImages.delete(img);
      }
    });
  }

  // Handle resize observer events
  handleResize(entries) {
    entries.forEach(entry => {
      const img = entry.target;
      if (img.dataset.responsive === 'true') {
        this.updateResponsiveImage(img);
      }
    });
  }

  // Add lazy loading to an image
  addLazyLoading(img, options = {}) {
    if (!img || img.dataset.lazy === 'true') return;
    
    img.dataset.lazy = 'true';
    img.dataset.originalSrc = img.src || img.dataset.src;
    
    // Set placeholder
    if (!img.src) {
      img.src = this.generatePlaceholder(
        img.dataset.width || 300,
        img.dataset.height || 200
      );
    }
    
    // Add loading class
    img.classList.add('lazy-loading');
    
    // Store options
    if (options.responsive) {
      img.dataset.responsive = 'true';
      this.resizeObserver?.observe(img);
    }
    
    // Start observing
    this.lazyImages.add(img);
    this.intersectionObserver?.observe(img);
  }

  // Load image with optimization
  async loadImage(img) {
    const originalSrc = img.dataset.originalSrc || img.src;
    if (!originalSrc || this.loadingImages.has(originalSrc)) return;
    
    this.loadingImages.add(originalSrc);
    
    try {
      // Get optimized image URL
      const optimizedSrc = await this.getOptimizedImageUrl(originalSrc, {
        width: img.dataset.width,
        height: img.dataset.height,
        quality: img.dataset.quality || this.config.quality
      });
      
      // Preload the image
      const preloadImg = new Image();
      
      await new Promise((resolve, reject) => {
        preloadImg.onload = resolve;
        preloadImg.onerror = reject;
        preloadImg.src = optimizedSrc;
      });
      
      // Update the actual image
      img.src = optimizedSrc;
      img.classList.remove('lazy-loading');
      img.classList.add('lazy-loaded');
      
      // Trigger fade-in animation
      this.animateImageLoad(img);
      
    } catch (error) {
      console.warn('Failed to load optimized image:', error);
      
      // Fallback to original
      img.src = originalSrc;
      img.classList.remove('lazy-loading');
      img.classList.add('lazy-error');
      
    } finally {
      this.loadingImages.delete(originalSrc);
    }
  }

  // Get optimized image URL
  async getOptimizedImageUrl(src, options = {}) {
    const cacheKey = `${src}_${JSON.stringify(options)}`;
    
    // Check cache first
    if (this.imageCache.has(cacheKey)) {
      const cached = this.imageCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.config.cacheTTL) {
        return cached.url;
      }
    }
    
    try {
      // For external URLs or if no optimization service available
      if (src.startsWith('http') || !this.canOptimize(src)) {
        return src;
      }
      
      // Generate optimized URL (this would integrate with your image service)
      const optimizedUrl = await this.generateOptimizedUrl(src, options);
      
      // Cache the result
      this.imageCache.set(cacheKey, {
        url: optimizedUrl,
        timestamp: Date.now()
      });
      
      return optimizedUrl;
      
    } catch (error) {
      console.warn('Image optimization failed:', error);
      return src; // Fallback to original
    }
  }

  // Check if image can be optimized
  canOptimize(src) {
    const supportedFormats = ['.jpg', '.jpeg', '.png', '.webp'];
    return supportedFormats.some(format => src.toLowerCase().includes(format));
  }

  // Generate optimized URL (placeholder implementation)
  async generateOptimizedUrl(src, options) {
    const params = new URLSearchParams();
    
    if (options.width) params.set('w', options.width);
    if (options.height) params.set('h', options.height);
    if (options.quality) params.set('q', Math.round(options.quality * 100));
    
    // Use WebP if supported
    if (this.webpSupported) {
      params.set('f', 'webp');
    }
    
    // This would integrate with your image optimization service
    // For now, return original URL with params
    return `${src}${src.includes('?') ? '&' : '?'}${params.toString()}`;
  }

  // Generate placeholder image
  generatePlaceholder(width, height, color = '#f0f0f0') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    
    // Add loading indicator
    ctx.fillStyle = '#ccc';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Loading...', width / 2, height / 2);
    
    return canvas.toDataURL();
  }

  // Animate image load
  animateImageLoad(img) {
    img.style.opacity = '0';
    img.style.transition = 'opacity 0.3s ease-in-out';
    
    requestAnimationFrame(() => {
      img.style.opacity = '1';
    });
  }

  // Update responsive image based on container size
  updateResponsiveImage(img) {
    const container = img.parentElement;
    if (!container) return;
    
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    
    // Calculate optimal dimensions
    const optimalWidth = Math.min(containerWidth * window.devicePixelRatio, this.config.maxWidth);
    const optimalHeight = Math.min(containerHeight * window.devicePixelRatio, this.config.maxHeight);
    
    // Update if significantly different
    const currentWidth = parseInt(img.dataset.width) || 0;
    const currentHeight = parseInt(img.dataset.height) || 0;
    
    if (Math.abs(optimalWidth - currentWidth) > 100 || 
        Math.abs(optimalHeight - currentHeight) > 100) {
      
      img.dataset.width = optimalWidth;
      img.dataset.height = optimalHeight;
      
      // Reload with new dimensions
      this.loadImage(img);
    }
  }

  // Preload critical images
  async preloadImages(urls, options = {}) {
    const preloadPromises = urls.map(async (url) => {
      try {
        const optimizedUrl = await this.getOptimizedImageUrl(url, options);
        
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(optimizedUrl);
          img.onerror = reject;
          img.src = optimizedUrl;
        });
      } catch (error) {
        console.warn('Failed to preload image:', url, error);
        return null;
      }
    });
    
    const results = await Promise.allSettled(preloadPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    console.log(`🖼️ Preloaded ${successful}/${urls.length} images`);
    return results;
  }

  // Convert image to WebP if supported
  async convertToWebP(imageData, quality = 0.8) {
    if (!this.webpSupported) return imageData;
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageData;
      });
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      return canvas.toDataURL('image/webp', quality);
    } catch (error) {
      console.warn('WebP conversion failed:', error);
      return imageData;
    }
  }

  // Optimize image file size
  async optimizeImageSize(file, maxSizeKB = 500) {
    if (file.size <= maxSizeKB * 1024) return file;
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      const imageData = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageData;
      });
      
      // Calculate optimal dimensions
      let { width, height } = img;
      const aspectRatio = width / height;
      
      // Reduce dimensions if needed
      while (true) {
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        const optimizedData = canvas.toDataURL('image/jpeg', 0.8);
        const optimizedSize = optimizedData.length * 0.75; // Rough size estimate
        
        if (optimizedSize <= maxSizeKB * 1024 || width < 100) {
          // Convert back to file
          const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
          return new File([blob], file.name, { type: 'image/jpeg' });
        }
        
        // Reduce dimensions by 10%
        width *= 0.9;
        height = width / aspectRatio;
      }
    } catch (error) {
      console.warn('Image optimization failed:', error);
      return file;
    }
  }

  // Initialize lazy loading for all images in a container
  initializeLazyLoading(container = document, options = {}) {
    const images = container.querySelectorAll('img[data-src], img[loading="lazy"]');
    
    images.forEach(img => {
      this.addLazyLoading(img, options);
    });
    
    console.log(`🖼️ Initialized lazy loading for ${images.length} images`);
  }

  // Get optimization statistics
  getStats() {
    return {
      cachedImages: this.imageCache.size,
      lazyImages: this.lazyImages.size,
      loadingImages: this.loadingImages.size,
      webpSupported: this.webpSupported,
      observersActive: {
        intersection: !!this.intersectionObserver,
        resize: !!this.resizeObserver
      }
    };
  }

  // Clean up resources
  cleanup() {
    this.intersectionObserver?.disconnect();
    this.resizeObserver?.disconnect();
    this.imageCache.clear();
    this.lazyImages.clear();
    this.loadingImages.clear();
  }
}

// Create singleton instance
const imageOptimizationService = new ImageOptimizationService();

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    imageOptimizationService.initializeLazyLoading();
  });
} else {
  imageOptimizationService.initializeLazyLoading();
}

export default imageOptimizationService;
