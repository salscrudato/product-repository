/**
 * Product Creation Agent Modal Component
 * Autonomous workflow for creating insurance products from PDF coverage forms
 */

import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import {
  XMarkIcon,
  SparklesIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/solid';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { CreationProgress, ExtractionResult } from '../services/productCreationAgent';
import ProductCreationSpinner from './ui/ProductCreationSpinner';
import CoverageSelectionReview from './ui/CoverageSelectionReview';
import logger, { LOG_CATEGORIES } from '../utils/logger';

interface ProductCreationAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductCreated?: (productId: string) => void;
}

type ModalStep = 'upload' | 'loading' | 'review' | 'complete';

/* ========== STYLED COMPONENTS ========== */
const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  background: white;
  z-index: 10;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #1f2937;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: #6b7280;
  transition: color 0.2s;

  &:hover {
    color: #1f2937;
  }
`;

const ModalBody = styled.div`
  flex: 1;
  padding: 24px;
  overflow-y: auto;
`;

const UploadZone = styled.div<{ $isDragActive: boolean }>`
  border: 2px dashed ${({ $isDragActive }) => $isDragActive ? '#6366f1' : '#d1d5db'};
  border-radius: 8px;
  padding: 40px 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  background: ${({ $isDragActive }) => $isDragActive ? '#eef2ff' : '#f9fafb'};

  &:hover {
    border-color: #6366f1;
    background: #eef2ff;
  }
`;

const UploadIcon = styled.div`
  font-size: 48px;
  margin-bottom: 12px;
`;

const UploadText = styled.p`
  margin: 0;
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 8px;
`;

const UploadHint = styled.p`
  margin: 0;
  font-size: 12px;
  color: #9ca3af;
`;

const ProgressContainer = styled.div`
  margin-top: 24px;
`;

const ProgressStep = styled.div<{ $completed: boolean; $active: boolean; $error: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 8px;
  background: ${({ $completed, $active, $error }) => 
    $error ? '#fee2e2' : $active ? '#eef2ff' : $completed ? '#f0fdf4' : '#f9fafb'};
  border-left: 3px solid ${({ $completed, $active, $error }) => 
    $error ? '#ef4444' : $active ? '#6366f1' : $completed ? '#10b981' : '#d1d5db'};
`;

const StepIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
`;

const StepText = styled.div`
  flex: 1;
  font-size: 14px;
  color: #1f2937;
`;

const ReviewSection = styled.div`
  background: #f9fafb;
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
`;

const ReviewTitle = styled.h3`
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
`;

const ReviewItem = styled.div`
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 8px;
  padding: 8px;
  background: white;
  border-radius: 4px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  padding: 24px;
  border-top: 1px solid #e5e7eb;
  background: white;
  position: sticky;
  bottom: 0;
