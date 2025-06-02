// Modern StepForm component with validation and accessibility
import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/solid';
import { Button } from '../ui/Button';
import Select from 'react-select';

// Styled Components
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.6);
  backdrop-filter: blur(8px);
  z-index: 1400;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const Modal = styled.div`
  background: white;
  border-radius: 20px;
  padding: 32px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  animation: scaleIn 0.3s ease-out;
  border: 1px solid rgba(226, 232, 240, 0.6);

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  letter-spacing: -0.01em;
`;

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 10px;
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 24px;
`;

const FormLabel = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
  letter-spacing: 0.025em;
`;

const FormInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid ${props => props.hasError ? '#ef4444' : 'rgba(226, 232, 240, 0.6)'};
  border-radius: 12px;
  font-size: 14px;
  transition: all 0.2s ease;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? '#ef4444' : '#6366f1'};
    box-shadow: 0 0 0 3px ${props => props.hasError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)'};
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const FormSelect = styled.select`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid ${props => props.hasError ? '#ef4444' : 'rgba(226, 232, 240, 0.6)'};
  border-radius: 12px;
  font-size: 14px;
  transition: all 0.2s ease;
  background: white;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? '#ef4444' : '#6366f1'};
    box-shadow: 0 0 0 3px ${props => props.hasError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)'};
  }
`;

const ValidationMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 12px;

  ${props => props.type === 'error' && `
    color: #ef4444;
  `}

  ${props => props.type === 'success' && `
    color: #22c55e;
  `}

  ${props => props.type === 'info' && `
    color: #6366f1;
  `}
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid rgba(226, 232, 240, 0.6);
`;

const StepTypeToggle = styled.div`
  display: flex;
  background: rgba(243, 244, 246, 0.8);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 24px;
`;

const StepTypeButton = styled.button`
  flex: 1;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  ${props => props.active ? `
    background: white;
    color: #6366f1;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  ` : `
    background: transparent;
    color: #6b7280;

    &:hover {
      color: #374151;
    }
  `}
`;

// Custom Select Styles
const selectStyles = {
  control: (provided, state) => ({
    ...provided,
    border: state.hasValue && state.selectProps.hasError
      ? '1px solid #ef4444'
      : '1px solid rgba(226, 232, 240, 0.6)',
    borderRadius: '12px',
    padding: '4px 8px',
    boxShadow: state.isFocused
      ? state.selectProps.hasError
        ? '0 0 0 3px rgba(239, 68, 68, 0.1)'
        : '0 0 0 3px rgba(99, 102, 241, 0.1)'
      : 'none',
    '&:hover': {
      borderColor: state.selectProps.hasError ? '#ef4444' : '#6366f1'
    }
  }),
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: '6px'
  }),
  multiValueLabel: (provided) => ({
    ...provided,
    color: '#6366f1',
    fontSize: '12px',
    fontWeight: '500'
  }),
  multiValueRemove: (provided) => ({
    ...provided,
    color: '#6366f1',
    '&:hover': {
      backgroundColor: 'rgba(99, 102, 241, 0.2)',
      color: '#4f46e5'
    }
  })
};

// Dimension Builder Styles
const DimensionContainer = styled.div`
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 12px;
  padding: 16px;
  background: rgba(249, 250, 251, 0.5);
`;

const DimensionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
`;

const DimensionItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: white;
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 8px;
`;

const DimensionInput = styled.input`
  flex: 1;
  padding: 8px 12px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 6px;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
  }
`;

const DimensionTypeSelect = styled.select`
  padding: 8px 12px;
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 6px;
  font-size: 14px;
  background: white;
  min-width: 100px;

  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
  }
`;

const AddDimensionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(99, 102, 241, 0.1);
  border: 1px dashed rgba(99, 102, 241, 0.3);
  border-radius: 8px;
  color: #6366f1;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.5);
  }
`;

const RemoveDimensionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
  }
