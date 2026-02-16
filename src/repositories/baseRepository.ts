/**
 * Base Repository
 * Typed Firestore repository with validation and converters
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentData,
  QueryDocumentSnapshot,
  FirestoreDataConverter,
  WithFieldValue,
  DocumentReference,
  CollectionReference,
  QueryConstraint,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { z } from 'zod';
import { db } from '../firebase';
import logger, { LOG_CATEGORIES } from '../utils/logger';

export interface RepositoryOptions {
  validateOnRead?: boolean;
  validateOnWrite?: boolean;
  normalizeOnRead?: boolean;
}

const defaultOptions: RepositoryOptions = {
  validateOnRead: true,
  validateOnWrite: true,
  normalizeOnRead: true,
};

/**
 * Create a Firestore converter with Zod validation
 */
export function createConverter<T extends { id: string }>(
  schema: z.ZodType<T>,
  normalizer?: (data: DocumentData) => DocumentData
): FirestoreDataConverter<T> {
  return {
    toFirestore(data: WithFieldValue<T>): DocumentData {
      const { id, ...rest } = data as T;
      return rest;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): T {
      let data = { id: snapshot.id, ...snapshot.data() };
      
      // Apply normalizer if provided
      if (normalizer) {
        data = normalizer(data) as typeof data;
      }
      
      // Parse with schema (will throw if invalid)
      try {
        return schema.parse(data);
      } catch (error) {
        logger.warn(LOG_CATEGORIES.DATA, 'Schema validation warning', {
          docId: snapshot.id,
          collection: snapshot.ref.path,
          error: error instanceof z.ZodError ? error.issues : error,
        });
        // Return data with id even if validation fails (graceful degradation)
        return data as T;
      }
    },
  };
}

/**
 * Generic base repository class
 */
export class BaseRepository<T extends { id: string }> {
  protected collectionPath: string;
  protected schema: z.ZodType<T>;
  protected converter: FirestoreDataConverter<T>;
  protected options: RepositoryOptions;

  constructor(
    collectionPath: string,
    schema: z.ZodType<T>,
    normalizer?: (data: DocumentData) => DocumentData,
    options: RepositoryOptions = {}
  ) {
    this.collectionPath = collectionPath;
    this.schema = schema;
    this.options = { ...defaultOptions, ...options };
    this.converter = createConverter(schema, normalizer);
  }

  protected getCollectionRef(): CollectionReference<T> {
    return collection(db, this.collectionPath).withConverter(this.converter);
  }

  protected getDocRef(id: string): DocumentReference<T> {
    return doc(db, this.collectionPath, id).withConverter(this.converter);
  }

  async getById(id: string): Promise<T | null> {
    try {
      const docSnap = await getDoc(this.getDocRef(id));
      return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
      logger.error(LOG_CATEGORIES.DATA, 'Repository getById error', { id }, error as Error);
      throw error;
    }
  }

  async getAll(constraints: QueryConstraint[] = []): Promise<T[]> {
    try {
      const q = query(this.getCollectionRef(), ...constraints);
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      logger.error(LOG_CATEGORIES.DATA, 'Repository getAll error', {}, error as Error);
      throw error;
    }
  }

  async create(data: Omit<T, 'id'> & { id?: string }): Promise<T> {
    try {
      if (this.options.validateOnWrite) {
        // Validate without id for creation
        const tempData = { ...data, id: data.id || 'temp' };
        this.schema.parse(tempData);
      }

      const docData = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, this.collectionPath), docData);
      return { ...data, id: docRef.id } as T;
    } catch (error) {
      logger.error(LOG_CATEGORIES.DATA, 'Repository create error', {}, error as Error);
      throw error;
    }
  }

  async update(id: string, data: Partial<T>): Promise<void> {
    try {
      const updateData = {
        ...data,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(doc(db, this.collectionPath, id), updateData);
    } catch (error) {
      logger.error(LOG_CATEGORIES.DATA, 'Repository update error', { id }, error as Error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collectionPath, id));
    } catch (error) {
      logger.error(LOG_CATEGORIES.DATA, 'Repository delete error', { id }, error as Error);
      throw error;
    }
  }
}

