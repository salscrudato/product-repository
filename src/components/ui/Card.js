import styled from 'styled-components';

// Example Card component that automatically adapts to dark mode
export const Card = styled.div`
  background: ${({ theme }) => theme.isDarkMode 
    ? theme.glass.background 
    : theme.colours.background
  };
  backdrop-filter: ${({ theme }) => theme.isDarkMode 
    ? theme.glass.backdropFilter 
    : 'none'
  };
  border: ${({ theme }) => theme.isDarkMode 
    ? theme.glass.border 
    : `1px solid ${theme.colours.border}`
  };
  border-radius: ${({ theme }) => theme.radius};
  padding: 24px;
  box-shadow: ${({ theme }) => theme.shadow};
  transition: all 0.3s ease;
  
  &:hover {
    transform: ${({ theme }) => theme.isDarkMode ? 'translateY(-2px)' : 'translateY(-1px)'};
    box-shadow: ${({ theme }) => theme.isDarkMode 
      ? '0 12px 40px rgba(0, 0, 0, 0.4), 0 0 40px rgba(139, 92, 246, 0.3)' 
      : '0 8px 25px rgba(0, 0, 0, 0.1)'
    };
  }
`;

// Example Input component that adapts to dark mode
export const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid ${({ theme }) => theme.isDarkMode 
    ? 'rgba(255, 255, 255, 0.1)' 
    : theme.colours.border
  };
  border-radius: ${({ theme }) => theme.radius};
  background: ${({ theme }) => theme.isDarkMode 
    ? 'rgba(255, 255, 255, 0.05)' 
    : theme.colours.background
  };
  color: ${({ theme }) => theme.colours.text};
  font-size: 14px;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colours.primary};
    box-shadow: ${({ theme }) => theme.isDarkMode 
      ? `0 0 0 3px rgba(139, 92, 246, 0.1), 0 0 20px rgba(139, 92, 246, 0.2)` 
      : `0 0 0 3px rgba(99, 102, 241, 0.1)`
    };
    background: ${({ theme }) => theme.isDarkMode 
      ? 'rgba(255, 255, 255, 0.08)' 
      : theme.colours.background
    };
  }
  
  &::placeholder {
    color: ${({ theme }) => theme.isDarkMode 
      ? 'rgba(255, 255, 255, 0.4)' 
      : '#9ca3af'
    };
  }
`;

// Example Text components
export const Title = styled.h1`
  color: ${({ theme }) => theme.colours.text};
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 16px;
  ${({ theme }) => theme.isDarkMode && `
    background: linear-gradient(135deg, #ffffff 0%, #e0e7ff 50%, #c7d2fe 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    text-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
  `}
`;

export const Subtitle = styled.p`
  color: ${({ theme }) => theme.isDarkMode 
    ? 'rgba(255, 255, 255, 0.7)' 
    : theme.colours.secondaryText
  };
  font-size: 1rem;
  margin-bottom: 24px;
  line-height: 1.6;
`;
