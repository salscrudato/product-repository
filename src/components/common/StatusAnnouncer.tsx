/**
 * StatusAnnouncer - Accessible live region for announcing status updates to screen readers
 * 
 * This component provides an invisible region that announces dynamic content changes
 * to assistive technologies without interrupting the current reading flow.
 * 
 * Usage:
 *   const { announce } = useStatusAnnouncer();
 *   announce('Form submitted successfully', 'polite');
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import styled from 'styled-components';

// Styled component for visually hidden but accessible content
const ScreenReaderOnly = styled.div`
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

type Politeness = 'polite' | 'assertive';

interface Announcement {
  id: number;
  message: string;
  politeness: Politeness;
}

interface StatusAnnouncerContextType {
  announce: (message: string, politeness?: Politeness) => void;
}

const StatusAnnouncerContext = createContext<StatusAnnouncerContextType | null>(null);

export const useStatusAnnouncer = (): StatusAnnouncerContextType => {
  const context = useContext(StatusAnnouncerContext);
  if (!context) {
    throw new Error('useStatusAnnouncer must be used within a StatusAnnouncerProvider');
  }
  return context;
};

interface StatusAnnouncerProviderProps {
  children: React.ReactNode;
}

export const StatusAnnouncerProvider: React.FC<StatusAnnouncerProviderProps> = ({ children }) => {
  const [politeAnnouncement, setPoliteAnnouncement] = useState<string>('');
  const [assertiveAnnouncement, setAssertiveAnnouncement] = useState<string>('');
  const politeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const assertiveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const idCounter = useRef(0);

  const announce = useCallback((message: string, politeness: Politeness = 'polite') => {
    // Increment counter to ensure new message is announced even if same text
    idCounter.current += 1;
    const uniqueMessage = message;

    if (politeness === 'assertive') {
      // Clear previous timeout
      if (assertiveTimeoutRef.current) {
        clearTimeout(assertiveTimeoutRef.current);
      }
      // Clear then set to trigger announcement
      setAssertiveAnnouncement('');
      setTimeout(() => setAssertiveAnnouncement(uniqueMessage), 50);
      // Clear after announcement
      assertiveTimeoutRef.current = setTimeout(() => setAssertiveAnnouncement(''), 1000);
    } else {
      if (politeTimeoutRef.current) {
        clearTimeout(politeTimeoutRef.current);
      }
      setPoliteAnnouncement('');
      setTimeout(() => setPoliteAnnouncement(uniqueMessage), 50);
      politeTimeoutRef.current = setTimeout(() => setPoliteAnnouncement(''), 1000);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (politeTimeoutRef.current) clearTimeout(politeTimeoutRef.current);
      if (assertiveTimeoutRef.current) clearTimeout(assertiveTimeoutRef.current);
    };
  }, []);

  return (
    <StatusAnnouncerContext.Provider value={{ announce }}>
      {children}
      
      {/* Polite announcements - waits for user to finish reading */}
      <ScreenReaderOnly
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {politeAnnouncement}
      </ScreenReaderOnly>

      {/* Assertive announcements - interrupts immediately */}
      <ScreenReaderOnly
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        {assertiveAnnouncement}
      </ScreenReaderOnly>
    </StatusAnnouncerContext.Provider>
  );
};

export default StatusAnnouncerProvider;