`;

// Dimension Builder Component
// eslint-disable-next-line no-unused-vars
const DimensionBuilder = ({ dimensions = [], onChange }) => {
  const addDimension = () => {
    const newDimension = {
      id: Date.now().toString(),
      name: '',
      type: 'row',
      values: []
    };
    onChange([...dimensions, newDimension]);
  };

  const updateDimension = (id, field, value) => {
    const updated = dimensions.map(dim =>
      dim.id === id ? { ...dim, [field]: value } : dim
    );
    onChange(updated);
  };

  const removeDimension = (id) => {
    onChange(dimensions.filter(dim => dim.id !== id));
  };

  const updateDimensionValues = (id, valuesString) => {
    const values = valuesString.split(',').map(v => v.trim()).filter(Boolean);
    updateDimension(id, 'values', values);
  };

  return (
    <DimensionContainer>
      <DimensionList>
        {dimensions.map(dimension => (
          <DimensionItem key={dimension.id}>
            <DimensionTypeSelect
              value={dimension.type}
              onChange={(e) => updateDimension(dimension.id, 'type', e.target.value)}
            >
              <option value="row">Row</option>
              <option value="column">Column</option>
            </DimensionTypeSelect>
            <DimensionInput
              placeholder="Dimension name (e.g., Age Group)"
              value={dimension.name}
              onChange={(e) => updateDimension(dimension.id, 'name', e.target.value)}
            />
            <DimensionInput
              placeholder="Values (comma-separated: 18-25, 26-35, 36-50)"
              value={dimension.values.join(', ')}
              onChange={(e) => updateDimensionValues(dimension.id, e.target.value)}
            />
            <RemoveDimensionButton
              type="button"
              onClick={() => removeDimension(dimension.id)}
              title="Remove dimension"
            >
              <TrashIcon width={16} height={16} />
            </RemoveDimensionButton>
          </DimensionItem>
        ))}
      </DimensionList>
      <AddDimensionButton type="button" onClick={addDimension}>
        <PlusIcon width={16} height={16} />
        Add Dimension
      </AddDimensionButton>
    </DimensionContainer>
  );
};

const StepForm = ({
  isOpen,
  onClose,
  onSubmit,
  editingStep,
  coverages = [],
  dataCodes = [],
  states = []
}) => {
  const [stepData, setStepData] = useState({
    stepType: 'factor',
    stepName: '',
    coverages: [],
    value: '',
    operand: '+',
    tableName: '',
    calculation: '',
    rounding: '',
    technicalCode: '',
    states: []
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when editing
  useEffect(() => {
    if (editingStep) {
      setStepData({
        stepType: editingStep.stepType || 'factor',
        stepName: editingStep.stepName || '',
        coverages: editingStep.coverages || [],
        value: editingStep.value || '',
        operand: editingStep.operand || '+',
        tableName: editingStep.tableName || '',
        calculation: editingStep.calculation || '',
        rounding: editingStep.rounding || '',
        technicalCode: editingStep.technicalCode || '',
        states: editingStep.states || []
      });
    } else {
      setStepData({
        stepType: 'factor',
        stepName: '',
        coverages: [],
        value: '',
        operand: '+',
        tableName: '',
        calculation: '',
        rounding: '',
        technicalCode: '',
        states: []
      });
    }
    setErrors({});
  }, [editingStep, isOpen]);

  // Validation function
  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!stepData.stepName.trim()) {
      newErrors.stepName = 'Step name is required';
    }

    if (stepData.stepType === 'factor') {
      if (!stepData.value || isNaN(parseFloat(stepData.value))) {
        newErrors.value = 'Valid numeric value is required';
      }
      if (stepData.coverages.length === 0) {
        newErrors.coverages = 'At least one coverage must be selected';
      }
    }

    if (stepData.stepType === 'operand' && !stepData.operand) {
      newErrors.operand = 'Operand is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [stepData]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(stepData);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setStepData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  if (!isOpen) return null;

  // Prepare options for selects
  const coverageOptions = coverages.map(coverage => ({
    value: coverage.coverageCode,
    label: `${coverage.coverageCode} - ${coverage.coverageName}`
  }));

  const stateOptions = states.map(state => ({
    value: state,
    label: state
  }));

  const codeOptions = dataCodes.map(code => ({
    value: code,
    label: code
  }));

  return (
    <ModalOverlay onClick={(e) => e.target === e.currentTarget && onClose()}>
      <Modal>
        <ModalHeader>
          <ModalTitle>
            {editingStep ? 'Edit Step' : 'Add New Step'}
          </ModalTitle>
          <CloseButton onClick={onClose} aria-label="Close modal">
            <XMarkIcon width={20} height={20} />
          </CloseButton>
        </ModalHeader>

        <form onSubmit={handleSubmit}>
          {/* Step Type Toggle */}
          <FormGroup>
            <FormLabel>Step Type</FormLabel>
            <StepTypeToggle>
              <StepTypeButton
                type="button"
                active={stepData.stepType === 'factor'}
                onClick={() => handleInputChange('stepType', 'factor')}
              >
                Factor (×)
              </StepTypeButton>
              <StepTypeButton
                type="button"
                active={stepData.stepType === 'operand'}
                onClick={() => handleInputChange('stepType', 'operand')}
              >
                Operand (+, -, ×, ÷)
              </StepTypeButton>
            </StepTypeToggle>
          </FormGroup>

          {/* Step Name */}
          <FormGroup>
            <FormLabel htmlFor="stepName">Step Name *</FormLabel>
            <FormInput
              id="stepName"
              type="text"
              value={stepData.stepName}
              onChange={(e) => handleInputChange('stepName', e.target.value)}
              placeholder="Enter step name"
              hasError={!!errors.stepName}
              aria-describedby={errors.stepName ? 'stepName-error' : undefined}
            />
            {errors.stepName && (
              <ValidationMessage type="error" id="stepName-error">
                <ExclamationTriangleIcon width={16} height={16} />
                {errors.stepName}
              </ValidationMessage>
            )}
          </FormGroup>

          {stepData.stepType === 'factor' ? (
            <>
              {/* Coverages */}
              <FormGroup>
                <FormLabel>Coverages *</FormLabel>
                <Select
                  isMulti
                  options={coverageOptions}
                  value={coverageOptions.filter(option =>
                    stepData.coverages.includes(option.value)
                  )}
                  onChange={(selected) =>
                    handleInputChange('coverages', selected.map(s => s.value))
                  }
                  placeholder="Select coverages"
                  styles={selectStyles}
                  hasError={!!errors.coverages}
                />
                {errors.coverages && (
                  <ValidationMessage type="error">
                    <ExclamationTriangleIcon width={16} height={16} />
                    {errors.coverages}
                  </ValidationMessage>
                )}
              </FormGroup>

              {/* Value */}
              <FormGroup>
                <FormLabel htmlFor="value">Value *</FormLabel>
                <FormInput
                  id="value"
                  type="number"
                  step="0.01"
                  value={stepData.value}
                  onChange={(e) => handleInputChange('value', e.target.value)}
                  placeholder="Enter numeric value"
                  hasError={!!errors.value}
                />
                {errors.value && (
                  <ValidationMessage type="error">
                    <ExclamationTriangleIcon width={16} height={16} />
                    {errors.value}
                  </ValidationMessage>
                )}
              </FormGroup>

              {/* States */}
              <FormGroup>
                <FormLabel>States (Optional)</FormLabel>
                <Select
                  isMulti
                  options={stateOptions}
                  value={stateOptions.filter(option =>
                    stepData.states.includes(option.value)
                  )}
                  onChange={(selected) =>
                    handleInputChange('states', selected.map(s => s.value))
                  }
                  placeholder="Select states (leave empty for all states)"
                  styles={selectStyles}
                />
                <ValidationMessage type="info">
                  <InformationCircleIcon width={16} height={16} />
                  Leave empty to apply to all states
                </ValidationMessage>
              </FormGroup>

              {/* Technical Code */}
              <FormGroup>
                <FormLabel>Technical Code (Optional)</FormLabel>
                <Select
                  options={codeOptions}
                  value={codeOptions.find(option => option.value === stepData.technicalCode)}
                  onChange={(selected) =>
                    handleInputChange('technicalCode', selected?.value || '')
                  }
                  placeholder="Select technical code"
                  styles={selectStyles}
                  isClearable
                />
              </FormGroup>

              {/* Table Name */}
              <FormGroup>
                <FormLabel htmlFor="tableName">Table Name (Optional)</FormLabel>
                <FormInput
                  id="tableName"
                  type="text"
                  value={stepData.tableName}
                  onChange={(e) => handleInputChange('tableName', e.target.value)}
                  placeholder="Enter table name"
                />
              </FormGroup>
            </>
          ) : (
            /* Operand Selection */
            <FormGroup>
              <FormLabel htmlFor="operand">Operand *</FormLabel>
              <FormSelect
                id="operand"
                value={stepData.operand}
                onChange={(e) => handleInputChange('operand', e.target.value)}
                hasError={!!errors.operand}
              >
                <option value="+">+ (Addition)</option>
                <option value="-">- (Subtraction)</option>
                <option value="*">× (Multiplication)</option>
                <option value="/">÷ (Division)</option>
              </FormSelect>
              {errors.operand && (
                <ValidationMessage type="error">
                  <ExclamationTriangleIcon width={16} height={16} />
                  {errors.operand}
                </ValidationMessage>
              )}
            </FormGroup>
          )}

          <ButtonGroup>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : editingStep ? 'Update Step' : 'Add Step'}
            </Button>
          </ButtonGroup>
        </form>
      </Modal>
    </ModalOverlay>
  );
};

export default StepForm;
