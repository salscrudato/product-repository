/**
 * Response Formatter Service
 * 
 * Formats AI responses for optimal readability and user experience.
 * Handles markdown, structured data, and metadata presentation.
 */

import logger, { LOG_CATEGORIES } from '../utils/logger';

export interface ResponseMetadata {
  queryType?: string;
  confidence?: number;
  tokensUsed?: number;
  processingTime?: number;
  sources?: string[];
  timestamp?: number;
}

export interface FormattedResponse {
  content: string;
  metadata: ResponseMetadata;
  isStructured: boolean;
  sections: ResponseSection[];
}

export interface ResponseSection {
  title: string;
  content: string;
  type: 'text' | 'list' | 'table' | 'code' | 'insight';
}

class ResponseFormatter {
  /**
   * Parse response into sections
   */
  parseIntoSections(content: string): ResponseSection[] {
    const sections: ResponseSection[] = [];
    const lines = content.split('\n');
    let currentSection: ResponseSection | null = null;
    let currentContent: string[] = [];

    for (const line of lines) {
      // Detect section headers (## or ###)
      if (line.match(/^#{2,3}\s+/)) {
        if (currentSection) {
          currentSection.content = currentContent.join('\n').trim();
          sections.push(currentSection);
        }

        const title = line.replace(/^#{2,3}\s+/, '').trim();
        currentSection = {
          title,
          content: '',
          type: this.detectSectionType(title, content)
        };
        currentContent = [];
      } else if (currentSection) {
        currentContent.push(line);
      }
    }

    // Add final section
    if (currentSection) {
      currentSection.content = currentContent.join('\n').trim();
      sections.push(currentSection);
    }

    return sections.length > 0 ? sections : [
      {
        title: 'Response',
        content: content.trim(),
        type: 'text'
      }
    ];
  }

  /**
   * Detect section type from content
   */
  private detectSectionType(title: string, content: string): ResponseSection['type'] {
    const lowerTitle = title.toLowerCase();

    if (lowerTitle.includes('insight') || lowerTitle.includes('recommendation')) {
      return 'insight';
    }
    if (lowerTitle.includes('list') || lowerTitle.includes('items')) {
      return 'list';
    }
    if (lowerTitle.includes('table') || lowerTitle.includes('comparison')) {
      return 'table';
    }
    if (lowerTitle.includes('code') || lowerTitle.includes('example')) {
      return 'code';
    }

    return 'text';
  }

  /**
   * Enhance markdown formatting
   */
  enhanceMarkdown(content: string): string {
    let enhanced = content;

    // Add emphasis to key terms
    enhanced = enhanced.replace(
      /\b(important|critical|urgent|note|warning|success|error)\b/gi,
      '**$1**'
    );

    // Format lists consistently
    enhanced = enhanced.replace(/^\s*[-•]\s+/gm, '• ');

    // Format numbered lists
    enhanced = enhanced.replace(/^\s*\d+\.\s+/gm, (match) => match);

    // Add spacing around headers
    enhanced = enhanced.replace(/^(#{1,6}\s+.+)$/gm, '\n$1\n');

    return enhanced.trim();
  }

  /**
   * Extract key metrics from response
   */
  extractMetrics(content: string): Record<string, any> {
    const metrics: Record<string, any> = {};

    // Extract numbers and percentages
    const numberMatches = content.match(/(\d+(?:\.\d+)?)\s*(%|products?|coverages?|forms?|states?|tasks?)/gi);
    if (numberMatches) {
      metrics.numbers = numberMatches.slice(0, 5);
    }

    // Extract action items
    const actionMatches = content.match(/(?:recommend|suggest|should|must|need to)\s+([^.!?]+)/gi);
    if (actionMatches) {
      metrics.actions = actionMatches.slice(0, 3);
    }

    return metrics;
  }

  /**
   * Format response with metadata
   */
  formatWithMetadata(
    content: string,
    metadata: ResponseMetadata
  ): FormattedResponse {
    const enhanced = this.enhanceMarkdown(content);
    const sections = this.parseIntoSections(enhanced);
    const metrics = this.extractMetrics(content);

    logger.debug(LOG_CATEGORIES.AI, 'Response formatted', {
      sections: sections.length,
      hasMetadata: !!metadata,
      metrics: Object.keys(metrics)
    });

    return {
      content: enhanced,
      metadata: {
        ...metadata,
        timestamp: Date.now()
      },
      isStructured: sections.length > 1,
      sections
    };
  }

  /**
   * Generate summary from response
   */
  generateSummary(content: string, maxLength: number = 150): string {
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    let summary = '';

    for (const sentence of sentences) {
      if ((summary + sentence).length <= maxLength) {
        summary += sentence;
      } else {
        break;
      }
    }

    return summary.trim() || content.substring(0, maxLength) + '...';
  }

  /**
   * Format for display with proper escaping
   */
  formatForDisplay(content: string): string {
    // Escape HTML special characters
    let formatted = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Restore markdown formatting
    formatted = formatted
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>');

    return formatted;
  }

  /**
   * Calculate response quality score
   */
  calculateQualityScore(
    content: string,
    metadata: ResponseMetadata
  ): number {
    let score = 50; // Base score

    // Length bonus (200-2000 chars is ideal)
    if (content.length >= 200 && content.length <= 2000) {
      score += 15;
    }

    // Structure bonus
    if (content.includes('##') || content.includes('•')) {
      score += 15;
    }

    // Specificity bonus
    if (content.match(/\d+/)) {
      score += 10;
    }

    // Confidence bonus
    if (metadata.confidence && metadata.confidence > 0.8) {
      score += 10;
    }

    return Math.min(score, 100);
  }
}

export const responseFormatter = new ResponseFormatter();
export default responseFormatter;

