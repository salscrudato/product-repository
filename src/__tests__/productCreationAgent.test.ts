/**
 * Product Creation Agent Tests
 * Tests for autonomous product creation from PDF coverage forms
 */

import {
  getAutonomousProductCreationPrompt,
  ProgressTracker,
  validateExtractionResult,
  ExtractionResult
} from '../services/productCreationAgent';

describe('Product Creation Agent Service', () => {
  describe('getAutonomousProductCreationPrompt', () => {
    it('should return a valid prompt string', () => {
      const prompt = getAutonomousProductCreationPrompt();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should include key instructions', () => {
      const prompt = getAutonomousProductCreationPrompt();
      expect(prompt).toContain('Persona');
      expect(prompt).toContain('Coverage');
      expect(prompt).toContain('JSON');
      expect(prompt).toContain('productName');
    });

    it('should include few-shot example', () => {
      const prompt = getAutonomousProductCreationPrompt();
      expect(prompt).toContain('Few-Shot Example');
      expect(prompt).toContain('Commercial Property');
    });
  });

  describe('ProgressTracker', () => {
    it('should initialize with empty steps', () => {
      const tracker = new ProgressTracker();
      expect(tracker.getProgress()).toEqual([]);
      expect(tracker.getCurrentProgress()).toBe(0);
    });

    it('should add steps and track progress', () => {
      const tracker = new ProgressTracker();
      tracker.addStep({
        step: 'upload',
        status: 'completed',
        message: 'Upload complete',
        progress: 20,
        timestamp: new Date()
      });

      expect(tracker.getProgress().length).toBe(1);
      expect(tracker.getCurrentProgress()).toBe(100); // 1 completed out of 1
    });

    it('should calculate progress correctly', () => {
      const tracker = new ProgressTracker();
      tracker.addStep({
        step: 'upload',
        status: 'completed',
        message: 'Upload complete',
        progress: 20,
        timestamp: new Date()
      });
      tracker.addStep({
        step: 'extract',
        status: 'in_progress',
        message: 'Extracting...',
        progress: 50,
        timestamp: new Date()
      });
      tracker.addStep({
        step: 'validate',
        status: 'pending',
        message: 'Pending',
        progress: 0,
        timestamp: new Date()
      });

      // 1 completed out of 3 = 33%
      expect(tracker.getCurrentProgress()).toBe(33);
    });

    it('should return last step', () => {
      const tracker = new ProgressTracker();
      const step1 = {
        step: 'upload' as const,
        status: 'completed' as const,
        message: 'Upload complete',
        progress: 20,
        timestamp: new Date()
      };
      const step2 = {
        step: 'extract' as const,
        status: 'in_progress' as const,
        message: 'Extracting...',
        progress: 50,
        timestamp: new Date()
      };

      tracker.addStep(step1);
      tracker.addStep(step2);

      const lastStep = tracker.getLastStep();
      expect(lastStep?.step).toBe('extract');
      expect(lastStep?.status).toBe('in_progress');
    });
  });

  describe('validateExtractionResult', () => {
    const validResult: ExtractionResult = {
      productName: 'Test Product',
      productDescription: 'A test product',
      coverages: [
        {
          name: 'Coverage 1',
          confidence: 90
        }
      ],
      metadata: {},
      confidence: 85,
      extractionNotes: 'Test notes'
    };

    it('should validate a correct extraction result', () => {
      const result = validateExtractionResult(validResult);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject missing product name', () => {
      const invalid = { ...validResult, productName: '' };
      const result = validateExtractionResult(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Product name is required');
    });

    it('should reject missing coverages', () => {
      const invalid = { ...validResult, coverages: [] };
      const result = validateExtractionResult(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one coverage must be extracted');
    });

    it('should reject low confidence', () => {
      const invalid = { ...validResult, confidence: 40 };
      const result = validateExtractionResult(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Extraction confidence is too low (< 50%)');
    });

    it('should reject coverage with low confidence', () => {
      const invalid = {
        ...validResult,
        coverages: [
          {
            name: 'Coverage 1',
            confidence: 20
          }
        ]
      };
      const result = validateExtractionResult(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('confidence is too low'))).toBe(true);
    });

    it('should reject coverage with missing name', () => {
      const invalid = {
        ...validResult,
        coverages: [
          {
            name: '',
            confidence: 90
          }
        ]
      };
      const result = validateExtractionResult(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('name is required'))).toBe(true);
    });
  });
});

