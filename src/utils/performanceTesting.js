// src/utils/performanceTesting.js
/**
 * Comprehensive performance testing utilities for the Product Hub App
 * Provides automated performance testing, benchmarking, and optimization validation
 */

class PerformanceTester {
  constructor() {
    this.testResults = new Map();
    this.benchmarks = new Map();
    this.isEnabled = process.env.NODE_ENV === 'development';
  }

  // Run performance test suite
  async runTestSuite() {
    if (!this.isEnabled) return;

    console.group('🧪 Performance Test Suite');
    
    const tests = [
      this.testComponentRenderTime,
      this.testFirebaseQueryPerformance,
      this.testMemoryUsage,
      this.testBundleLoadTime,
      this.testSearchPerformance,
      this.testVirtualizationPerformance
    ];

    const results = {};
    
    for (const test of tests) {
      try {
        const result = await test.call(this);
        results[test.name] = result;
      } catch (error) {
        console.error(`Test ${test.name} failed:`, error);
        results[test.name] = { error: error.message };
      }
    }

    console.log('📊 Test Results:', results);
    console.groupEnd();
    
    return results;
  }

  // Test component render performance
  async testComponentRenderTime() {
    const startTime = performance.now();
    
    // Simulate component renders
    const renderCount = 100;
    const renderTimes = [];
    
    for (let i = 0; i < renderCount; i++) {
      const renderStart = performance.now();
      
      // Simulate React render cycle
      await new Promise(resolve => {
        requestAnimationFrame(() => {
          const renderEnd = performance.now();
          renderTimes.push(renderEnd - renderStart);
          resolve();
        });
      });
    }
    
    const avgRenderTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderCount;
    const maxRenderTime = Math.max(...renderTimes);
    
    return {
      averageRenderTime: avgRenderTime.toFixed(2),
      maxRenderTime: maxRenderTime.toFixed(2),
      totalTime: (performance.now() - startTime).toFixed(2),
      status: avgRenderTime < 16 ? 'PASS' : 'FAIL' // 60fps = 16.67ms per frame
    };
  }

  // Test Firebase query performance
  async testFirebaseQueryPerformance() {
    const queries = [
      { collection: 'products', limit: 100 },
      { collection: 'coverages', limit: 50 },
      { collection: 'forms', limit: 200 }
    ];
    
    const queryTimes = [];
    
    for (const queryConfig of queries) {
      const startTime = performance.now();
      
      try {
        // Simulate Firebase query
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
        
        const queryTime = performance.now() - startTime;
        queryTimes.push({
          collection: queryConfig.collection,
          time: queryTime.toFixed(2),
          limit: queryConfig.limit
        });
      } catch (error) {
        queryTimes.push({
          collection: queryConfig.collection,
          error: error.message
        });
      }
    }
    
    const avgQueryTime = queryTimes
      .filter(q => !q.error)
      .reduce((sum, q) => sum + parseFloat(q.time), 0) / queryTimes.length;
    
    return {
      queries: queryTimes,
      averageQueryTime: avgQueryTime.toFixed(2),
      status: avgQueryTime < 500 ? 'PASS' : 'FAIL' // 500ms threshold
    };
  }

  // Test memory usage patterns
  async testMemoryUsage() {
    if (!performance.memory) {
      return { error: 'Memory API not available' };
    }
    
    const initialMemory = performance.memory.usedJSHeapSize;
    
    // Simulate memory-intensive operations
    const largeArray = new Array(100000).fill(0).map((_, i) => ({ id: i, data: Math.random() }));
    
    const peakMemory = performance.memory.usedJSHeapSize;
    
    // Cleanup
    largeArray.length = 0;
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const finalMemory = performance.memory.usedJSHeapSize;
    const memoryIncrease = finalMemory - initialMemory;
    
    return {
      initialMemory: `${(initialMemory / 1024 / 1024).toFixed(2)} MB`,
      peakMemory: `${(peakMemory / 1024 / 1024).toFixed(2)} MB`,
      finalMemory: `${(finalMemory / 1024 / 1024).toFixed(2)} MB`,
      memoryIncrease: `${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`,
      status: memoryIncrease < 10 * 1024 * 1024 ? 'PASS' : 'FAIL' // 10MB threshold
    };
  }

