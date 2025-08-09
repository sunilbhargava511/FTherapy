import { IStorage } from './IStorage';

/**
 * Local file storage implementation for Phase 1
 * Uses API endpoints to interact with filesystem
 */
export class LocalFileStorage implements IStorage {
  private baseUrl = '/api/notebooks/storage';

  async save(key: string, data: any): Promise<void> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'save',
        key,
        data 
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to save ${key}: ${response.statusText}`);
    }
  }

  async load(key: string): Promise<any | null> {
    const response = await fetch(`${this.baseUrl}?key=${encodeURIComponent(key)}`, {
      method: 'GET'
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to load ${key}: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  async delete(key: string): Promise<void> {
    const response = await fetch(this.baseUrl, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key })
    });

    if (!response.ok) {
      throw new Error(`Failed to delete ${key}: ${response.statusText}`);
    }
  }

  async list(prefix: string): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/list?prefix=${encodeURIComponent(prefix)}`, {
      method: 'GET'
    });

    if (!response.ok) {
      throw new Error(`Failed to list keys with prefix ${prefix}: ${response.statusText}`);
    }

    const result = await response.json();
    return result.keys;
  }

  async exists(key: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/exists?key=${encodeURIComponent(key)}`, {
      method: 'GET'
    });

    if (!response.ok) {
      return false;
    }

    const result = await response.json();
    return result.exists;
  }
}