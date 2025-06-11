// src/components/ui/VirtualizedGrid.js
import React, { memo, useMemo, useCallback } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import styled from 'styled-components';

const GridContainer = styled.div`
  width: 100%;
  height: ${props => props.height || '600px'};
  margin-bottom: 60px;
`;

const GridItem = styled.div`
  padding: 16px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
`;

// Memoized cell renderer to prevent unnecessary re-renders
const Cell = memo(({ columnIndex, rowIndex, style, data }) => {
  const { items, columnCount, renderItem } = data;
  const index = rowIndex * columnCount + columnIndex;
  
  if (index >= items.length) {
    return <div style={style} />;
  }

  const item = items[index];
  
  return (
    <div style={style}>
      <GridItem>
        {renderItem(item, index)}
      </GridItem>
    </div>
  );
});

Cell.displayName = 'VirtualizedGridCell';

// Main VirtualizedGrid component
const VirtualizedGrid = memo(({ 
  items = [], 
  renderItem, 
  columnCount = 2, 
  rowHeight = 350, 
  height = 600,
  overscanRowCount = 2,
  className 
}) => {
  // Calculate grid dimensions
  const rowCount = Math.ceil(items.length / columnCount);
  const columnWidth = useMemo(() => {
    // Assuming container width, adjust based on your layout
    return Math.floor(1400 / columnCount);
  }, [columnCount]);

  // Memoized item data to prevent unnecessary re-renders
  const itemData = useMemo(() => ({
    items,
    columnCount,
    renderItem
  }), [items, columnCount, renderItem]);

  // Handle empty state
  if (items.length === 0) {
    return null;
  }

  return (
    <GridContainer height={height} className={className}>
      <Grid
        columnCount={columnCount}
        columnWidth={columnWidth}
        height={height}
        rowCount={rowCount}
        rowHeight={rowHeight}
        itemData={itemData}
        overscanRowCount={overscanRowCount}
        overscanColumnCount={1}
      >
        {Cell}
      </Grid>
    </GridContainer>
  );
});

VirtualizedGrid.displayName = 'VirtualizedGrid';

export default VirtualizedGrid;
