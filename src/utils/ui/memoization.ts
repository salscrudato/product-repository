/**
 * Memoization Utilities
 * Helpers for optimizing component re-renders
 */

import React from 'react';

/**
 * Custom comparison function for React.memo
 * Compares props deeply to prevent unnecessary re-renders
 */
export function deepPropsEqual<P extends Record<string, any>>(
  prevProps: P,
  nextProps: P
): boolean {
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);

  if (prevKeys.length !== nextKeys.length) {
    return false;
  }

  for (const key of prevKeys) {
    const prevValue = prevProps[key];
    const nextValue = nextProps[key];

    // Handle functions - compare by reference
    if (typeof prevValue === 'function' && typeof nextValue === 'function') {
      if (prevValue !== nextValue) {
        return false;
      }
      continue;
    }

    // Handle objects and arrays - deep comparison
    if (typeof prevValue === 'object' && typeof nextValue === 'object') {
      if (JSON.stringify(prevValue) !== JSON.stringify(nextValue)) {
        return false;
      }
      continue;
    }

    // Handle primitives
    if (prevValue !== nextValue) {
      return false;
    }
  }

  return true;
}

/**
 * Create a memoized component with custom comparison
 */
export function createMemoComponent<P extends Record<string, any>>(
  Component: React.ComponentType<P>,
  displayName?: string
): React.MemoExoticComponent<React.ComponentType<P>> {
  const Memoized = React.memo(Component, deepPropsEqual);
  if (displayName) {
    Memoized.displayName = displayName;
  }
  return Memoized;
}

/**
 * Shallow comparison for simple props (primitives and references)
 */
export function shallowPropsEqual<P extends Record<string, any>>(
  prevProps: P,
  nextProps: P
): boolean {
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);

  if (prevKeys.length !== nextKeys.length) {
    return false;
  }

  for (const key of prevKeys) {
    if (prevProps[key] !== nextProps[key]) {
      return false;
    }
  }

  return true;
}

