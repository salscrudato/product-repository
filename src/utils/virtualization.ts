/**
 * Virtualization Utilities
 * Helpers for implementing virtualized lists with react-window
 * Improves performance for rendering large lists by only rendering visible items
 */

import React from 'react';
import { FixedSizeList as List, FixedSizeGrid as Grid, ListChildComponentProps, GridChildComponentProps } from 'react-window';

/**
 * Configuration for virtualized list
 */
export interface VirtualizedListConfig {
  itemCount: number;
  itemSize: number;
  height: number;
  width?: string | number;
  overscanCount?: number;
}

/**
 * Configuration for virtualized grid
 */
export interface VirtualizedGridConfig {
  columnCount: number;
  columnWidth: number;
  rowCount: number;
  rowHeight: number;
  height: number;
  width: number;
  overscanCount?: number;
}

/**
 * Create a virtualized list component
 * @param items - Array of items to render
 * @param renderItem - Function to render each item
 * @param config - Configuration for the list
 * @returns React component
 */
export function createVirtualizedList<T>(
  items: T[],
  renderItem: (item: T, index: number) => React.ReactNode,
  config: VirtualizedListConfig
): React.FC {
  return function VirtualizedListComponent() {
    const Row = ({ index, style }: ListChildComponentProps) => (
      <div style={style}>
        {renderItem(items[index], index)}
      </div>
    );

    return (
      <List
        height={config.height}
        itemCount={config.itemCount}
        itemSize={config.itemSize}
        width={config.width || '100%'}
        overscanCount={config.overscanCount || 5}
      >
        {Row}
      </List>
    );
  };
}

/**
 * Create a virtualized grid component
 * @param items - 2D array of items to render
 * @param renderItem - Function to render each item
 * @param config - Configuration for the grid
 * @returns React component
 */
export function createVirtualizedGrid<T>(
  items: T[][],
  renderItem: (item: T, rowIndex: number, colIndex: number) => React.ReactNode,
  config: VirtualizedGridConfig
): React.FC {
  return function VirtualizedGridComponent() {
    const Cell = ({ columnIndex, rowIndex, style }: GridChildComponentProps) => (
      <div style={style}>
        {renderItem(items[rowIndex]?.[columnIndex], rowIndex, columnIndex)}
      </div>
    );

    return (
      <Grid
        columnCount={config.columnCount}
        columnWidth={config.columnWidth}
        height={config.height}
        rowCount={config.rowCount}
        rowHeight={config.rowHeight}
        width={config.width}
        overscanCount={config.overscanCount || 5}
      >
        {Cell}
      </Grid>
    );
  };
}

/**
 * Hook to determine if virtualization should be used
 * @param itemCount - Number of items to render
 * @param threshold - Minimum items before virtualization (default: 50)
 * @returns boolean indicating if virtualization should be used
 */
export function shouldVirtualize(itemCount: number, threshold: number = 50): boolean {
  return itemCount > threshold;
}

/**
 * Calculate optimal item size based on container height and visible items
 * @param containerHeight - Height of the container in pixels
 * @param visibleItems - Number of items visible at once
 * @returns Optimal item size in pixels
 */
export function calculateOptimalItemSize(containerHeight: number, visibleItems: number = 5): number {
  return Math.floor(containerHeight / visibleItems);
}

/**
 * Memoized list item component factory
 * Creates a memoized component for list items to prevent unnecessary re-renders
 */
export function createMemoizedListItem<T>(
  Component: React.FC<{ item: T; index: number }>,
  propsAreEqual?: (prevProps: { item: T; index: number }, nextProps: { item: T; index: number }) => boolean
): React.FC<{ item: T; index: number }> {
  return React.memo(Component, propsAreEqual || ((prev, next) => {
    return prev.item === next.item && prev.index === next.index;
  }));
}

/**
 * Batch items into chunks for grid rendering
 * @param items - Array of items to batch
 * @param chunkSize - Size of each chunk
 * @returns 2D array of batched items
 */
export function batchItems<T>(items: T[], chunkSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    batches.push(items.slice(i, i + chunkSize));
  }
  return batches;
}

/**
 * Estimate scroll position for jumping to item
 * @param itemIndex - Index of item to scroll to
 * @param itemSize - Size of each item
 * @param containerHeight - Height of container
 * @returns Scroll position in pixels
 */
export function estimateScrollPosition(
  itemIndex: number,
  itemSize: number,
  containerHeight: number
): number {
  const scrollPosition = itemIndex * itemSize;
  const maxScroll = Math.max(0, (itemIndex * itemSize) - (containerHeight / 2));
  return maxScroll;
}

export default {
  createVirtualizedList,
  createVirtualizedGrid,
  shouldVirtualize,
  calculateOptimalItemSize,
  createMemoizedListItem,
  batchItems,
  estimateScrollPosition
};

