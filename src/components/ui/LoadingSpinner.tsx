// src/components/ui/LoadingSpinner.js
import React from 'react';
import styled, { keyframes } from 'styled-components';

// Spinning animation
const spin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

// Pulse animation for dots
const pulse = keyframes`
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
`;

// Spinner container
const SpinnerContainer = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

// Circular spinner
const CircularSpinner = styled.div.withConfig({
  shouldForwardProp: (prop) => !['size', 'color', 'activeColor'].includes(prop),
})`
  width: ${props => props.size || '16px'};
  height: ${props => props.size || '16px'};
  border: 2px solid ${props => props.color || '#e5e7eb'};
  border-top: 2px solid ${props => props.activeColor || '#6366f1'};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

// Dots spinner
const DotsContainer = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 2px;
`;

const Dot = styled.div.withConfig({
  shouldForwardProp: (prop) => !['color', 'delay'].includes(prop),
})`
  width: 4px;
  height: 4px;
  background-color: ${props => props.color || '#6366f1'};
  border-radius: 50%;
  animation: ${pulse} 1.4s ease-in-out infinite both;
  animation-delay: ${props => props.delay || '0s'};
`;

// Bars spinner
const BarsContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => !['size'].includes(prop),
})`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: ${props => props.size || '16px'};
`;

const Bar = styled.div.withConfig({
  shouldForwardProp: (prop) => !['color', 'delay'].includes(prop),
})`
  width: 2px;
  height: 100%;
  background-color: ${props => props.color || '#6366f1'};
  animation: ${pulse} 1.2s ease-in-out infinite;
  animation-delay: ${props => props.delay || '0s'};
`;

// Main LoadingSpinner component
const LoadingSpinner = ({ 
  type = 'circular', 
  size = '16px', 
  color = '#6366f1', 
  className = '',
  ...props 
}) => {
  const renderSpinner = () => {
    switch (type) {
      case 'dots':
        return (
          <DotsContainer>
            <Dot color={color} delay="0s" />
            <Dot color={color} delay="0.16s" />
            <Dot color={color} delay="0.32s" />
          </DotsContainer>
        );
      
      case 'bars':
        return (
          <BarsContainer size={size}>
            <Bar color={color} delay="0s" />
            <Bar color={color} delay="0.1s" />
            <Bar color={color} delay="0.2s" />
            <Bar color={color} delay="0.3s" />
          </BarsContainer>
        );
      
      case 'circular':
      default:
        return (
          <CircularSpinner 
            size={size} 
            color="#e5e7eb" 
            activeColor={color}
          />
        );
    }
  };

  return (
    <SpinnerContainer className={className} {...props}>
      {renderSpinner()}
    </SpinnerContainer>
  );
};

export default LoadingSpinner;
