/**
 * Pagination Utility
 * Handles pagination and infinite scroll for news feed
 */

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startIndex: number;
  endIndex: number;
}

export interface InfiniteScrollState {
  items: any[];
  isLoading: boolean;
  hasMore: boolean;
  cursor?: string;
  pageSize: number;
}

/**
 * Calculate pagination state
 */
export function calculatePaginationState(
  currentPage: number,
  pageSize: number,
  totalItems: number
): PaginationState {
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  return {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    startIndex,
    endIndex
  };
}

/**
 * Get paginated items
 */
export function getPaginatedItems<T>(
  items: T[],
  currentPage: number,
  pageSize: number
): T[] {
  const state = calculatePaginationState(currentPage, pageSize, items.length);
  return items.slice(state.startIndex, state.endIndex);
}

/**
 * Get next page
 */
export function getNextPage(
  currentPage: number,
  totalPages: number
): number | null {
  if (currentPage < totalPages) {
    return currentPage + 1;
  }
  return null;
}

/**
 * Get previous page
 */
export function getPreviousPage(currentPage: number): number | null {
  if (currentPage > 1) {
    return currentPage - 1;
  }
  return null;
}

/**
 * Get page range for pagination controls
 */
export function getPageRange(
  currentPage: number,
  totalPages: number,
  rangeSize: number = 5
): number[] {
  const pages: number[] = [];
  const halfRange = Math.floor(rangeSize / 2);

  let startPage = Math.max(1, currentPage - halfRange);
  let endPage = Math.min(totalPages, startPage + rangeSize - 1);

  // Adjust if we're near the end
  if (endPage - startPage + 1 < rangeSize) {
    startPage = Math.max(1, endPage - rangeSize + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return pages;
}

/**
 * Initialize infinite scroll state
 */
export function initializeInfiniteScrollState(
  pageSize: number = 20
): InfiniteScrollState {
  return {
    items: [],
    isLoading: false,
    hasMore: true,
    cursor: undefined,
    pageSize
  };
}

/**
 * Add items to infinite scroll
 */
export function addItemsToInfiniteScroll<T>(
  state: InfiniteScrollState,
  newItems: T[],
  cursor?: string,
  hasMore: boolean = true
): InfiniteScrollState {
  return {
    ...state,
    items: [...state.items, ...newItems],
    cursor,
    hasMore,
    isLoading: false
  };
}

/**
 * Reset infinite scroll
 */
export function resetInfiniteScroll(
  pageSize: number = 20
): InfiniteScrollState {
  return initializeInfiniteScrollState(pageSize);
}

/**
 * Set loading state
 */
export function setInfiniteScrollLoading(
  state: InfiniteScrollState,
  isLoading: boolean
): InfiniteScrollState {
  return {
    ...state,
    isLoading
  };
}

/**
 * Calculate if element is near bottom (for infinite scroll trigger)
 */
export function isNearBottom(
  element: HTMLElement,
  threshold: number = 200
): boolean {
  if (!element) return false;

  const { scrollTop, scrollHeight, clientHeight } = element;
  return scrollHeight - (scrollTop + clientHeight) < threshold;
}

/**
 * Get visible items for virtual scrolling
 */
export function getVisibleItems<T>(
  items: T[],
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  overscan: number = 3
): {
  visibleItems: T[];
  startIndex: number;
  endIndex: number;
  offsetY: number;
} {
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;

  return {
    visibleItems,
    startIndex,
    endIndex,
    offsetY
  };
}

/**
 * Format pagination info
 */
export function formatPaginationInfo(state: PaginationState): string {
  if (state.totalItems === 0) {
    return 'No items';
  }

  return `Showing ${state.startIndex + 1}-${state.endIndex} of ${state.totalItems}`;
}

/**
 * Create cursor for pagination
 */
export function createCursor(
  items: any[],
  pageSize: number,
  currentPage: number
): string {
  const index = (currentPage - 1) * pageSize + pageSize - 1;
  if (index >= items.length) return '';

  const lastItem = items[index];
  return btoa(JSON.stringify({
    timestamp: lastItem.pubDate || new Date().toISOString(),
    id: lastItem.guid || lastItem.link || ''
  }));
}

/**
 * Decode cursor
 */
export function decodeCursor(cursor: string): { timestamp: string; id: string } | null {
  try {
    return JSON.parse(atob(cursor));
  } catch {
    return null;
  }
}

/**
 * Get items after cursor
 */
export function getItemsAfterCursor<T extends { pubDate?: string; guid?: string; link?: string }>(
  items: T[],
  cursor: string,
  pageSize: number
): T[] {
  const cursorData = decodeCursor(cursor);
  if (!cursorData) return items.slice(0, pageSize);

  const startIndex = items.findIndex(
    item => (item.guid || item.link) === cursorData.id
  );

  if (startIndex === -1) return items.slice(0, pageSize);

  return items.slice(startIndex + 1, startIndex + 1 + pageSize);
}

/**
 * Estimate scroll position
 */
export function estimateScrollPosition(
  itemIndex: number,
  itemHeight: number
): number {
  return itemIndex * itemHeight;
}

/**
 * Calculate items per page based on viewport
 */
export function calculateItemsPerPage(
  containerHeight: number,
  itemHeight: number,
  minItems: number = 5
): number {
  return Math.max(minItems, Math.floor(containerHeight / itemHeight));
}

