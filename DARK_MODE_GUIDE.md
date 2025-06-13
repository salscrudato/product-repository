# Dark Mode Implementation Guide

This guide explains how to implement dark mode throughout the Product Hub application using the same styling approach as the login page.

## Overview

The dark mode system is built using:
- **Theme Context**: `DarkModeContext` for state management
- **Dynamic Theming**: `createTheme()` function that generates light/dark themes
- **Styled Components**: Theme-aware styling with automatic dark mode adaptation

## Quick Start

### 1. Using Dark Mode in Components

```jsx
import { useDarkMode } from '../contexts/DarkModeContext';

function MyComponent() {
  const { isDarkMode, toggleDarkMode } = useDarkMode();
  
  return (
    <div>
      <button onClick={toggleDarkMode}>
        {isDarkMode ? 'Light Mode' : 'Dark Mode'}
      </button>
    </div>
  );
}
```

### 2. Creating Dark Mode Styled Components

```jsx
import styled from 'styled-components';

const Card = styled.div`
  background: ${({ theme }) => theme.isDarkMode 
    ? theme.glass.background 
    : theme.colours.background
  };
  color: ${({ theme }) => theme.colours.text};
  border: 1px solid ${({ theme }) => theme.colours.border};
  transition: all 0.3s ease;
`;
```

## Theme Structure

### Light Mode Colors
- **Background**: White gradients
- **Text**: Dark grays (#111827)
- **Primary**: Blue (#4f46e5)
- **Borders**: Light grays (#e5e7eb)

### Dark Mode Colors (Space Theme)
- **Background**: Deep space gradient (dark blue to black)
- **Text**: White with transparency
- **Primary**: Purple (#8b5cf6)
- **Borders**: White with low opacity
- **Glass Effects**: Backdrop blur with transparency

## Common Patterns

### 1. Background Adaptation
```jsx
background: ${({ theme }) => theme.isDarkMode 
  ? 'rgba(255, 255, 255, 0.08)' 
  : '#ffffff'
};
```

### 2. Text Color Adaptation
```jsx
color: ${({ theme }) => theme.colours.text};
```

### 3. Border Adaptation
```jsx
border: 1px solid ${({ theme }) => theme.colours.border};
```

### 4. Glass Morphism (Dark Mode)
```jsx
background: ${({ theme }) => theme.glass.background};
backdrop-filter: ${({ theme }) => theme.glass.backdropFilter};
border: ${({ theme }) => theme.glass.border};
```

### 5. Enhanced Shadows (Dark Mode)
```jsx
box-shadow: ${({ theme }) => theme.shadow};
```

## Implementation Steps

### Step 1: Import Dark Mode Hook
```jsx
import { useDarkMode } from '../contexts/DarkModeContext';
```

### Step 2: Update Styled Components
Replace hardcoded colors with theme references:
```jsx
// Before
background: #ffffff;
color: #111827;

// After
background: ${({ theme }) => theme.colours.background};
color: ${({ theme }) => theme.colours.text};
```

### Step 3: Add Transitions
```jsx
transition: all 0.3s ease;
```

## Pre-built Components

Use these components for consistent dark mode styling:

### Card Component
```jsx
import { Card } from '../ui/Card';

<Card>
  Your content here
</Card>
```

### Input Component
```jsx
import { Input } from '../ui/Card';

<Input placeholder="Enter text..." />
```

### Button Component
The existing Button component already supports dark mode.

## Best Practices

1. **Always use theme colors** instead of hardcoded values
2. **Add smooth transitions** for mode switching
3. **Test both modes** during development
4. **Use glass morphism** for dark mode cards/modals
5. **Maintain accessibility** with proper contrast ratios

## Available Theme Properties

```jsx
theme.isDarkMode          // Boolean: true if dark mode
theme.colours.text        // Primary text color
theme.colours.background  // Main background
theme.colours.primary     // Brand color
theme.colours.border      // Border color
theme.glass.background    // Glass morphism background
theme.glass.backdropFilter // Backdrop blur
theme.shadow              // Box shadow
theme.radius              // Border radius
```

## Examples

See these files for implementation examples:
- `src/components/Login.js` - Complete dark mode implementation
- `src/components/ui/Navigation.js` - Navigation with dark mode
- `src/components/ui/Button.js` - Button with dark mode
- `src/components/ui/Card.js` - Reusable dark mode components
