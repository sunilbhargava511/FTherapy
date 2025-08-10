/**
 * Storage interface for abstraction across different storage backends
 * Phase 1: LocalFileStorage
 * Phase 2: VercelKVStorage
 * Phase 3: PostgresStorage
 */
export interface IStorage {
  /**
   * Save data with a key
   */
  save<T = unknown>(key: string, data: T): Promise<void>;
  
  /**
   * Load data by key
   */
  load<T = unknown>(key: string): Promise<T | null>;
  
  /**
   * Delete data by key
   */
  delete(key: string): Promise<void>;
  
  /**
   * List all keys matching a prefix
   */
  list(prefix: string): Promise<string[]>;
  
  /**
   * Check if a key exists
   */
  exists(key: string): Promise<boolean>;
  
  /**
   * Save with expiration (optional for some backends)
   */
  saveWithTTL?<T = unknown>(key: string, data: T, ttlSeconds: number): Promise<void>;
}