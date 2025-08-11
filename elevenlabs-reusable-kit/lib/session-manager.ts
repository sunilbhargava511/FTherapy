/**
 * Generic session management utilities for ElevenLabs integration
 * Supports multiple storage backends (file, redis, memory)
 */

import { SessionData, SessionMessage } from '../types/elevenlabs';

export interface StorageAdapter {
  save<T>(key: string, data: T): Promise<void>;
  load<T>(key: string): Promise<T | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

export class FileStorageAdapter implements StorageAdapter {
  private basePath: string;

  constructor(basePath: string = './data/sessions') {
    this.basePath = basePath;
  }

  async save<T>(key: string, data: T): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const fullPath = path.join(this.basePath, `${key}.json`);
    const dir = path.dirname(fullPath);
    
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, JSON.stringify(data, null, 2));
  }

  async load<T>(key: string): Promise<T | null> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const fullPath = path.join(this.basePath, `${key}.json`);
      const data = await fs.readFile(fullPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const fullPath = path.join(this.basePath, `${key}.json`);
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const fullPath = path.join(this.basePath, `${key}.json`);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}

export class SessionManager {
  private storage: StorageAdapter;
  private sessionRegistry: Map<string, SessionData> = new Map();

  constructor(storage: StorageAdapter) {
    this.storage = storage;
  }

  async registerSession(sessionData: SessionData): Promise<void> {
    // Store in memory for quick access
    this.sessionRegistry.set(sessionData.sessionId, sessionData);
    
    // Persist to storage
    await this.storage.save(`sessions/${sessionData.sessionId}`, sessionData);
    await this.storage.save('registry_latest', sessionData);
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    // Check memory first
    if (this.sessionRegistry.has(sessionId)) {
      return this.sessionRegistry.get(sessionId)!;
    }
    
    // Fall back to storage
    const session = await this.storage.load<SessionData>(`sessions/${sessionId}`);
    if (session) {
      this.sessionRegistry.set(sessionId, session);
    }
    
    return session;
  }

  async getLatestSession(): Promise<SessionData | null> {
    return await this.storage.load<SessionData>('registry_latest');
  }

  async resolveSessionWithRetry(maxRetries: number = 3): Promise<SessionData | null> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const session = await this.getLatestSession();
        if (session) {
          return session;
        }
        
        if (attempt < maxRetries) {
          await this.delay(100 * Math.pow(2, attempt)); // Exponential backoff
        }
      } catch (error) {
        console.error(`Session resolution attempt ${attempt} failed:`, error);
        if (attempt === maxRetries) {
          throw error;
        }
      }
    }
    
    return null;
  }

  async addMessage(sessionId: string, message: SessionMessage): Promise<void> {
    const key = `messages/${sessionId}`;
    const messages = await this.storage.load<SessionMessage[]>(key) || [];
    messages.push(message);
    await this.storage.save(key, messages);
  }

  async getMessages(sessionId: string): Promise<SessionMessage[]> {
    return await this.storage.load<SessionMessage[]>(`messages/${sessionId}`) || [];
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.lastActivity = new Date().toISOString();
      await this.registerSession(session);
    }
  }

  async cleanup(olderThanMinutes: number = 60): Promise<void> {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    
    for (const [sessionId, session] of this.sessionRegistry) {
      const lastActivity = new Date(session.lastActivity || session.registeredAt);
      if (lastActivity < cutoff) {
        this.sessionRegistry.delete(sessionId);
        await this.storage.delete(`sessions/${sessionId}`);
        await this.storage.delete(`messages/${sessionId}`);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Factory function for easy setup
export function createSessionManager(storageType: 'file' | 'memory' = 'file', basePath?: string): SessionManager {
  let storage: StorageAdapter;
  
  switch (storageType) {
    case 'file':
      storage = new FileStorageAdapter(basePath);
      break;
    case 'memory':
      storage = new MemoryStorageAdapter();
      break;
    default:
      throw new Error(`Unsupported storage type: ${storageType}`);
  }
  
  return new SessionManager(storage);
}

// Simple in-memory adapter for testing
class MemoryStorageAdapter implements StorageAdapter {
  private data: Map<string, any> = new Map();

  async save<T>(key: string, data: T): Promise<void> {
    this.data.set(key, JSON.parse(JSON.stringify(data)));
  }

  async load<T>(key: string): Promise<T | null> {
    return this.data.get(key) || null;
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.data.has(key);
  }
}