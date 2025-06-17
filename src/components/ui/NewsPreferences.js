// src/components/ui/NewsPreferences.js
// News preferences component for P&C insurance focus areas

import React, { useState } from 'react';
import styled from 'styled-components';
import {
  Cog6ToothIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/solid';

// ============================================================================
// Styled Components
// ============================================================================

const PreferencesButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: white;
  color: #6b7280;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: #6366f1;
    border-color: #6366f1;
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 16px;
  padding: 24px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;

  h3 {
    font-size: 18px;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;

  &:hover {
    color: #6b7280;
    background: #f3f4f6;
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const PreferenceSection = styled.div`
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }

  h4 {
    font-size: 14px;
    font-weight: 600;
    color: #374151;
    margin: 0 0 12px 0;
  }

  p {
    font-size: 12px;
    color: #6b7280;
    margin: 0 0 16px 0;
    line-height: 1.5;
  }
`;

const RadioGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const RadioOption = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;

  &:hover {
    border-color: #6366f1;
    background: #f8fafc;
  }

  input[type="radio"] {
    margin: 0;
  }

  &.selected {
    border-color: #6366f1;
    background: #f0f9ff;
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const CheckboxOption = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;

  &:hover {
    border-color: #6366f1;
    background: #f8fafc;
  }

  input[type="checkbox"] {
    margin: 0;
  }

  &.checked {
    border-color: #6366f1;
    background: #f0f9ff;
  }
`;

const SliderContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;

  input[type="range"] {
    flex: 1;
    height: 4px;
    background: #e5e7eb;
    border-radius: 2px;
    outline: none;
    
    &::-webkit-slider-thumb {
      appearance: none;
      width: 16px;
      height: 16px;
      background: #6366f1;
      border-radius: 50%;
      cursor: pointer;
    }
  }

  span {
    font-size: 12px;
    color: #6b7280;
    min-width: 60px;
    text-align: center;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
`;

const Button = styled.button`
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;

  &.primary {
    background: #6366f1;
    color: white;
    border: 1px solid #6366f1;

    &:hover {
      background: #5856eb;
    }
  }

  &.secondary {
    background: white;
    color: #6b7280;
    border: 1px solid #d1d5db;

    &:hover {
      color: #374151;
      border-color: #9ca3af;
    }
  }

  svg {
    width: 14px;
    height: 14px;
  }
`;

// ============================================================================
// Main Component
// ============================================================================

const NewsPreferences = ({ currentPreferences, onPreferencesChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [preferences, setPreferences] = useState({
    focusArea: 'pc',
    minRelevanceScore: 3, // Higher default for ultra-strict P&C focus
    includeRegulatory: true,
    includeTechnology: true,
    maxArticles: 15,
    ...currentPreferences
  });

  const focusAreaOptions = [
    { value: 'pc', label: 'P&C (Combined)', description: 'Strictly property and casualty insurance news only' },
    { value: 'property', label: 'Property Insurance', description: 'Property coverage: homeowners, commercial property, catastrophe' },
    { value: 'casualty', label: 'Casualty Insurance', description: 'Liability coverage: workers comp, auto liability, general liability' },
    { value: 'commercial', label: 'Commercial Lines', description: 'Business P&C insurance and commercial coverage only' },
    { value: 'personal', label: 'Personal Lines', description: 'Personal P&C: auto, homeowners, umbrella coverage only' }
  ];

  const handleSave = () => {
    onPreferencesChange(preferences);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setPreferences({ ...currentPreferences });
    setIsOpen(false);
  };

  return (
    <>
      <PreferencesButton onClick={() => setIsOpen(true)}>
        <Cog6ToothIcon />
        Preferences
      </PreferencesButton>

      {isOpen && (
        <Modal onClick={(e) => e.target === e.currentTarget && handleCancel()}>
          <ModalContent>
            <ModalHeader>
              <h3>News Preferences</h3>
              <CloseButton onClick={handleCancel}>
                <XMarkIcon />
              </CloseButton>
            </ModalHeader>

            <PreferenceSection>
              <h4>Focus Area</h4>
              <p>Choose the type of P&C insurance news you're most interested in</p>
              <RadioGroup>
                {focusAreaOptions.map(option => (
                  <RadioOption
                    key={option.value}
                    className={preferences.focusArea === option.value ? 'selected' : ''}
                  >
                    <input
                      type="radio"
                      name="focusArea"
                      value={option.value}
                      checked={preferences.focusArea === option.value}
                      onChange={(e) => setPreferences(prev => ({ ...prev, focusArea: e.target.value }))}
                    />
                    <div>
                      <div style={{ fontWeight: '500' }}>{option.label}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{option.description}</div>
                    </div>
                  </RadioOption>
                ))}
              </RadioGroup>
            </PreferenceSection>

            <PreferenceSection>
              <h4>Content Types</h4>
              <p>Select additional content types to include</p>
              <CheckboxGroup>
                <CheckboxOption className={preferences.includeRegulatory ? 'checked' : ''}>
                  <input
                    type="checkbox"
                    checked={preferences.includeRegulatory}
                    onChange={(e) => setPreferences(prev => ({ ...prev, includeRegulatory: e.target.checked }))}
                  />
                  <span>Regulatory & Compliance News</span>
                </CheckboxOption>
                <CheckboxOption className={preferences.includeTechnology ? 'checked' : ''}>
                  <input
                    type="checkbox"
                    checked={preferences.includeTechnology}
                    onChange={(e) => setPreferences(prev => ({ ...prev, includeTechnology: e.target.checked }))}
                  />
                  <span>Insurance Technology & Innovation</span>
                </CheckboxOption>
              </CheckboxGroup>
            </PreferenceSection>

            <PreferenceSection>
              <h4>P&C Relevance Filter</h4>
              <p>Minimum relevance score for ultra-strict P&C insurance content only (excludes all non-P&C)</p>
              <SliderContainer>
                <span>Moderate</span>
                <input
                  type="range"
                  min="2"
                  max="5"
                  value={preferences.minRelevanceScore}
                  onChange={(e) => setPreferences(prev => ({ ...prev, minRelevanceScore: parseInt(e.target.value) }))}
                />
                <span>Ultra-Strict</span>
              </SliderContainer>
            </PreferenceSection>

            <ActionButtons>
              <Button className="secondary" onClick={handleCancel}>
                Cancel
              </Button>
              <Button className="primary" onClick={handleSave}>
                <CheckIcon />
                Save Preferences
              </Button>
            </ActionButtons>
          </ModalContent>
        </Modal>
      )}
    </>
  );
};

export default NewsPreferences;
