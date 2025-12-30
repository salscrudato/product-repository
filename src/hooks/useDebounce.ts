/**
 * useDebounce Hook
 * 
 * Debounces a value by delaying updates until a specified time has passed
 * without changes. Useful for search inputs, form fields, etc.
 * 
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 250ms)
 * @returns The debounced value
 */

import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number = 250): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;

