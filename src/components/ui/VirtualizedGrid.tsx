// src/components/ui/VirtualizedGrid.tsx
import React, { memo, useMemo, CSSProperties, ReactNode } from 'react';
import { FixedSizeGrid as Grid, GridChildComponentProps } from 'react-window';
import styled from 'styled-components';

// Type definitions
interface GridContainerProps {
  $height: number | string;
}

interface VirtualizedGridProps<T = unknown> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  columnCount?: number;
  rowHeight?: number;
  height?: number;
  overscanRowCount?: number;
  className?: string;
}

interface CellData<T = unknown> {
  items: T[];
  columnCount: number;
  renderItem: (item: T, index: number) => ReactNode;
}

interface CellProps<T = unknown> extends GridChildComponentProps<CellData<T>> {}

const GridContainer = styled.div<GridContainerProps>`
  width: 100%;
  height: ${props => typeof props.$height === 'number' ? `${props.$height}px` : props.$height};
  margin-bottom: 60px;
`;

const GridItem = styled.div`
  padding: 16px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
`;

// Memoized cell renderer to prevent unnecessary re-renders
const Cell = memo(<T,>({ columnIndex, rowIndex, style, data }: CellProps<T>) => {
  const { items, columnCount, renderItem } = data;
  const index = rowIndex * columnCount + columnIndex;

  if (index >= items.length) {
    return <div style={style as CSSProperties} />;
  }

  const item = items[index];

  return (
    <div style={style as CSSProperties}>
      <GridItem>
        {renderItem(item, index)}
      </GridItem>
    </div>
  );
});

Cell.displayName = 'VirtualizedGridCell';

// Main VirtualizedGrid component
function VirtualizedGridComponent<T = unknown>({
  items = [] as T[],
  renderItem,
  columnCount = 2,
  rowHeight = 350,
  height = 600,
  overscanRowCount = 2,
  className
}: VirtualizedGridProps<T>): React.ReactElement | null {
  // Calculate grid dimensions
  const rowCount = Math.ceil(items.length / columnCount);
  const columnWidth = useMemo(() => {
    // Assuming container width, adjust based on your layout
    return Math.floor(1400 / columnCount);
  }, [columnCount]);

  // Memoized item data to prevent unnecessary re-renders
  const itemData = useMemo((): CellData<T> => ({
    items,
    columnCount,
    renderItem
  }), [items, columnCount, renderItem]);

  // Handle empty state
  if (items.length === 0) {
    return null;
  }

  return (
    <GridContainer $height={height} className={className}>
      <Grid<CellData<T>>
        columnCount={columnCount}
        columnWidth={columnWidth}
        height={height}
        rowCount={rowCount}
        rowHeight={rowHeight}
        itemData={itemData}
        overscanRowCount={overscanRowCount}
        overscanColumnCount={1}
        width={1400}
      >
        {Cell as React.ComponentType<GridChildComponentProps<CellData<T>>>}
      </Grid>
    </GridContainer>
  );
}

const VirtualizedGrid = memo(VirtualizedGridComponent) as typeof VirtualizedGridComponent;

export default VirtualizedGrid;
export type { VirtualizedGridProps };
