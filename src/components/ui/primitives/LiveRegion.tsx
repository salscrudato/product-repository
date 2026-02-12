/**
 * LiveRegion Component
 * Announces dynamic content changes to screen readers
 */

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

const HiddenRegion = styled.div`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

interface LiveRegionProps {
  message: string;
  politeness?: 'polite' | 'assertive';
  clearAfter?: number;
}

export const LiveRegion: React.FC<LiveRegionProps> = ({ 
  message, 
  politeness = 'polite',
  clearAfter = 5000 
}) => {
  const [announcement, setAnnouncement] = useState(message);

  useEffect(() => {
    setAnnouncement(message);
    
    if (clearAfter > 0 && message) {
      const timer = setTimeout(() => setAnnouncement(''), clearAfter);
      return () => clearTimeout(timer);
    }
  }, [message, clearAfter]);

  return (
    <HiddenRegion
      role="status"
      aria-live={politeness}
      aria-atomic="true"
    >
      {announcement}
    </HiddenRegion>
  );
};

// Hook for programmatic announcements
export function useAnnounce() {
  const [message, setMessage] = useState('');
  
  const announce = (text: string) => {
    // Clear first to ensure re-announcement of same message
    setMessage('');
    setTimeout(() => setMessage(text), 100);
  };
  
  return { message, announce };
}