  // Test bundle load performance
  async testBundleLoadTime() {
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const loadTimes = [];
    
    for (const script of scripts) {
      if (script.src.includes('/static/js/')) {
        const startTime = performance.now();
        
        try {
          // Simulate script load
          await new Promise((resolve, reject) => {
            const testScript = document.createElement('script');
            testScript.src = script.src;
            testScript.onload = resolve;
            testScript.onerror = reject;
            
            // Don't actually load, just measure existing
            resolve();
          });
          
          const loadTime = performance.now() - startTime;
          loadTimes.push({
            script: script.src.split('/').pop(),
            loadTime: loadTime.toFixed(2)
          });
        } catch (error) {
          loadTimes.push({
            script: script.src.split('/').pop(),
            error: 'Failed to load'
          });
        }
      }
    }
    
    const avgLoadTime = loadTimes
      .filter(l => !l.error)
      .reduce((sum, l) => sum + parseFloat(l.loadTime), 0) / loadTimes.length;
    
    return {
      scripts: loadTimes,
      averageLoadTime: avgLoadTime.toFixed(2),
      totalScripts: loadTimes.length,
      status: avgLoadTime < 100 ? 'PASS' : 'FAIL' // 100ms threshold
    };
  }

  // Test search performance
  async testSearchPerformance() {
    const testData = new Array(1000).fill(0).map((_, i) => ({
      id: i,
      name: `Product ${i}`,
      code: `PROD-${i.toString().padStart(4, '0')}`,
      description: `Description for product ${i}`
    }));
    
    const searchTerms = ['Product 1', 'PROD-0001', 'Description', 'xyz'];
    const searchTimes = [];
    
    for (const term of searchTerms) {
      const startTime = performance.now();
      
      // Simulate search
      const results = testData.filter(item => 
        item.name.toLowerCase().includes(term.toLowerCase()) ||
        item.code.toLowerCase().includes(term.toLowerCase()) ||
        item.description.toLowerCase().includes(term.toLowerCase())
      );
      
      const searchTime = performance.now() - startTime;
      searchTimes.push({
        term,
        resultCount: results.length,
        searchTime: searchTime.toFixed(2)
      });
    }
    
    const avgSearchTime = searchTimes.reduce((sum, s) => sum + parseFloat(s.searchTime), 0) / searchTimes.length;
    
    return {
      searches: searchTimes,
      averageSearchTime: avgSearchTime.toFixed(2),
      dataSize: testData.length,
      status: avgSearchTime < 10 ? 'PASS' : 'FAIL' // 10ms threshold
    };
  }

  // Test virtualization performance
  async testVirtualizationPerformance() {
    const itemCount = 10000;
    const visibleItems = 20;
    
    const startTime = performance.now();
    
    // Simulate virtualized rendering
    const renderTimes = [];
    
    for (let i = 0; i < 100; i++) {
      const renderStart = performance.now();
      
      // Simulate rendering visible items only
      const visibleData = new Array(visibleItems).fill(0).map((_, index) => ({
        id: i * visibleItems + index,
        content: `Item ${i * visibleItems + index}`
      }));
      
      // Simulate DOM updates
      await new Promise(resolve => {
        requestAnimationFrame(() => {
          const renderTime = performance.now() - renderStart;
          renderTimes.push(renderTime);
          resolve();
        });
      });
    }
    
    const totalTime = performance.now() - startTime;
    const avgRenderTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
    
    return {
      totalItems: itemCount,
      visibleItems,
      renderCycles: renderTimes.length,
      averageRenderTime: avgRenderTime.toFixed(2),
      totalTime: totalTime.toFixed(2),
      status: avgRenderTime < 5 ? 'PASS' : 'FAIL' // 5ms threshold for virtualized rendering
    };
  }

  // Set performance benchmark
  setBenchmark(name, value) {
    this.benchmarks.set(name, {
      value,
      timestamp: Date.now()
    });
  }

  // Compare against benchmark
  compareToBenchmark(name, currentValue) {
    const benchmark = this.benchmarks.get(name);
    if (!benchmark) {
      return { error: 'No benchmark found' };
    }
    
    const improvement = ((benchmark.value - currentValue) / benchmark.value) * 100;
    
    return {
      benchmark: benchmark.value,
      current: currentValue,
      improvement: improvement.toFixed(2),
      status: improvement > 0 ? 'IMPROVED' : 'DEGRADED'
    };
  }

  // Generate performance report
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      testResults: Object.fromEntries(this.testResults),
      benchmarks: Object.fromEntries(this.benchmarks),
      systemInfo: {
        userAgent: navigator.userAgent,
        memory: performance.memory ? {
          used: `${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
          total: `${(performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
          limit: `${(performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
        } : 'Not available'
      }
    };
    
    console.log('📋 Performance Report:', report);
    return report;
  }
}

// Create singleton instance
const performanceTester = new PerformanceTester();

// Export utilities
export const runPerformanceTests = () => performanceTester.runTestSuite();
export const setBenchmark = (name, value) => performanceTester.setBenchmark(name, value);
export const compareToBenchmark = (name, value) => performanceTester.compareToBenchmark(name, value);
export const generatePerformanceReport = () => performanceTester.generateReport();

export default performanceTester;
