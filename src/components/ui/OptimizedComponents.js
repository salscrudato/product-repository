// src/components/ui/OptimizedComponents.js
import React, { memo, useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { debounce, throttle } from '../../utils/performance';

/**
 * High-performance memoized component wrapper
 * Prevents unnecessary re-renders with deep comparison
 */
export const MemoizedComponent = memo((Component) => {
  return memo(Component, (prevProps, nextProps) => {
    // Custom comparison logic for better performance
    const prevKeys = Object.keys(prevProps);
    const nextKeys = Object.keys(nextProps);
    
    if (prevKeys.length !== nextKeys.length) {
      return false;
    }
    
    for (const key of prevKeys) {
      if (prevProps[key] !== nextProps[key]) {
        // Special handling for objects and arrays
        if (typeof prevProps[key] === 'object' && typeof nextProps[key] === 'object') {
          if (JSON.stringify(prevProps[key]) !== JSON.stringify(nextProps[key])) {
            return false;
          }
        } else {
          return false;
        }
      }
    }
    
    return true;
  });
});

/**
 * Optimized search input with debouncing
 */
export const OptimizedSearchInput = memo(({ 
  value, 
  onChange, 
  placeholder = "Search...", 
  debounceMs = 300,
  className,
  ...props 
}) => {
  const [localValue, setLocalValue] = useState(value || '');
  const debouncedOnChange = useCallback(
    debounce((newValue) => {
      onChange?.(newValue);
    }, debounceMs),
    [onChange, debounceMs]
  );
  
  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    debouncedOnChange(newValue);
  }, [debouncedOnChange]);
  
  // Sync with external value changes
  useEffect(() => {
    setLocalValue(value || '');
  }, [value]);
  
  return (
    <input
      type="text"
      value={localValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      {...props}
    />
  );
});

/**
 * Virtualized list component for large datasets
 */
export const VirtualizedList = memo(({ 
  items = [], 
  renderItem, 
  itemHeight = 50, 
  containerHeight = 400,
  overscan = 5,
  className 
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);
  
  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(items.length, start + visibleCount + overscan * 2);
    
    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);
  
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      index: visibleRange.start + index
    }));
  }, [items, visibleRange]);
  
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;
  
  const handleScroll = useCallback(
    throttle((e) => {
      setScrollTop(e.target.scrollTop);
    }, 16), // ~60fps
    []
  );
  
  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        height: containerHeight,
        overflow: 'auto'
      }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map(({ item, index }) => (
            <div
              key={index}
              style={{
                height: itemHeight,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

/**
 * Intersection Observer hook for lazy loading
 */
export const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const targetRef = useRef(null);
  
  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    );
    
    observer.observe(target);
    
    return () => {
      observer.unobserve(target);
    };
  }, [hasIntersected, options]);
  
  return { targetRef, isIntersecting, hasIntersected };
};

/**
 * Lazy loading image component
 */
export const LazyImage = memo(({ 
  src, 
  alt, 
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNGM0Y0RjYiLz48L3N2Zz4=',
  className,
  ...props 
}) => {
  const { targetRef, hasIntersected } = useIntersectionObserver();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  
  const handleLoad = useCallback(() => {
    setLoaded(true);
  }, []);
  
  const handleError = useCallback(() => {
    setError(true);
  }, []);
  
  return (
    <div ref={targetRef} className={className}>
      {hasIntersected && !error && (
        <img
          src={loaded ? src : placeholder}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            transition: 'opacity 0.3s ease',
            opacity: loaded ? 1 : 0.7
          }}
          {...props}
        />
      )}
      {!hasIntersected && (
        <img
          src={placeholder}
          alt={alt}
          className={className}
          {...props}
        />
      )}
      {error && (
        <div 
          className={className}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f3f4f6',
            color: '#6b7280'
          }}
        >
          Failed to load image
        </div>
      )}
    </div>
  );
});

/**
 * Performance-optimized data table
 */
export const OptimizedTable = memo(({ 
  data = [], 
  columns = [], 
  pageSize = 50,
  className 
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;
    
    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);
  
  const paginatedData = useMemo(() => {
    const start = currentPage * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);
  
  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);
  
  const totalPages = Math.ceil(sortedData.length / pageSize);
  
  return (
    <div className={className}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                onClick={() => handleSort(column.key)}
                style={{
                  padding: '12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderBottom: '2px solid #e5e7eb'
                }}
              >
                {column.label}
                {sortConfig.key === column.key && (
                  <span style={{ marginLeft: '4px' }}>
                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  style={{
                    padding: '12px',
                    borderBottom: '1px solid #e5e7eb'
                  }}
                >
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      
      {totalPages > 1 && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          marginTop: '16px',
          gap: '8px'
        }}>
          <button
            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              backgroundColor: currentPage === 0 ? '#f9fafb' : '#fff',
              cursor: currentPage === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            Previous
          </button>
          
          <span style={{ padding: '0 16px' }}>
            Page {currentPage + 1} of {totalPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
            disabled={currentPage === totalPages - 1}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              backgroundColor: currentPage === totalPages - 1 ? '#f9fafb' : '#fff',
              cursor: currentPage === totalPages - 1 ? 'not-allowed' : 'pointer'
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
});

// Set display names for better debugging
OptimizedSearchInput.displayName = 'OptimizedSearchInput';
VirtualizedList.displayName = 'VirtualizedList';
LazyImage.displayName = 'LazyImage';
OptimizedTable.displayName = 'OptimizedTable';
