/**
 * Firestore Helper Utilities
 * 
 * Utilities for working with Firestore data types, including
 * Timestamp conversion and data normalization.
 */

import { Timestamp } from 'firebase/firestore';

/**
 * Check if a value is a Firestore Timestamp
 */
export const isFirestoreTimestamp = (value: any): value is Timestamp => {
  return value && typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value;
};

/**
 * Convert Firestore Timestamp to Date object
 */
export const timestampToDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  
  if (isFirestoreTimestamp(timestamp)) {
    return timestamp.toDate();
  }
  
  if (timestamp instanceof Date) {
    return timestamp;
  }
  
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  
  return null;
};

/**
 * Convert Firestore Timestamp to formatted date string
 * 
 * @param timestamp - Firestore Timestamp or Date
 * @param format - Format string (default: 'MM/DD/YYYY')
 * @returns Formatted date string or empty string if invalid
 */
export const formatFirestoreDate = (timestamp: any, format: string = 'MM/DD/YYYY'): string => {
  const date = timestampToDate(timestamp);
  if (!date) return '';
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  switch (format) {
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'MMM DD, YYYY':
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    case 'MMMM DD, YYYY':
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    default:
      return `${month}/${day}/${year}`;
  }
};

/**
 * Normalize Firestore document data by converting all Timestamps to dates
 */
export const normalizeFirestoreData = (data: any): any => {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => normalizeFirestoreData(item));
  }
  
  if (isFirestoreTimestamp(data)) {
    return data.toDate();
  }
  
  const normalized: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (isFirestoreTimestamp(value)) {
      normalized[key] = value.toDate();
    } else if (Array.isArray(value)) {
      normalized[key] = value.map(item => normalizeFirestoreData(item));
    } else if (value && typeof value === 'object') {
      normalized[key] = normalizeFirestoreData(value);
    } else {
      normalized[key] = value;
    }
  }
  
  return normalized;
};

/**
 * Get relative time string (e.g., "2 hours ago", "3 days ago")
 */
export const getRelativeTime = (timestamp: any): string => {
  const date = timestampToDate(timestamp);
  if (!date) return '';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  }
  
  const years = Math.floor(diffDays / 365);
  return `${years} year${years > 1 ? 's' : ''} ago`;
};

/**
 * Convert date to Firestore Timestamp format
 */
export const dateToTimestamp = (date: Date | string | null): Timestamp | null => {
  if (!date) return null;
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return null;
  }
  
  return Timestamp.fromDate(dateObj);
};