`;

const Button = styled.button<{ $primary?: boolean; $danger?: boolean }>`
  flex: 1;
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  ${({ $primary }) => $primary && `
    background: #6366f1;
    color: white;

    &:hover:not(:disabled) {
      background: #4f46e5;
    }
  `}

  ${({ $danger }) => $danger && `
    background: #ef4444;
    color: white;

    &:hover:not(:disabled) {
      background: #dc2626;
    }
  `}

  &:not($primary):not($danger) {
    background: white;
    color: #6b7280;
    border: 1px solid #d1d5db;

    &:hover:not(:disabled) {
      background: #f9fafb;
    }
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const HiddenFileInput = styled.input`
  display: none;
`;

/* ========== COMPONENT ========== */
const ProductCreationAgentModal: React.FC<ProductCreationAgentModalProps> = ({
  isOpen,
  onClose,
  onProductCreated
}) => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<CreationProgress[]>([]);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<ModalStep>('upload');
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);
  const [isCreatingFinalProduct, setIsCreatingFinalProduct] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    console.log('Modal state changed:', { isOpen, currentStep, file: file?.name, hasExtractionResult: !!extractionResult });
  }, [isOpen, currentStep, file, extractionResult]);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const droppedFile = files[0];
      console.log('File dropped:', droppedFile.name, droppedFile.type);
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
        setError(null);
        console.log('File set successfully');
      } else {
        setError('Please upload a PDF file');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      console.log('File selected:', selectedFile.name, selectedFile.size);
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleReviewConfirm = async (
    updatedResult: ExtractionResult,
    selectedCoverageIndices: number[]
  ) => {
    setIsCreatingFinalProduct(true);
    setError(null);
    setProgress(prev => prev.map(p =>
      p.step === 'validate' ? { ...p, status: 'completed', progress: 100 } :
      p.step === 'create_product' ? { ...p, status: 'in_progress', progress: 50 } : p
    ));

    try {
      // Call Cloud Function to finalize product creation
      const createProduct = httpsCallable(functions, 'createProductFromPDF');
      const result = await createProduct({
        extractionResult: updatedResult,
        isFinalized: true
      });

      if (result.data.success) {
        setProgress(prev => prev.map(p => ({
          ...p,
          status: 'completed',
          progress: 100
        })));

        setCreatedProductId(result.data.productId);
        setCurrentStep('complete');
        logger.info(LOG_CATEGORIES.DATA, 'Product created successfully', {
          productId: result.data.productId,
          coverageCount: updatedResult.coverages.length
        });

        // Auto-navigate after 2 seconds
        setTimeout(() => {
          navigate(`/coverage/${result.data.productId}`);
          onProductCreated?.(result.data.productId);
          onClose();
        }, 2000);
      } else {
        setError(result.data.error || 'Failed to create product');
        setProgress(prev => prev.map(p =>
          p.status === 'in_progress' ? { ...p, status: 'error', error: result.data.error } : p
        ));
        setCurrentStep('review');
      }
    } catch (err) {
      logger.error(LOG_CATEGORIES.ERROR, 'Final product creation failed', {}, err as Error);
      const errorMsg = (err as Error).message || 'An error occurred';
      setError(errorMsg);
      setProgress(prev => prev.map(p =>
        p.status === 'in_progress' ? { ...p, status: 'error', error: errorMsg } : p
      ));
      setCurrentStep('review');
    } finally {
      setIsCreatingFinalProduct(false);
    }
  };

  const handleCreateProduct = async () => {
    if (!file) {
      setError('Please select a PDF file');
      return;
    }

    console.log('Starting product creation with file:', file.name);
    setCurrentStep('loading');
    setIsProcessing(true);
    setError(null);
    setProgress([
      { step: 'upload', status: 'in_progress', message: 'Uploading PDF...', progress: 10, timestamp: new Date() },
      { step: 'extract', status: 'pending', message: 'Extracting coverage information...', progress: 0, timestamp: new Date() },
      { step: 'validate', status: 'pending', message: 'Validating extracted data...', progress: 0, timestamp: new Date() },
      { step: 'create_product', status: 'pending', message: 'Creating product...', progress: 0, timestamp: new Date() },
      { step: 'create_coverages', status: 'pending', message: 'Creating coverages...', progress: 0, timestamp: new Date() },
      { step: 'complete', status: 'pending', message: 'Finalizing...', progress: 0, timestamp: new Date() }
    ]);

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const dataUrl = e.target?.result as string;

          // Extract base64 from data URL (remove "data:application/pdf;base64," prefix)
          const base64Data = dataUrl.includes(',')
            ? dataUrl.split(',')[1]
            : dataUrl;

          console.log('File read successfully, base64 length:', base64Data.length);

          // Update progress
          setProgress(prev => prev.map(p =>
            p.step === 'upload' ? { ...p, status: 'completed', progress: 20 } :
            p.step === 'extract' ? { ...p, status: 'in_progress', progress: 30 } : p
          ));

          // Call Cloud Function to create product
          console.log('Calling Cloud Function createProductFromPDF...');
          const createProduct = httpsCallable(functions, 'createProductFromPDF');
          const result = await createProduct({
            pdfBase64: base64Data,
            fileName: file.name
          });
          console.log('Cloud Function response:', result.data);

          if (result.data.success) {
            // Update progress to extraction complete
            setProgress(prev => prev.map(p =>
              p.step === 'extract' ? { ...p, status: 'completed', progress: 100 } :
              p.step === 'validate' ? { ...p, status: 'in_progress', progress: 50 } : p
            ));

            // Transition to review step
            setExtractionResult(result.data.extractionResult);
            setCurrentStep('review');
            logger.info(LOG_CATEGORIES.DATA, 'Extraction complete, ready for review', {
              coverageCount: result.data.extractionResult.coverages.length
            });
          } else {
            setError(result.data.error || 'Failed to create product');
            setProgress(prev => prev.map(p =>
              p.status === 'in_progress' ? { ...p, status: 'error', error: result.data.error } : p
            ));
            setCurrentStep('upload');
          }
        } catch (err) {
          let errorMsg = (err as Error).message || 'An error occurred';

          // Check if it's a Cloud Function not found error
          if (errorMsg.includes('createProductFromPDF') || errorMsg.includes('not found')) {
            errorMsg = 'Cloud Function not deployed. Please deploy Cloud Functions first: firebase deploy --only functions';
          }

          console.error('Product creation error:', err);
          logger.error(LOG_CATEGORIES.ERROR, 'Product creation failed', { error: errorMsg }, err as Error);
          setError(errorMsg);
          setProgress(prev => prev.map(p =>
            p.status === 'in_progress' ? { ...p, status: 'error', error: errorMsg } : p
          ));
          setCurrentStep('upload');
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      logger.error(LOG_CATEGORIES.ERROR, 'File processing failed', {}, err as Error);
      const errorMsg = (err as Error).message || 'Failed to process file';
      setError(errorMsg);
      setProgress(prev => prev.map(p =>
        p.status === 'in_progress' ? { ...p, status: 'error', error: errorMsg } : p
      ));
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setProgress([]);
    setExtractionResult(null);
    setError(null);
    setCurrentStep('upload');
    setCreatedProductId(null);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    // Only close if clicking directly on the overlay, not on modal content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <Overlay onClick={handleOverlayClick}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            <SparklesIcon width={24} height={24} />
            Product Creation Agent
          </ModalTitle>
          <CloseButton onClick={onClose}>
            <XMarkIcon width={24} height={24} />
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          {currentStep === 'upload' && (
            <>
              <UploadZone
                $isDragActive={isDragActive}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={handleUploadClick}
              >
                <UploadIcon>
                  <DocumentArrowUpIcon width={48} height={48} style={{ color: '#6366f1' }} />
                </UploadIcon>
                <UploadText>
                  {file ? file.name : 'Drag and drop your PDF here'}
                </UploadText>
                <UploadHint>
                  or click to select a file
                </UploadHint>
              </UploadZone>

              {error && (
                <div style={{ marginTop: 16, padding: 12, background: '#fee2e2', borderRadius: 8, color: '#dc2626', fontSize: 14 }}>
                  {error}
                </div>
              )}
            </>
          )}

          {currentStep === 'loading' && (
            <ProductCreationSpinner
              progress={progress}
              isComplete={false}
              hasError={progress.some(p => p.status === 'error')}
            />
          )}

          {currentStep === 'review' && extractionResult && (
            <CoverageSelectionReview
              extractionResult={extractionResult}
              onConfirm={handleReviewConfirm}
              onCancel={() => {
                setCurrentStep('upload');
                setExtractionResult(null);
                setProgress([]);
              }}
              isLoading={isCreatingFinalProduct}
            />
          )}

          {currentStep === 'complete' && (
            <ProductCreationSpinner
              progress={progress}
              isComplete={true}
              hasError={false}
            />
          )}
        </ModalBody>

        <ButtonGroup>
          {currentStep === 'upload' && (
            <>
              <Button onClick={onClose}>Cancel</Button>
              <Button $primary disabled={!file || isProcessing} onClick={handleCreateProduct}>
                {isProcessing ? 'Processing...' : 'Create Product'}
              </Button>
            </>
          )}
          {currentStep === 'loading' && (
            <Button onClick={onClose} disabled>
              Processing...
            </Button>
          )}
          {currentStep === 'complete' && (
            <Button $primary onClick={onClose}>
              Done
            </Button>
          )}
        </ButtonGroup>
      </ModalContent>

      <HiddenFileInput
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileSelect}
      />
    </Overlay>
  );
};

export default ProductCreationAgentModal;

