/**
 * Storage Utilities
 * Centralized Firebase Storage operations for forms and documents
 */

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/firebase';
import logger, { LOG_CATEGORIES } from './logger';

/**
 * Sanitize filename for safe storage
 */
function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 100);
}

/**
 * Upload a form PDF to Firebase Storage
 * 
 * @param file - File to upload
 * @param productId - Product ID for organization
 * @returns Object with filePath and downloadUrl
 */
export async function uploadFormPdf(
  file: File,
  productId?: string
): Promise<{ filePath: string; downloadUrl: string }> {
  try {
    if (!file.type.includes('pdf')) {
      throw new Error('Only PDF files are supported');
    }

    if (file.size > 50 * 1024 * 1024) {
      throw new Error('File size must not exceed 50MB');
    }

    // Create timestamped filename
    const timestamp = Date.now();
    const sanitized = sanitizeFilename(file.name);
    const filename = `${timestamp}_${sanitized}`;

    // Organize by product if provided
    const pathPrefix = productId ? `forms/${productId}` : 'forms';
    const filePath = `${pathPrefix}/${filename}`;

    logger.info(LOG_CATEGORIES.DATA, 'Uploading form PDF', {
      filename,
      size: file.size,
      productId,
    });

    // Upload to Firebase Storage
    const storageRef = ref(storage, filePath);
    await uploadBytes(storageRef, file, {
      contentType: 'application/pdf',
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        productId: productId || 'unknown',
      },
    });

    // Get download URL
    const downloadUrl = await getDownloadURL(storageRef);

    logger.info(LOG_CATEGORIES.DATA, 'Form PDF uploaded successfully', {
      filePath,
      size: file.size,
    });

    return { filePath, downloadUrl };
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, 'Failed to upload form PDF', {
      filename: file.name,
      size: file.size,
    }, error as Error);
    throw error;
  }
}

/**
 * Delete a form PDF from Firebase Storage
 * 
 * @param filePath - Path to the file in storage
 */
export async function deleteFormPdf(filePath: string): Promise<void> {
  try {
    logger.info(LOG_CATEGORIES.DATA, 'Deleting form PDF', { filePath });

    const storageRef = ref(storage, filePath);
    await deleteObject(storageRef);

    logger.info(LOG_CATEGORIES.DATA, 'Form PDF deleted successfully', { filePath });
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, 'Failed to delete form PDF', {
      filePath,
    }, error as Error);
    throw error;
  }
}

/**
 * Get download URL for a stored file
 * 
 * @param filePath - Path to the file in storage
 */
export async function getFormPdfUrl(filePath: string): Promise<string> {
  try {
    const storageRef = ref(storage, filePath);
    return await getDownloadURL(storageRef);
  } catch (error) {
    logger.error(LOG_CATEGORIES.ERROR, 'Failed to get form PDF URL', {
      filePath,
    }, error as Error);
    throw error;
  }
}

/**
 * Check if a file exists in storage
 * 
 * @param filePath - Path to the file in storage
 */
export async function formPdfExists(filePath: string): Promise<boolean> {
  try {
    const storageRef = ref(storage, filePath);
    await getDownloadURL(storageRef);
    return true;
  } catch {
    return false;
  }
}

